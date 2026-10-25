import { describe, expect, it } from 'vitest';
import { generateDraftAutoRoomCode, isDraftAutoRoomCode } from '../lib/draftAutoRoomCode';

describe('Código público de sala de treino', () => {
  it('gera oito caracteres sem símbolos ambíguos', () => {
    const code = generateDraftAutoRoomCode(bytes => {
      for (let i = 0; i < bytes.length; i++) bytes[i] = i * 29;
      return bytes;
    });
    expect(code).toHaveLength(8);
    expect(isDraftAutoRoomCode(code)).toBe(true);
  });
  it('não permite valores vazios, espaços ou caracteres confusos', () => {
    expect(isDraftAutoRoomCode('')).toBe(false);
    expect(isDraftAutoRoomCode('ABCDEFGI')).toBe(false);
    expect(isDraftAutoRoomCode('ABCDEFGO')).toBe(false);
    expect(isDraftAutoRoomCode('ABCDEF10')).toBe(false);
    expect(isDraftAutoRoomCode('abcdefgh')).toBe(false);
  });
  it('rejeita um gerador com número insuficiente de bytes', () => {
    expect(() => generateDraftAutoRoomCode(() => new Uint8Array(3))).toThrow();
  });
});
