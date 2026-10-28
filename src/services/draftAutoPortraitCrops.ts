import type { DraftPortraitFingerprint } from '../lib/draftAutoPortraitIdentity';

/**
 * A small, opt-in local library of FACE-ONLY crops from actual game cards.
 * IndexedDB: not uploaded, not tied to team auth, not draft event history.
 * These thumbnails are reference material; the current matcher still uses
 * the separate 8x8 fingerprints and does not train a neural network.
 */
export type DraftAutoPortraitCrop = {
  id: string;
  brawlerId: number;
  name: string;
  faceDataUrl: string;
  createdAt: number;
};

const DB_NAME = 'draft-auto-local-portraits';
const STORE_NAME = 'face-crops';

export function makeDraftAutoPortraitCrop(
  brawlerId: number,
  name: string,
  fingerprint: DraftPortraitFingerprint,
  faceDataUrl: string,
  createdAt: number = Date.now(),
): DraftAutoPortraitCrop | null {
  if (!Number.isInteger(brawlerId) || brawlerId < 16000000 || brawlerId > 16099999 ||
    typeof name !== 'string' || name.trim().length < 2 || name.length > 60 ||
    !Array.isArray(fingerprint.cells) || fingerprint.cells.length !== 192 ||
    !fingerprint.cells.every(n => Number.isInteger(n) && n >= 0 && n <= 255) ||
    typeof faceDataUrl !== 'string' ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(faceDataUrl) ||
    faceDataUrl.length > 180_000 || !Number.isSafeInteger(createdAt)) return null;

  // Deterministic content key deduplicates the same face cropped again.
  let hash = 2166136261;
  for (const color of fingerprint.cells) {
    hash ^= color;
    hash = Math.imul(hash, 16777619);
  }
  return {
    id: brawlerId + '-' + (hash >>> 0).toString(16),
    brawlerId,name:name.trim(),faceDataUrl,createdAt,
  };
}

function openPortraitDatabase():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Armazenamento de imagens indisponível neste navegador.'));
      return;
    }
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME,{keyPath:'id'});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('Não foi possível abrir a biblioteca local de recortes.'));
  });
}

export async function saveDraftAutoPortraitCrop(record: DraftAutoPortraitCrop):Promise<void> {
  const db=await openPortraitDatabase();
  try {
    await new Promise<void>((resolve,reject)=>{
      const transaction=db.transaction(STORE_NAME,'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(new Error('Sem espaço ou permissão para salvar recortes.'));
      transaction.onabort=()=>reject(new Error('Não foi possível concluir a gravação local.'));
    });
  } finally { db.close(); }
}

export async function listDraftAutoPortraitCrops():Promise<DraftAutoPortraitCrop[]> {
  const db=await openPortraitDatabase();
  try {
    return await new Promise<DraftAutoPortraitCrop[]>((resolve,reject)=>{
      const transaction=db.transaction(STORE_NAME,'readonly');
      const request=transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess=()=>resolve((request.result as DraftAutoPortraitCrop[])
        .sort((a,b)=>b.createdAt-a.createdAt));
      request.onerror=()=>reject(new Error('Não foi possível ler os recortes locais.'));
    });
  } finally { db.close(); }
}

export async function clearDraftAutoPortraitCrops():Promise<void> {
  const db=await openPortraitDatabase();
  try {
    await new Promise<void>((resolve,reject)=>{
      const transaction=db.transaction(STORE_NAME,'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(new Error('Não foi possível apagar os recortes locais.'));
    });
  } finally { db.close(); }
}
