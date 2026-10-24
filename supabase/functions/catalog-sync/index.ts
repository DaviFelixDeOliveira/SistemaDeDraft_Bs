import { createClient } from 'npm:@supabase/supabase-js@2.76.1';

const SOURCE = 'https://api.brawlapi.com/v1';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

type ExternalBrawler = {
  id: number; name: string; released?: boolean;
  imageUrl?: string; imageUrl2?: string; imageUrl3?: string;
  rarity?: { name: string };
  class?: { name: string };
};
type ExternalMap = {
  id: number; name: string; disabled?: boolean; imageUrl?: string;
  gameMode?: { name: string };
};
const safeName = (v: unknown, max = 100) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const safeAsset = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' &&
      (url.hostname === 'cdn.brawlify.com' || url.hostname === 'cdn-misc.brawlify.com')
      ? url.toString() : null;
  } catch { return null; }
};
const slugify = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75);
const nameKey = (name: string) => slugify(name).replace(/-/g, '');
const rarityPt: Record<string,string> = {
  rare: 'Raro', 'super rare': 'Super-Raro', epic: 'Épico',
  mythic: 'Mítico', legendary: 'Lendário', 'ultra legendary': 'Ultra Lendário',
};
const classPt: Record<string,string> = {
  'damage dealer': 'Dano', 'controller': 'Controle',
  'assassin': 'Algoz', 'marksman': 'Tiro preciso',
  'tank': 'Tanque', 'support': 'Suporte', 'artillery': 'Artilharia',
};
const modePt: Record<string,string> = {
  'gem grab': 'Pique-Gema', 'brawl ball': 'Fute-Brawl',
  'bounty': 'Caça-Estrelas', 'heist': 'Roubo',
  'hot zone': 'Zona Estratégica', 'knockout': 'Nocaute',
};
const brawlerIdFromUrl = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const match = v.match(/(?:\b|\/)(160\d{5})\.png(?:\?|$)/);
  return match ? match[1] : null;
};

