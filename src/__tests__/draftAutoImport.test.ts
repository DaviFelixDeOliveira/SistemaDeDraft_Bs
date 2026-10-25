import { describe, expect, it } from 'vitest';
import { importDraftAutoEvent } from '../lib/draftAutoImport';
import type { DraftState } from '../components/draft/DraftWizard';
import type { DraftAutoRoomEvent } from '../services/draftAutoGuestService';
const base: DraftState = {
  mapId: '', allyStarts: true, allyBans: [null,null,null],
  enemyBans:[null,null,null], picks:[], playerAssignments:{},
};
const event = (options: Partial<DraftAutoRoomEvent>): DraftAutoRoomEvent => ({
  id: 'e1',room_id:'room',request_id:'request',client_event_id:'uuid',
  kind:'map',map_id:'map-1',ally_starts:null,team:null,slot:null,brawler_id:null,
  created_at:'2026-10-25T00:00:00Z',...options
});
describe('Importação explícita de eventos do jogador pelo coach',()=>{
 it('importa mapa sem afetar a fonte',()=>{
   const r=importDraftAutoEvent(base,event({}));
   expect(r.status).toBe('applied'); expect(r.draft.mapId).toBe('map-1');
   expect(base.mapId).toBe('');
 });
 it('não substitui mapa com draft já iniciado',()=>{
   const existing={...base,mapId:'map-1',allyBans:['griff',null,null]};
   expect(importDraftAutoEvent(existing,event({map_id:'map-2'})).status).toBe('review');
 });
 it('aplica ban sem duplicar e rejeita overwrite',()=>{
   const mapped={...base,mapId:'map-1'};
   const ban=event({kind:'ban',map_id:null,team:'enemy',slot:0,brawler_id:'rosa'});
   const ok=importDraftAutoEvent(mapped,ban);
   expect(ok.draft.enemyBans[0]).toBe('rosa');
   expect(importDraftAutoEvent(ok.draft,ban).status).toBe('ignored');
   expect(importDraftAutoEvent(ok.draft,{...ban,brawler_id:'frank'}).status).toBe('review');
 });
 it('aplica picks na sequência e não assume equipe errada',()=>{
   const mapped={...base,mapId:'map-1'};
   const ally=event({kind:'pick',map_id:null,team:'ally',slot:0,brawler_id:'griff'});
   const first=importDraftAutoEvent(mapped,ally);
   expect(first.status).toBe('applied');
   expect(importDraftAutoEvent(mapped,{...ally,slot:2,team:'enemy'}).status).toBe('review');
   expect(importDraftAutoEvent(first.draft,{...ally,slot:1,team:'ally',brawler_id:'rosa'}).status).toBe('review');
   expect(importDraftAutoEvent(first.draft,{...ally,slot:1,team:'enemy',brawler_id:'rosa'}).status).toBe('applied');
 });
 it('impede picks banidos e não grava histórico de partidas',()=>{
   const mapped={...base,mapId:'map-1',allyBans:['griff',null,null]};
   expect(importDraftAutoEvent(mapped,event({kind:'pick',map_id:null,team:'ally',slot:0,brawler_id:'griff'})).status).toBe('review');
   expect(Object.keys(base)).toEqual(['mapId','allyStarts','allyBans','enemyBans','picks','playerAssignments']);
 });
 it('impede mudança do lado depois de haver pick',()=>{
   const picked={...base,mapId:'map-1',picks:[{brawlerId:'griff',team:'ally' as const}]};
   expect(importDraftAutoEvent(picked,event({kind:'first-pick',map_id:null,ally_starts:false})).status).toBe('review');
 });
});
