/** Identificador público de sessão; não é senha nem credencial de acesso. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateDraftAutoRoomCode(getBytes: (values: Uint8Array) => Uint8Array = values => crypto.getRandomValues(values)): string {
  const bytes = getBytes(new Uint8Array(8));
  if (bytes.length !== 8) throw new Error('Gerador de código inválido.');
  // 32 caracteres -> bytes aleatórios de 0..255 produzem distribuição uniforme.
  return Array.from(bytes, value => ALPHABET[value % ALPHABET.length]).join('');
}
export function isDraftAutoRoomCode(value: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(value);
}
