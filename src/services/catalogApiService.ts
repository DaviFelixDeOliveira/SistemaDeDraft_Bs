import type { GameMode } from '../types';
import { supabase } from '../lib/supabase';

export interface ExternalGameMap {
  id: string;
  name: string;
  mode: GameMode;
  imageUrl: string | null;
  disabled: boolean;
}
export interface BrawlerSyncResult {
  ok: boolean;
  skipped?: boolean;
  sourceCount: number;
  created: number;
  updated: number;
  lastSync: string;
}

const MODE_MAPPING: Record<string, GameMode> = {
  'gem grab': 'Pique-Gema',
  'brawl ball': 'Fute-Brawl',
  'bounty': 'Caça-Estrelas',
  'heist': 'Roubo',
  'hot zone': 'Zona Estratégica',
  'knockout': 'Nocaute',
};

/**
 * A lista da BrawlAPI não define a temporada competitiva do usuário.
 * Apenas apresenta mapas existentes; cada equipe escolhe sua rotação.
 */
export function parseExternalMaps(payload: unknown): ExternalGameMap[] {
  if (!payload || typeof payload !== 'object' || !('list' in payload)
    || !Array.isArray(payload.list)) throw new Error('Resposta de mapas inesperada.');
  return payload.list.flatMap((map: any) => {
    if (!Number.isInteger(map?.id) || !map?.name || typeof map.name !== 'string') return [];
    const mode = MODE_MAPPING[String(map?.gameMode?.name ?? '').trim().toLowerCase()];
    if (!mode) return [];
    const imageUrl = typeof map.imageUrl === 'string' && map.imageUrl.startsWith('https://cdn.brawlify.com/')
      ? map.imageUrl : null;
    return [{
      id: String(map.id), name: map.name.trim().slice(0, 100),
      mode, imageUrl, disabled: !!map.disabled,
    }];
  });
}

let cachedMaps: ExternalGameMap[] | null = null;
let cachedAt = 0;
let inFlight: Promise<ExternalGameMap[]> | null = null;

export async function loadExternalMaps(): Promise<ExternalGameMap[]> {
  if (cachedMaps && Date.now() - cachedAt < 60 * 60 * 1000) return cachedMaps;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch('https://api.brawlapi.com/v1/maps', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Falha ao consultar os mapas da BrawlAPI.');
    const parsed = parseExternalMaps(await response.json());
    if (parsed.length < 10) throw new Error('A API retornou poucos mapas; o catálogo atual foi preservado.');
    cachedMaps = parsed;
    cachedAt = Date.now();
    return parsed;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function syncBrawlersFromApi(): Promise<BrawlerSyncResult> {
  const { data, error } = await supabase.functions.invoke<BrawlerSyncResult>('catalog-sync', {
    body: { action: 'sync-brawlers' },
  });
  if (error || !data?.ok) {
    throw new Error('Não foi possível atualizar brawlers pela API. Os dados anteriores foram mantidos.');
  }
  return data;
}

export async function addMapFromApi(
  mapId: string,
  details: { name: string; terrain: 'Aberto' | 'Semi-Aberto' | 'Fechado' | 'Misto' }
): Promise<{mapId: string; mode: GameMode; notice?: string}> {
  const id = Number(mapId);
  if (!Number.isInteger(id) || id < 15000000 || id > 17000000) throw new Error('Mapa inválido.');
  if (!details.name.trim() || details.name.trim().length > 100) throw new Error('Informe um nome válido para o mapa.');
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean; mapId: string; mode: GameMode; notice?: string; error?: string
  }>('catalog-sync', { body: { action: 'add-map', mapId: id, displayName: details.name.trim(), terrain: details.terrain } });
  if (error || !data?.ok) throw new Error(data?.error || 'Não foi possível adicionar o mapa. Tente novamente.');
  return { mapId: data.mapId, mode: data.mode, notice: data.notice };
}
