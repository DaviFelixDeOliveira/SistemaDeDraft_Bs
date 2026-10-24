import { createClient } from 'npm:@supabase/supabase-js@2.76.1';

// Proxy documentado pelo RoyaleAPI: IP de saída autorizado no painel da Supercell.
// IMPORTANTE: proxy de terceiros recebe a requisição e o token. Mantê-lo apenas
// no backend, nunca no frontend. Trocar por egress fixo próprio quando disponível.
const API_BASE = 'https://bsproxy.royaleapi.dev';
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const response = (content: unknown, status = 200) => new Response(JSON.stringify(content), {
  status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
});
const normalizeTag = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const tag = '#' + raw.trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '');
  return /^#[A-Z0-9]{3,16}$/.test(tag) ? tag : null;
};
type GameProfile = { tag?: unknown; name?: unknown };

async function fetchProfile(tag: string, key: string): Promise<{tag: string; nickname: string}> {
  const apiResponse = await fetch(`${API_BASE}/v1/players/${encodeURIComponent(tag)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
    redirect: 'error'
  });
  if (apiResponse.status === 404) throw new Error('Jogador não encontrado. Confira a tag no Brawl Stars.');
  if (apiResponse.status === 401 || apiResponse.status === 403)
    throw new Error('A chave oficial ou o IP autorizado foi recusado. Verifique as configurações da Supercell.');
  if (apiResponse.status === 429) throw new Error('Limite de consultas atingido. Tente novamente mais tarde.');
  if (!apiResponse.ok) throw new Error('Serviço de jogadores indisponível (HTTP ' + apiResponse.status + ').');
  const profile = await apiResponse.json() as GameProfile;
  const returned = normalizeTag(profile?.tag);
  const nickname = typeof profile?.name === 'string' ? profile.name.trim().slice(0, 80) : '';
  if (!returned || returned !== tag || !nickname) throw new Error('A Supercell retornou informações incompletas ou incorretas.');
  return { tag: returned, nickname };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405);

  const jwt = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('BRAWL_STARS_API_KEY')?.trim();
  if (!jwt) return response({ error: 'Entre na sua equipe para consultar jogadores.' }, 401);
  if (!projectUrl || !serviceKey) return response({ error: 'Servidor não configurado.' }, 500);
  if (!apiKey) return response({ error: 'A chave da Supercell ainda não foi salva em Edge Functions → Secrets.' }, 503);

  const client = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await client.auth.getUser(jwt);
  if (authError || !auth.user) return response({ error: 'Sessão inválida. Entre novamente.' }, 401);

  let body: { action?: 'lookup' | 'refresh'; tag?: string; playerId?: string };
  try { body = await request.json(); } catch { return response({ error: 'Dados inválidos.' }, 400); }

  try {
    if (body.action === 'lookup') {
      const tag = normalizeTag(body.tag);
      if (!tag) return response({ error: 'Digite uma tag válida, por exemplo #22QJ0JPVJ.' }, 400);
      const player = await fetchProfile(tag, apiKey);
      return response({ ok: true, ...player });
    }

    if (body.action === 'refresh') {
      if (typeof body.playerId !== 'string' || body.playerId.length > 80)
        return response({ error: 'Jogador inválido.' }, 400);
      const { data: player, error } = await client.from('players')
        .select('id,team_id,nickname,brawl_tag,brawl_tag_checked_at')
        .eq('id', body.playerId).eq('team_id', auth.user.id).maybeSingle();
      if (error) throw error;
      if (!player) return response({ error: 'Jogador não pertence à equipe atual.' }, 404);
      const tag = normalizeTag(player.brawl_tag);
      if (!tag) return response({ error: 'Este jogador não tem uma tag vinculada.' }, 400);

      const checkedAt = player.brawl_tag_checked_at ? new Date(player.brawl_tag_checked_at).getTime() : 0;
      if (Date.now() - checkedAt < 30 * 60 * 1000) {
        return response({ ok: true, tag, nickname: player.nickname, lastCheckedAt: player.brawl_tag_checked_at, skipped: true });
      }
      const latest = await fetchProfile(tag, apiKey);
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await client.from('players')
        .update({ nickname: latest.nickname, brawl_tag_checked_at: now })
        .eq('id', player.id).eq('team_id', auth.user.id).eq('brawl_tag', tag)
        .select('id,nickname,brawl_tag,brawl_tag_checked_at').maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return response({ error: 'O jogador foi alterado durante a consulta. Atualize a página.' }, 409);
      return response({ ok: true, tag, nickname: updated.nickname, lastCheckedAt: updated.brawl_tag_checked_at, skipped: false });
    }

    return response({ error: 'Ação não reconhecida.' }, 400);
  } catch (e) {
    // Não retornar detalhes de requisição nem o token ao cliente ou logs.
    return response({ error: e instanceof Error ? e.message : 'Não foi possível consultar o jogador.' }, 502);
  }
});
