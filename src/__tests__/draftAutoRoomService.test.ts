import { beforeEach, describe, expect, it, vi } from 'vitest';
import { draftAutoRoomService } from '../services/draftAutoRoomService';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: mocks.from },
}));
vi.mock('../lib/draftAutoRoomCode', () => ({
  generateDraftAutoRoomCode: () => 'ABCDEFGH',
}));

describe('Criação segura de salas Draft Auto', () => {
  const teamId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: teamId } }, error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({
      data: {
        id: 'room-1', team_id: teamId, join_code: 'ABCDEFGH',
        status: 'active', created_at: '2026-10-27T23:00:00Z',
        expires_at: '2026-10-28T11:00:00Z',
      }, error: null,
    });
  });

  it('deixa o Supabase definir as 12 horas, sem depender da data do navegador', async () => {
    const room = await draftAutoRoomService.create();
    expect(mocks.from).toHaveBeenCalledWith('draft_auto_rooms');
    expect(mocks.insert).toHaveBeenCalledOnce();
    const payload = mocks.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({ team_id: teamId, join_code: 'ABCDEFGH', status: 'active' });
    expect(payload).not.toHaveProperty('expires_at');
    expect(payload).not.toHaveProperty('created_at');
    expect(room.expires_at).toBe('2026-10-28T11:00:00Z');
  });

  it('não tenta criar sala se não houver autenticação de equipe', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(draftAutoRoomService.create()).rejects.toThrow(/Faça login/);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('não ignora falha de segurança no Supabase', async () => {
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    await expect(draftAutoRoomService.create()).rejects.toThrow(/row-level security policy/);
  });
});
