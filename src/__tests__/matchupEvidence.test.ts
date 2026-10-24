import { describe, expect, it } from 'vitest';
import type { GameMap, Match, MatchPick, Player } from '../types';
import { buildEvidence, confrontationBonus, evidenceBonus } from '../lib/matchupEvidence';

const maps: GameMap[] = [
 { id: 'gem',name: 'Mina Rochosa',mode:'Pique-Gema',terrain:'Misto',isActive:true },
 { id: 'heist',name: 'Batata Quente',mode:'Roubo',terrain:'Aberto',isActive:true },
];
const matches: Match[]=[];
const picks: MatchPick[]=[];
function add(index: number, mapId: string, ally: string[], enemy: string[], won: boolean, player='linc'){
 const id = `00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
 matches.push({id,map_id:mapId,match_date:new Date(2026,9,1,index).toISOString(),
   result:won?'victory':'defeat'});
 for(const brawler_id of ally) picks.push({match_id:id,team:'ally',brawler_id,player_id:player});
 for(const brawler_id of enemy) picks.push({match_id:id,team:'enemy',brawler_id});
}
for(let i=0;i<8;i++)add(i+1,'gem',['mortis','gray','doug'],['dynamike','shelly','nita'],i<6);
for(let i=0;i<5;i++)add(i+20,'heist',['mortis','gray','doug'],['dynamike','shelly','nita'],i===0);
for(let i=0;i<6;i++)add(i+30,'gem',['allie','doug','gus'],['edgar','piper','buzz'],i<5,'davi');
const perf=buildEvidence(matches,picks,maps);

describe('Evidence-based draft',()=>{
 it('distingue global, modo e mapa sem inventar partidas',()=>{
   const e=perf.against('mortis','dynamike','Roubo','heist');
   expect(e.global.matches).toBe(13);
   expect(e.global.winrate).toBe(54);
   expect(e.mode.winrate).toBe(20);
   expect(e.map.winrate).toBe(20);
   expect(confrontationBonus(e)).toBeLessThan(0);
 });
 it('não afirma derrota com amostra ausente',()=>{
   const e=perf.performance('mortis','Nocaute','none');
   expect(e.mode.matches).toBe(0);
   expect(e.mode.winrate).toBeNull();
   expect(e.map.winrate).toBeNull();
   expect(evidenceBonus(perf.performance('unknown','Roubo','heist'))).toBe(0);
 });
 it('considera a parceria com winrate real e mínimo de cinco partidas',()=>{
   const partners=perf.relationEntries('doug','partner');
   expect(partners.some(p=>p.id==='gray')).toBe(true);
   expect(partners.some(p=>p.id==='allie')).toBe(true);
   expect(partners.find(p=>p.id==='allie')!.winrate).toBeGreaterThan(partners.find(p=>p.id==='gray')!.winrate!);
 });
 it('não infere counter do brawler só porque esteve em uma derrota',()=>{
   expect(perf.relationEntries('mortis','counter').some(x=>x.id==='dynamike')).toBe(false);
   expect(perf.relationEntries('mortis','threat').some(x=>x.id==='dynamike')).toBe(false);
   const manual=perf.relationEntries('mortis','counter',['dynamike']);
   expect(manual.find(x=>x.id==='dynamike')?.manual).toBe(true);
 });
 it('mostra recorte de cada mapa dentro do modo',()=>{
   const modes=perf.breakdown('mortis');
   expect(modes.find(x=>x.mode==='Pique-Gema')?.maps[0].sample.matches).toBe(8);
   expect(modes.find(x=>x.mode==='Roubo')?.maps[0].sample.matches).toBe(5);
 });
 it('mantém conforto manual e sugere somente com uso dominante e 5+ partidas',()=>{
   const players:Player[]=[
     {id:'linc',nickname:'Linc',name:'Linc',isActive:true,comfortBrawlers:[]},
     {id:'davi',nickname:'Davi',name:'Davi',isActive:true,comfortBrawlers:['mortis']}
   ];
   expect(perf.comfort('mortis',players).find(x=>x.playerId==='linc')?.inferred).toBe(true);
   expect(perf.comfort('mortis',players).find(x=>x.playerId==='davi')?.manual).toBe(true);
 });
});
