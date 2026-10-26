import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const invalid = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const validCode = (v: unknown): v is string =>
  typeof v === "string" && /^[A-HJ-NP-Z2-9]{8}$/.test(v);
const validId = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const validSecret = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
const encode = (b: Uint8Array) => btoa(String.fromCharCode(...b))
  .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
async function sha256(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  if (Number(req.headers.get("Content-Length") || "0") > 2048) {
    return reply({ error: "Pedido muito grande." }, 413);
  }
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 2048) return reply({ error: "Pedido muito grande." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!invalid(parsed)) throw Error("invalid");
    body = parsed;
  } catch {
    return reply({ error: "Dados inválidos." }, 400);
  }

  // Admin key is available only inside this Edge Function, never in JS client.
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return reply({ error: "Serviço indisponível." }, 503);
  const db = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    if (body.action === "request") {
      if (!validCode(body.code) || typeof body.name !== "string") {
        return reply({ error: "Código ou nome inválido." }, 400);
      }
      const name = body.name.trim().replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 40 || /[\x00-\x1f\x7f]/.test(name)) {
        return reply({ error: "Informe um nome de 2 a 40 caracteres." }, 400);
      }
      const { data: room, error: roomError } = await db.from("draft_auto_rooms")
        .select("id,expires_at").eq("join_code", body.code)
        .eq("status", "active").gt("expires_at", new Date().toISOString()).maybeSingle();
      if (roomError) throw roomError;
      if (!room) return reply({ error: "Sala indisponível. Confira o código." }, 404);

      // Limite por sala evita crescimento ilimitado. Para disponibilização pública,
      // também exigir controle de frequência por IP na borda e observabilidade.
      const { count, error: countError } = await db.from("draft_auto_join_requests")
        .select("id", { count: "exact", head: true }).eq("room_id", room.id);
      if (countError) throw countError;
      if ((count ?? 0) >= 20) return reply({ error: "Limite de solicitações da sala atingido." }, 429);
      const { count: pendingCount, error: pendingError } = await db.from("draft_auto_join_requests")
        .select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      if (pendingError) throw pendingError;
      if ((pendingCount ?? 0) >= 6) return reply({ error: "A sala já tem muitas solicitações aguardando." }, 429);

      const raw = encode(crypto.getRandomValues(new Uint8Array(32)));
      const hash = await sha256(raw);
      const expires = new Date(Math.min(Date.now() + 12 * 60 * 60_000, Date.parse(room.expires_at))).toISOString();
      const { data: item, error } = await db.from("draft_auto_join_requests")
        .insert({ room_id: room.id, display_name: name, token_hash: hash, expires_at: expires })
        .select("id,expires_at").single();
      if (error) throw error;
      return reply({ requestId: item.id, token: raw, status: "pending", expiresAt: item.expires_at }, 201);
    }

    if (body.action === "status") {
      if (!validId(body.requestId) || !validSecret(body.token)) {
        return reply({ error: "Credencial inválida." }, 400);
      }
      const hash = await sha256(body.token);
      const { data: item, error } = await db.from("draft_auto_join_requests")
        .select("status,expires_at,room:draft_auto_rooms!inner(status,expires_at)")
        .eq("id", body.requestId).eq("token_hash", hash).maybeSingle();
      if (error) throw error;
      if (!item) return reply({ error: "Solicitação não encontrada." }, 404);
      const room = item.room as unknown as { status: string; expires_at: string };
      if (Date.parse(item.expires_at) <= Date.now() ||
          room.status !== "active" || Date.parse(room.expires_at) <= Date.now()) {
        return reply({ status: "expired" });
      }
      return reply({ status: item.status });
    }

    if (body.action === "catalog" || body.action === "send-event") {
      if (!validId(body.requestId) || !validSecret(body.token)) {
        return reply({ error: "Credencial inválida." }, 401);
      }
      const hash = await sha256(body.token);
      const { data: participant, error: authErr } = await db.from("draft_auto_join_requests")
        .select("room_id,status,expires_at,room:draft_auto_rooms!inner(status,expires_at)")
        .eq("id", body.requestId).eq("token_hash", hash).maybeSingle();
      if (authErr) throw authErr;
      const room = participant?.room as unknown as {status:string;expires_at:string} | undefined;
      if (!participant || participant.status !== "approved" ||
          Date.parse(participant.expires_at) <= Date.now() ||
          !room || room.status !== "active" || Date.parse(room.expires_at) <= Date.now()) {
        return reply({ error: "Participação não aprovada, sala encerrada ou credencial expirada." }, 403);
      }

      if (body.action === "catalog") {
        // Only the approved guest can read the global names/IDs needed for a manual test event.
        // Do not include team tiers, comfort picks, player tags or private statistics.
        const [maps, brawlers] = await Promise.all([
          db.from("maps").select("id,name,mode").order("name").limit(300),
          db.from("brawlers").select("id,name").order("name").limit(300),
        ]);
        if (maps.error || brawlers.error) throw maps.error || brawlers.error;
        return reply({ maps: maps.data || [], brawlers: brawlers.data || [] });
      }

      if (!validId(body.eventId) || !["map", "first-pick", "ban", "pick"].includes(String(body.kind))) {
        return reply({ error: "Evento inválido." }, 400);
      }
      const kind = body.kind as string;
      const record: Record<string, unknown> = {
        room_id: participant.room_id,
        request_id: body.requestId,
        client_event_id: body.eventId,
        kind,
      };
      if (kind === "map") {
        if (typeof body.mapId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.mapId))
          return reply({error:"Mapa inválido."},400);
        record.map_id = body.mapId;
      } else if (kind === "first-pick") {
        if (typeof body.allyStarts !== "boolean") return reply({error:"Ordem inválida."},400);
        record.ally_starts = body.allyStarts;
      } else {
        const maxSlot = kind === "ban" ? 2 : 5;
        if ((body.team !== "ally" && body.team !== "enemy") ||
            !Number.isInteger(body.slot) || Number(body.slot) < 0 || Number(body.slot) > maxSlot ||
            typeof body.brawlerId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.brawlerId)) {
          return reply({error:"Pick ou ban inválido."},400);
        }
        record.team = body.team;
        record.slot = body.slot;
        record.brawler_id = body.brawlerId;
      }

      // An approved guest may send manual observations, never "screen" or "provider"
      // confidence. No automated recommendation is changed without coach review.
      const { count, error: countError } = await db.from("draft_auto_events")
        .select("id", {count:"exact",head:true}).eq("request_id",body.requestId);
      if (countError) throw countError;
      if ((count ?? 0) >= 40) return reply({error:"Limite de eventos desta conexão atingido."},429);
      const { data, error } = await db.from("draft_auto_events")
        .insert(record).select("id").single();
      if (error?.code === "23505") return reply({accepted:true,duplicate:true});
      if (error?.code === "23503" || error?.code === "23514")
        return reply({error:"Mapa ou brawler inexistente, ou combinação inválida."},400);
      if (error) throw error;
      return reply({accepted:true,id:data.id},201);
    }

    return reply({ error: "Operação inválida." }, 400);
  } catch (error) {
    console.error("draft-auto-join:", error instanceof Error ? error.message : "unknown error");
    return reply({ error: "Não foi possível processar a solicitação." }, 500);
  }
});
