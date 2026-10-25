import { describe, expect, it } from 'vitest';
import { isDraftGuestTokenExpired, restoreDraftGuestSession } from '../lib/draftAutoSession';
import type { GuestJoinSession } from '../services/draftAutoGuestService';

const now = Date.parse('2026-10-25T12:00:00Z');
const session: GuestJoinSession = {
  code:'3S893BSH',requestId:'request-1',token:'secret',
  status:'approved',expiresAt:'2026-10-25T12:30:00Z',
};
describe('Validade da conexão de jogador no Draft Automático',()=>{
  it('não trata aprovação antiga como válida após o prazo',()=>{
    const restored=restoreDraftGuestSession(JSON.stringify(session),'3S893BSH',now+30*60_000);
    expect(restored?.status).toBe('expired');
  });
  it('mantém estado até o prazo e verifica sempre no servidor',()=>{
    expect(restoreDraftGuestSession(JSON.stringify(session),'3S893BSH',now)?.status).toBe('approved');
    expect(isDraftGuestTokenExpired(session.expiresAt,now)).toBe(false);
  });
  it('não aceita credencial de outra sala ou dados incompletos',()=>{
    expect(restoreDraftGuestSession(JSON.stringify(session),'ABCDEFGH',now)).toBeNull();
    expect(restoreDraftGuestSession('{"code":"3S893BSH"}','3S893BSH',now)).toBeNull();
    expect(restoreDraftGuestSession('{','3S893BSH',now)).toBeNull();
  });
  it('falha de forma segura com data de expiração inválida',()=>{
    expect(isDraftGuestTokenExpired('not-a-date',now)).toBe(true);
    expect(restoreDraftGuestSession(JSON.stringify({...session,expiresAt:'oops'}),'3S893BSH',now)?.status).toBe('expired');
  });
});
