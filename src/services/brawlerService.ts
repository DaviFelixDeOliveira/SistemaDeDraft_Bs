import { supabase } from '../lib/supabase';
import { Brawler } from '../types';

// Converte do formato do banco (snake_case) para o formato do app (camelCase)
function mapFromSupabase(data: any): Brawler {
  let img = data.image_url || undefined;
  let icon = data.icon_url || undefined;

  // Normaliza URLs do GitHub Raw (com erro 429) para o CDN oficial do Brawlify
  if (img && img.includes('raw.githubusercontent.com/Brawlify/CDN/master/brawlers/')) {
    img = img.replace('raw.githubusercontent.com/Brawlify/CDN/master/brawlers/portraits/', 'cdn.brawlify.com/brawlers/borders/')
             .replace('raw.githubusercontent.com/Brawlify/CDN/master/brawlers/borders/', 'cdn.brawlify.com/brawlers/borders/');
  }
  if (icon && icon.includes('raw.githubusercontent.com/Brawlify/CDN/master/brawlers/')) {
    icon = icon.replace('raw.githubusercontent.com/Brawlify/CDN/master/brawlers/emoji/', 'cdn.brawlify.com/brawlers/emoji/');
  }

  return {
    id: data.id,
    name: data.name,
    rarity: data.rarity,
    tier: data.tier,
    health: data.health,
    healthValue: data.health_value || undefined,
    type: data.type || [],
    walksOnWater: !!data.walks_on_water,
    breaksWalls: !!data.breaks_walls,
    howBreaksWalls: data.how_breaks_walls || undefined,
    imageUrl: img,
    iconUrl: icon,
    isHotPick: !!data.is_hot_pick,
    is_active: data.is_active ?? true,
    counters: data.counters || [],
    counteredBy: data.countered_by || [],
  };
}

// Converte do formato do app para o formato do banco
function mapToSupabase(brawler: Partial<Brawler>): any {
  const row: any = {};
  if (brawler.id !== undefined) row.id = brawler.id;
  if (brawler.name !== undefined) row.name = brawler.name;
  if (brawler.rarity !== undefined) row.rarity = brawler.rarity;
  if (brawler.tier !== undefined) row.tier = brawler.tier;
  if (brawler.health !== undefined) row.health = brawler.health;
  if (brawler.healthValue !== undefined) row.health_value = brawler.healthValue;
  if (brawler.type !== undefined) row.type = brawler.type;
  if (brawler.walksOnWater !== undefined) row.walks_on_water = brawler.walksOnWater;
  if (brawler.breaksWalls !== undefined) row.breaks_walls = brawler.breaksWalls;
  if (brawler.howBreaksWalls !== undefined) row.how_breaks_walls = brawler.howBreaksWalls;
  if (brawler.imageUrl !== undefined) row.image_url = brawler.imageUrl;
  if (brawler.iconUrl !== undefined) row.icon_url = brawler.iconUrl;
  if (brawler.isHotPick !== undefined) row.is_hot_pick = brawler.isHotPick;
  if (brawler.is_active !== undefined) row.is_active = brawler.is_active;
  if (brawler.counters !== undefined) row.counters = brawler.counters;
  if (brawler.counteredBy !== undefined) row.countered_by = brawler.counteredBy;
  return row;
}

export const brawlerService = {
  getBrawlers: async (): Promise<Brawler[]> => {
    const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('brawlers').select('*').order('name'),
      supabase.from('team_brawler_settings').select('*'),
    ]);
    if (error) throw error;
    if (settingsError) throw settingsError;

    const overrides = new Map((settings || []).map(p => [p.brawler_id, p]));
    return (data || []).map(row => {
      const own = overrides.get(row.id);
      if (!own) return mapFromSupabase(row);
      const merged: Record<string, any> = { ...row };
      for (const key of [
        'tier', 'is_active', 'is_hot_pick', 'counters', 'countered_by',
        'health', 'health_value', 'walks_on_water', 'breaks_walls',
        'how_breaks_walls', 'image_url', 'icon_url'
      ]) {
        if (own[key] !== null && own[key] !== undefined) merged[key] = own[key];
      }
      return mapFromSupabase(merged);
    });
  },

  createBrawler: async (_brawler: Omit<Brawler, 'id'>): Promise<Brawler> => {
    throw new Error('Novos brawlers serão adicionados na atualização do catálogo global. Por enquanto, personalize os existentes.');
  },

  updateBrawler: async (id: string, changes: Partial<Brawler>): Promise<Brawler | null> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Faça login para personalizar brawlers.');

    // Apenas as configurações particulares são gravadas; o catálogo global permanece intacto.
    const allowed = new Set([
      'tier', 'is_active', 'is_hot_pick', 'counters', 'countered_by',
      'health', 'health_value', 'walks_on_water',
      'breaks_walls', 'how_breaks_walls', 'image_url', 'icon_url'
    ]);
    const mapped = mapToSupabase(changes);
    const payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(mapped)) {
      if (allowed.has(key)) payload[key] = value;
    }
    // Para uma edição manual, atualize apenas as colunas informadas.
    // Um upsert parcial poderia sobrescrever o tier definido no Organizar Meta.
    if (Object.keys(payload).length === 0) return null;
    const { data: existing, error: lookupError } = await supabase.from('team_brawler_settings')
      .select('brawler_id').eq('team_id', auth.user.id).eq('brawler_id', id).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      const { data: updated, error } = await supabase.from('team_brawler_settings')
        .update(payload).eq('team_id', auth.user.id).eq('brawler_id', id)
        .select('brawler_id').single();
      if (error) throw error;
      if (!updated) throw new Error('A alteração do brawler não foi confirmada.');
    } else {
      const { error } = await supabase.from('team_brawler_settings')
        .insert({ ...payload, team_id: auth.user.id, brawler_id: id });
      if (error) throw error;
    }
    return null;
  },

  /** Altera somente tiers da equipe autenticada, em uma operação atômica no banco. */
  setTeamMetaTiers: async (brawlerIds: string[], tier: 'S' | 'A' | 'B' | 'C' | 'D'): Promise<number> => {
    const uniqueIds = [...new Set(brawlerIds)].filter(Boolean);
    if (!['S', 'A', 'B', 'C', 'D'].includes(tier)) throw new Error('Tier inválido.');
    if (uniqueIds.length === 0 || uniqueIds.length > 150) {
      throw new Error('Selecione entre 1 e 150 brawlers.');
    }
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Faça login na sua equipe para organizar o meta.');
    const { data, error } = await supabase.rpc('set_team_brawler_tiers', {
      p_ids: uniqueIds,
      p_tier: tier,
    });
    if (error) throw new Error('Não foi possível salvar os tiers da equipe: ' + error.message);
    return typeof data === 'number' ? data : uniqueIds.length;
  },

  deleteBrawler: async (id: string): Promise<void> => {
    await brawlerService.updateBrawler(id, { is_active: false });
  }
};
