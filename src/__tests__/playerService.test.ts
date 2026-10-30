import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playerService } from '../services/playerService';
import type { Player } from '../types';

const db = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: { from: db.from } }));

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: '',
    name: '',
    nickname: 'aaa',
    isActive: true,
    comfortBrawlers: [],
    tags: [],
    ...overrides,
  };
}

describe('playerService.savePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.from.mockReturnValue({ upsert: db.upsert });
    db.upsert.mockReturnValue({ select: db.select });
    db.select.mockReturnValue({ single: db.single });
    db.single.mockImplementation(async () => ({
      data: db.upsert.mock.calls[0][0],
      error: null,
    }));
  });

  it('gera um ID ao cadastrar um jogador sem ID e preenche nome pelo nickname', async () => {
    const saved = await playerService.savePlayer(buildPlayer());
    expect(db.from).toHaveBeenCalledWith('players');
    expect(db.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        nickname: 'aaa',
        name: 'aaa',
      }),
      { onConflict: 'id' },
    );
    expect(saved.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('preserva o ID na edição de um jogador existente', async () => {
    const player = buildPlayer({ id: 'jogador-existente', name: 'Nome' });
    const saved = await playerService.savePlayer(player);
    expect(db.upsert.mock.calls[0][0]).toMatchObject({
      id: 'jogador-existente',
      name: 'Nome',
    });
    expect(saved.id).toBe('jogador-existente');
  });

  it('rejeita nickname vazio antes de gravar no banco', async () => {
    await expect(playerService.savePlayer(buildPlayer({ nickname: '  ' })))
      .rejects.toThrow('Informe o nickname');
    expect(db.from).not.toHaveBeenCalled();
  });

  it('não reporta sucesso caso a gravação retorne erro', async () => {
    db.single.mockResolvedValueOnce({ data: null, error: { message: 'Acesso negado' } });
    await expect(playerService.savePlayer(buildPlayer()))
      .rejects.toThrow('Acesso negado');
  });
});

describe('playerService.deletePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.from.mockReturnValue({ delete: db.delete });
    db.delete.mockReturnValue({ eq: db.eq });
    db.eq.mockReturnValue({ select: db.select });
    db.select.mockReturnValue({ maybeSingle: db.maybeSingle });
    db.maybeSingle.mockResolvedValue({ data: { id: 'player-1' }, error: null });
  });

  it('exclui apenas o perfil solicitado e exige confirmação de linha removida', async () => {
    await expect(playerService.deletePlayer('player-1')).resolves.toBeUndefined();
    expect(db.from).toHaveBeenCalledWith('players');
    expect(db.delete).toHaveBeenCalledOnce();
    expect(db.eq).toHaveBeenCalledWith('id', 'player-1');
    expect(db.select).toHaveBeenCalledWith('id');
    expect(db.maybeSingle).toHaveBeenCalledOnce();
  });

  it('não informa sucesso quando RLS ou ID inexistente retornam zero linhas', async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(playerService.deletePlayer('inexistente')).rejects.toThrow('não encontrado ou sem permissão');
  });

  it('explica caso a migração das FKs ainda não tenha sido aplicada', async () => {
    db.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '23503', message: 'foreign key constraint violation' },
    });
    await expect(playerService.deletePlayer('player-1')).rejects.toThrow('atualização necessária do banco');
  });

  it('preserva e informa erros inesperados sem remover o perfil localmente', async () => {
    db.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'Acesso negado' },
    });
    await expect(playerService.deletePlayer('player-1')).rejects.toThrow('Acesso negado');
  });
});
