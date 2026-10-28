import {describe,expect,it} from 'vitest';
import {makeDraftAutoPortraitCrop} from '../services/draftAutoPortraitCrops';
import type {DraftPortraitFingerprint} from '../lib/draftAutoPortraitIdentity';

const fp:DraftPortraitFingerprint={cells:Array.from({length:192},(_,i)=>i%256)};
const png='data:image/png;base64,iVBORw0KGgo=';
describe('Biblioteca local de imagens recortadas',()=>{
  it('associa um rosto recortado ao nome informado com id reprodutível',()=>{
    const one=makeDraftAutoPortraitCrop(16000001,' Shelly ',fp,png,100);
    const twice=makeDraftAutoPortraitCrop(16000001,'Shelly',fp,png,200);
    expect(one).toMatchObject({
      name:'Shelly',brawlerId:16000001,
      fingerprint:fp,faceDataUrl:png,createdAt:100,
    });
    expect(one?.id).toBe(twice?.id);
    expect(one?.fingerprint).not.toBe(fp);
  });
  it('rejeita imagens fora de data URL PNG, ids e descritores inválidos',()=>{
    expect(makeDraftAutoPortraitCrop(1,'Shelly',fp,png)).toBeNull();
    expect(makeDraftAutoPortraitCrop(16000001,'Shelly',fp,'https://example.com')).toBeNull();
    expect(makeDraftAutoPortraitCrop(16000001,'Shelly',{cells:[1,2]},png)).toBeNull();
  });
});
