import {describe,it,expect} from 'vitest';
import {parseDraftCatalog,matchDraftCatalogPortrait} from '../lib/draftAutoCatalogVisual';
import type {DraftCatalogReference} from '../lib/draftAutoCatalogVisual';
import type {DraftPortraitFingerprint} from '../lib/draftAutoPortraitIdentity';

const url=(id:number)=>`https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
const record=(id:number,name:string)=>({id,name,released:true,imageUrl2:url(id)});
const solid=(value:number):DraftPortraitFingerprint=>({cells:new Array(192).fill(value)});
const ref=(id:number,name:string,value:number):DraftCatalogReference=>({
  id,name,imageUrl:url(id),fingerprint:solid(value),
});
describe('Catálogo visual público: validação e abstenção',()=>{
  it('aceita somente URLs esperadas ligadas ao ID original',()=>{
    const list=parseDraftCatalog({list:[
      record(16000001,'Shelly'),
      record(16000002,'Colt'),
      {...record(16000003,'Unknown'),imageUrl2:'https://evil.example/item.png'},
      {...record(16000004,'Wrong'),imageUrl2:url(16000002)},
      {...record(16000005,'Inactive'),released:false},
    ]});
    expect(list.map(r=>r.name)).toEqual(['Shelly','Colt']);
  });
  it('descarta URLs javascript, registros repetidos e nomes vazios',()=>{
    const list=parseDraftCatalog({list:[
      record(16000001,'Shelly'),record(16000001,'Shelly'),
      record(16000002,'Colt'),
      {...record(16000003,'X'),name:' '},
    ]});
    expect(list).toHaveLength(2);
  });
  it('não considera URL arbitrária enviada por terceiros',()=>{
    expect(()=>parseDraftCatalog({list:[
      {...record(16000001,'Shelly'),imageUrl2:'javascript:alert(1)'},
      record(16000002,'Colt'),
    ]})).toThrow();
  });
  it('não interpreta semelhança como certeza quando a segunda referência é próxima',()=>{
    const result=matchDraftCatalogPortrait(solid(110),[
      ref(16000001,'Shelly',110),
      ref(16000002,'Colt',111),
    ]);
    expect(result.status).toBe('uncertain');
    expect(result.name).toBeNull();
    expect(result.nearest).toHaveLength(2);
  });
  it('abstém-se quando as imagens não são visualmente parecidas',()=>{
    expect(matchDraftCatalogPortrait(solid(0),[
      ref(16000001,'Shelly',150),ref(16000002,'Colt',200),
    ]).status).toBe('uncertain');
  });
  it('pode sugerir um exemplo fortemente separado, sem afirmar confirmação',()=>{
    const result=matchDraftCatalogPortrait(solid(110),[
      ref(16000001,'Shelly',110),ref(16000002,'Colt',190),
    ]);
    expect(result.status).toBe('possible-match');
    expect(result).toMatchObject({name:'Shelly',gameId:16000001});
  });
  it('recusa catálogo insuficiente',()=>{
    expect(matchDraftCatalogPortrait(solid(110),[ref(16000001,'Shelly',110)])
      .status).toBe('no-references');
  });
});
