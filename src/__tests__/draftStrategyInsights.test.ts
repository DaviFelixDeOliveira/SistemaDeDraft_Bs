import {describe,it,expect} from 'vitest';
import type {Brawler,Composition,GameMap,Match,MatchPick} from '../types';
import {analyzeCompositions,compositionBalanceAlert,planDraftOpening} from '../lib/draftStrategyInsights';
import {computeBanScore} from '../lib/draftEngineUtils';
import {buildEvidence} from '../lib/matchupEvidence';

const map={id:'anel',name:'Anel de Fogo',mode:'Zona Estratégica',terrain:'Aberto',isActive:true} as GameMap;
const b=(id:string,tier:string,type:string):Brawler=>({
 id,name:id,rarity:'Épico',tier,health:'Média',type:[type],walksOnWater:false,breaksWalls:false,
 is_active:true
});
const brawlers=[b('finx','B','Controle'),b('shade','S','Algoz'),b('mortis','A','Algoz'),b('bull','B','Tanque'),b('gray','A','Suporte'),b('doug','C','Suporte'),b('dina','B','Artilharia')];
const composition={id:'comp',mapId:'anel',brawlers:['mortis','gray','doug'],winrate:0,matchesPlayed:0} as Composition;
const match=(id:number,win:boolean):Match=>({id:String(id),map_id:'anel',result:win?'victory':'defeat',match_date:`2026-10-24T${String(10+id).padStart(2,'0')}:00:00`,session_id:'one-training'});
const pick=(id:number,team:'ally'|'enemy',brawler_id:string):MatchPick=>({match_id:String(id),team,brawler_id});
describe('Confiabilidade de drafts e composições',()=>{
 it('uma derrota de Bull não o transforma em ban prioritário',()=>{
   const onlyOne={bull:{picks:1,wins:1,winrate:100}};
   expect(computeBanScore(brawlers[3],'Aberto',false,onlyOne))
     .toBeLessThan(computeBanScore(brawlers[1],'Aberto',false,onlyOne));
 });
 it('primeiro pick reserva fortes para escolher, sem recomendar bani-los',()=>{
   const ours=planDraftOpening(brawlers,map,true,[]);
   expect(ours.plannedPicks.length).toBe(3);
   expect(ours.reserved.has(ours.plannedPicks[0].id)).toBe(true);
   expect(planDraftOpening(brawlers,map,false,[]).reserved.size).toBe(0);
 });
it('qualquer brawler da classe Controle remove o aviso em mapa aberto', () => {
  const shade = brawlers[1];
  const mortis = brawlers[2];
  const finx = brawlers[0];

  const outroControle = b('controle-generico', 'B', 'Controle');

  // Sem Controle e sem Tiro preciso, deve existir um aviso.
  expect(
    compositionBalanceAlert([shade, mortis], map)
  ).not.toBeNull();

  // Finx é Controle, portanto não deve existir aviso.
  expect(
    compositionBalanceAlert([shade, finx], map)
  ).toBeNull();

  // Qualquer outro brawler da classe Controle também funciona.
  expect(
    compositionBalanceAlert([shade, outroControle], map)
  ).toBeNull();
});
 it('uma partida de Shade da nossa equipe já entra no mapa e modo',()=>{
   const data=buildEvidence([match(1,false),match(2,true)],[pick(1,'enemy','shade'),pick(2,'ally','shade')],[map]);
   expect(data.breakdown('shade')[0].sample.matches).toBe(1);
   expect(data.breakdown('shade')[0].maps[0].sample.matches).toBe(1);
   expect(data.performance('shade','Zona Estratégica','anel').map.winrate).toBe(100);
 });
 it('duas derrotas contra Bull geram aviso com pouca amostra; não prova counter',()=>{
   const matches=[match(1,false),match(2,false)];
   const picks=matches.flatMap((m,i)=>[
    pick(i+1,'ally','mortis'),pick(i+1,'ally','gray'),pick(i+1,'ally','doug'),
    pick(i+1,'enemy','bull'),pick(i+1,'enemy','dina'),pick(i+1,'enemy','shade')]);
   const info=analyzeCompositions([composition],matches,picks)[0];
   expect(info.matches).toBe(2);
   expect(info.winrate).toBe(0);
   expect(info.threats.find(t=>t.brawlerId==='bull')?.confidence).toBe('limited');
 });
 it('trios diferentes não são atribuídos à composição cadastrada',()=>{
   const matches=[match(1,false),match(2,false)];
   const picks=[
    ...['mortis','gray','doug'].map(x=>pick(1,'ally',x)),pick(1,'enemy','bull'),
    ...['shade','gray','doug'].map(x=>pick(2,'ally',x)),pick(2,'enemy','bull')
   ];
   const info=analyzeCompositions([composition],matches,picks)[0];
   expect(info.matches).toBe(1);
   expect(info.threats.length).toBe(0);
 });
 it('um treino agrupa partidas, mas cada uma conta individualmente',()=>{
   const matches=[match(1,true),match(2,false),match(3,true)];
   const picks=matches.flatMap((m,i)=>[
    ...['mortis','gray','doug'].map(id=>pick(i+1,'ally',id)),
    pick(i+1,'enemy','bull')]);
   const summary=analyzeCompositions([composition],matches,picks)[0];
   expect(summary.matches).toBe(3);
   expect(summary.wins).toBe(2);
   expect(summary.lastFive.matches).toBe(3);
 });
 it('composição salva sem partidas não inventa winrate de zero',()=>{
   const result=analyzeCompositions([composition],[],[])[0];
   expect(result.winrate).toBeNull();
   expect(result.matches).toBe(0);
 });
});
