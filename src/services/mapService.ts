import { supabase } from '../lib/supabase';
import { GameMap, Composition } from '../types';
import { mockMaps } from '../data/mockData';

function mapFromSupabase(data: any): GameMap {
  return {
    id: data.id,
    name: data.name,
    mode: data.mode,
    terrain: data.terrain,
    isActive: data.is_active ?? true,
    is_active: data.is_active ?? true,
    imageUrl: data.image_url || undefined,
  };
}

function mapToSupabase(map: Partial<GameMap>): any {
  const row: any = {};
  if (map.id !== undefined) row.id = map.id;
  if (map.name !== undefined) row.name = map.name;
  if (map.mode !== undefined) row.mode = map.mode;
  if (map.terrain !== undefined) row.terrain = map.terrain;
  if (map.isActive !== undefined) row.is_active = map.isActive;
  if (map.is_active !== undefined) row.is_active = map.is_active;
  if (map.imageUrl !== undefined) row.image_url = map.imageUrl;
  return row;
}

function compFromSupabase(data: any): Composition {
  return {
    id: data.id,
    mapId: data.map_id,
    brawlers: data.brawlers as [string, string, string],
    description: data.description || undefined,
    winrate: data.winrate ?? 0,
    matchesPlayed: data.matches_played ?? 0,
    is_active: data.is_active ?? true,
  };
}

export const mapService = {
  getMaps: async (): Promise<GameMap[]> => {
    const [{ data, error }, { data: settings, error: preferencesError }] = await Promise.all([
      supabase.from('maps').select('*').order('name'),
      supabase.from('team_map_settings').select('map_id,is_active,display_name,terrain_override'),
    ]);
    if (error) throw error;
    if (preferencesError) throw preferencesError;
    const perTeam = new Map((settings || []).map(s => [s.map_id, s]));
    return (data || []).filter(row => perTeam.has(row.id)).map(row => {
      const map = mapFromSupabase(row);
      const preference = perTeam.get(map.id);
      return !preference ? map : {
        ...map,
        name: preference.display_name || map.name,
        terrain: (preference.terrain_override || map.terrain) as GameMap['terrain'],
        isActive: preference.is_active,
        is_active: preference.is_active,
      };
    });
  },

  getMapById: async (id: string): Promise<GameMap | undefined> => {
    const maps = await mapService.getMaps();
    return maps.find(m => m.id === id);
  },

  createMap: async (_map: Omit<GameMap, 'id'>): Promise<GameMap> => {
    throw new Error('O catálogo global de mapas é gerenciado pela sincronização. Cada equipe pode ativar ou desativar mapas existentes.');
  },

  // A edição de nome e terreno pertence à equipe: nunca modifica maps.
  updateMapPreferences: async (map: Pick<GameMap, 'id' | 'name' | 'terrain'>): Promise<void> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Faça login para editar mapas.');
    const name = map.name.trim();
    if (name.length < 1 || name.length > 100) throw new Error('Informe um nome de mapa válido.');
    const { data: existing, error: lookupError } = await supabase.from('team_map_settings')
      .select('is_active').eq('map_id', map.id).maybeSingle();
    if (lookupError) throw lookupError;
    const { error } = await supabase.from('team_map_settings').upsert({
      team_id: auth.user.id, map_id: map.id,
      is_active: existing?.is_active ?? true,
      display_name: name, terrain_override: map.terrain,
    }, { onConflict: 'team_id,map_id' });
    if (error) throw error;
  },

  updateMapStatus: async (id: string, isActive: boolean): Promise<void> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Faça login para configurar os mapas.');
    const { error } = await supabase.from('team_map_settings')
      .upsert({ team_id: auth.user.id, map_id: id, is_active: isActive }, { onConflict: 'team_id,map_id' });
    if (error) throw error;
  },

  /** Remove da lista da equipe se não houver dados; com histórico, arquiva em vez de apagar. */
  removeMapFromRotation: async (id: string): Promise<'archived' | 'removed'> => {
    const { data, error } = await supabase.rpc('remove_team_map_from_rotation', { p_map_id: id });
    if (error) throw new Error('Não foi possível remover o mapa da rotação: ' + error.message);
    if (data !== 'archived' && data !== 'removed') throw new Error('O servidor não confirmou a remoção.');
    return data;
  },

  // ─── Composições ────────────────────────────────────────────────────────────

  /**
   * Busca todas as composições ativas do Supabase.
   * Retorna array vazio se a tabela ainda não existir ou estiver vazia.
   */
  getComps: async (): Promise<Composition[]> => {
    try {
      const { data, error } = await supabase
        .from('compositions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar composições do Supabase:', error.message);
        return [];
      }
      return (data || []).map(compFromSupabase);
    } catch (err) {
      console.warn('Erro ao conectar ao Supabase para composições:', err);
      return [];
    }
  },

  /**
   * Busca composições de um mapa específico.
   */
  getCompsByMap: async (mapId: string): Promise<Composition[]> => {
    try {
      const { data, error } = await supabase
        .from('compositions')
        .select('*')
        .eq('map_id', mapId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar composições do mapa:', error.message);
        return [];
      }
      return (data || []).map(compFromSupabase);
    } catch (err) {
      console.warn('Erro ao conectar ao Supabase para composições do mapa:', err);
      return [];
    }
  },

  /**
   * Cria uma nova composição e persiste no Supabase.
   * isMeta=true para composições salvas via "Salvar como Meta do Mapa".
   * isMeta=false para composições criadas manualmente via "Nova Comp".
   */
  createComp: async (comp: Omit<Composition, 'id'>, isMeta = false): Promise<Composition> => {
    const row = {
      map_id: comp.mapId,
      brawlers: comp.brawlers,
      description: comp.description || null,
      winrate: comp.winrate ?? 0,
      matches_played: comp.matchesPlayed ?? 0,
      is_meta: isMeta,
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from('compositions')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return compFromSupabase(data);
    } catch (err) {
      console.error('Erro ao criar composição no Supabase:', err);
      throw new Error('Não foi possível salvar a composição no banco.');
    }
  },
};