async function getBrawlData(path: string): Promise<any> {
  const response = await fetch(SOURCE + path, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('A API BrawlAPI não respondeu (HTTP ' + response.status + ').');
  return await response.json();
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Faça login na equipe.' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Catálogo não configurado no servidor.' }, 500);
  const database = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: verifyError } = await database.auth.getUser(token);
  if (verifyError || !verified.user) return json({ error: 'Sessão inválida.' }, 401);

  let body: { action?: string; mapId?: number; displayName?: string; terrain?: string };
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  try {
    if (body.action === 'sync-brawlers') {
      const { data: state, error: stateError } = await database.from('catalog_sync_state')
        .select('*').eq('source', 'brawlapi-brawlers').maybeSingle();
      if (stateError) throw stateError;
      const since = state?.last_sync_at ? Date.now() - new Date(state.last_sync_at).getTime() : Infinity;
      if (since >= 0 && since < 12 * 60 * 60 * 1000) {
        return json({ ok: true, skipped: true, sourceCount: state.source_count, created: 0, updated: 0, lastSync: state.last_sync_at });
      }

      const payload = await getBrawlData('/brawlers');
      const list = payload?.list;
      if (!Array.isArray(list) || list.length < 90 || list.length > 250) {
        return json({ error: 'Dados de brawlers inesperados; o catálogo antigo foi preservado.' }, 502);
      }
      const { data: existing, error: selectError } = await database.from('brawlers')
        .select('id,name,image_url,icon_url,rarity,type');
      if (selectError) throw selectError;
      const rows = existing || [];
      const storedById = new Map(rows.map(row => [row.id,row]));
      const metadataUpdates: {id:string;rarity:string;type:string[]}[] = [];
      const byGameId = new Map<string, string>();
      const byName = new Map<string, string>();
      const usedIds = new Set<string>();
      for (const row of rows) {
        usedIds.add(row.id);
        byName.set(nameKey(row.name), row.id);
        const extracted = brawlerIdFromUrl(row.image_url) || brawlerIdFromUrl(row.icon_url);
        if (extracted) byGameId.set(extracted, row.id);
      }
      const candidates = [];
      for (const record of list as ExternalBrawler[]) {
        if (!Number.isInteger(record?.id) || record.id < 16000000 ||
            record.released === false || !safeName(record.name)) continue;
        const name = safeName(record.name);
        const key = nameKey(name);
        const officialRarity = rarityPt[safeName(record.rarity?.name).toLowerCase()];
        const officialClass = classPt[safeName(record.class?.name).toLowerCase()];
        const registeredId = byGameId.get(String(record.id)) || byName.get(key);
        if (registeredId) {
          const stored = storedById.get(registeredId);
          if (stored && officialRarity && officialClass &&
              (stored.rarity !== officialRarity || stored.type?.[0] !== officialClass)) {
            metadataUpdates.push({id:registeredId,rarity:officialRarity,type:[officialClass]});
          }
          continue;
        }
        const slug = slugify(name) || 'brawler-' + record.id;
        const id = usedIds.has(slug) ? 'brawler-' + record.id : slug;
        if (usedIds.has(id)) continue;
        const border = safeAsset(record.imageUrl);
        const portrait = safeAsset(record.imageUrl2) || border;
        if (!portrait || !border) continue;
        const rarity = safeName(record.rarity?.name).toLowerCase();
        const klass = safeName(record.class?.name).toLowerCase();
        candidates.push({
          id, name, rarity: rarityPt[rarity] || 'Raro',
          tier: 'B', // apenas valor inicial neutro, NÃO meta oficial
          health: 'Não definido', type: [classPt[klass] || 'Dano'],
          walks_on_water: false, breaks_walls: false,
          image_url: portrait, icon_url: border, is_active: true,
        });
        usedIds.add(id);
        byGameId.set(String(record.id), id);
        byName.set(key, id);
      }
      if (candidates.length) {
        const { error: writeError } = await database.from('brawlers')
          .upsert(candidates, { onConflict: 'id', ignoreDuplicates: true });
        if (writeError) throw writeError;
      }
      // Sincroniza exclusivamente metadados oficiais existentes; tier e estatísticas intactos.
      for(let offset=0;offset<metadataUpdates.length;offset+=5) {
        const results = await Promise.all(metadataUpdates.slice(offset,offset+5).map(patch =>
          database.from('brawlers').update({rarity:patch.rarity,type:patch.type}).eq('id',patch.id)));
        const failed = results.find(x=>x.error);
        if(failed?.error) throw failed.error;
      }
      const now = new Date().toISOString();
      const { error: updateError } = await database.from('catalog_sync_state').upsert({
        source: 'brawlapi-brawlers', last_sync_at: now,
        source_count: list.length, created_count: candidates.length, updated_count: metadataUpdates.length
      }, { onConflict: 'source' });
      if (updateError) throw updateError;
      return json({ ok: true, sourceCount: list.length, created: candidates.length, updated: metadataUpdates.length, lastSync: now });
    }

    if (body.action === 'add-map') {
      const id = body.mapId;
      if (!Number.isInteger(id) || id! < 15000000 || id! > 17000000) {
        return json({ error: 'Identificador de mapa inválido.' }, 400);
      }
      const external = await getBrawlData('/maps/' + id) as ExternalMap;
      if (external.id !== id || !safeName(external.name)) {
        return json({ error: 'Mapa não reconhecido pela BrawlAPI.' }, 422);
      }
      const mode = modePt[safeName(external.gameMode?.name).toLowerCase()];
      if (!mode) return json({ error: 'Este modo de jogo não é suportado pelo sistema.' }, 422);
      const rawName = body.displayName;
      if (typeof rawName !== 'string' || rawName.trim().length < 1 || rawName.trim().length > 100) {
        return json({ error: 'O nome do mapa deve conter de 1 a 100 caracteres.' }, 400);
      }
      const terrains = ['Aberto', 'Semi-Aberto', 'Fechado', 'Misto'];
      if (!body.terrain || !terrains.includes(body.terrain)) {
        return json({ error: 'Tipo de terreno inválido.' }, 400);
      }
      const imageUrl = safeAsset(external.imageUrl);
      const { error: mapError } = await database.from('maps').upsert({
        id: String(id), name: safeName(external.name), mode,
        terrain: 'Misto', image_url: imageUrl, is_active: false
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (mapError) throw mapError;
      const { error: teamError } = await database.from('team_map_settings').upsert({
        team_id: verified.user.id, map_id: String(id), is_active: true,
        display_name: rawName.trim(), terrain_override: body.terrain,
      }, { onConflict: 'team_id,map_id' });
      if (teamError) throw teamError;
      return json({ ok: true, mapId: String(id), name: safeName(external.name), mode, notice: external.disabled ? 'O mapa está sinalizado como desativado na fonte. A seleção competitiva é manual.' : null });
    }

    return json({ error: 'Ação não permitida.' }, 400);
  } catch (error) {
    console.error('catalog-sync', error);
    return json({ error: 'Não foi possível consultar ou atualizar o catálogo. Os dados antigos foram preservados.' }, 502);
  }
});
