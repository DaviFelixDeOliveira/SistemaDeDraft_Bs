import type {Brawler,Composition,GameMap,Match,MatchPick} from '../types';
import {getModeFit} from './draftEngineUtils';

export interface CompositionThreat {
  brawlerId:string;
  matches:number;
  losses:number;
  wins:number;
  lossRate:number;
  confidence:'insufficient'|'limited'|'developing';
}
export interface CompositionInsight {
  composition:Composition;
  matches:number;
  wins:number;
  losses:number;
  winrate:number|null;
  threats:CompositionThreat[];
  lastFive:{matches:number;wins:number};
}
/**
 * Preserva o trio inteiro: uma vitória/derrota não demonstra um duelo 1x1
 * e o mapa é obrigatório. Treinos agrupados continuam contando por partida.
 */
export function analyzeCompositions(comps:Composition[],matches:Match[],picks:MatchPick[]):CompositionInsight[]{
  const perMatch=new Map<string,MatchPick[]>();
  for(const p of picks){
    if(!perMatch.has(p.match_id))perMatch.set(p.match_id,[]);
    perMatch.get(p.match_id)!.push(p);
  }
  return comps.map(composition=>{
    const wanted=new Set(composition.brawlers);
    const history=matches.filter(match=>{
      if(match.map_id!==composition.mapId || wanted.size!==3)return false;
      const ours=new Set((perMatch.get(match.id)||[]).filter(p=>p.team==='ally').map(p=>p.brawler_id));
      return ours.size===3 && [...wanted].every(id=>ours.has(id));
    }).sort((a,b)=>new Date(b.match_date).getTime()-new Date(a.match_date).getTime());
    const wins=history.filter(m=>m.result==='victory').length;
    const opponents=new Map<string,{matches:number;losses:number;wins:number}>();
    for(const match of history){
      const enemies=new Set((perMatch.get(match.id)||[]).filter(p=>p.team==='enemy').map(p=>p.brawler_id));
      for(const id of enemies){
        const v=opponents.get(id)||{matches:0,losses:0,wins:0};
        v.matches++;
        if(match.result==='victory')v.wins++;else v.losses++;
        opponents.set(id,v);
      }
    }
    const threats=[...opponents.entries()].map(([brawlerId,v]):CompositionThreat=>({
      brawlerId,...v,lossRate:Math.round(100*v.losses/v.matches),
      confidence:v.matches<2?'insufficient':v.matches<5?'limited':'developing'
    })).filter(t=>t.matches>=2 && t.losses>=2 && t.lossRate>=65)
      .sort((a,b)=>b.matches-a.matches||b.lossRate-a.lossRate);
    const recent=history.slice(0,5);
    return {composition,matches:history.length,wins,losses:history.length-wins,
      winrate:history.length?Math.round(wins*100/history.length):null,
      lastFive:{matches:recent.length,wins:recent.filter(m=>m.result==='victory').length},threats};
  });
}
/** Comparações para recomendar first pick são independentes das regras de ban. */
export function firstPickScore(b:Brawler,map:GameMap):number{
 const tier:Record<string,number>={S:100,A:80,B:60,C:40,D:20};
 const fit=getModeFit(b,map.mode);
 const modeBonus=fit==='good'?45:fit==='poor'?-45:0;
 const openPenalty=map.terrain==='Aberto' && b.type.includes('Tanque')?-30:0;
 return (tier[b.tier]??0)+modeBonus+openPenalty;
}
/** Se a nossa equipe escolhe primeiro, não recomendar banir os melhores candidatos ao primeiro pick. */
export function planDraftOpening(brawlers:Brawler[],map:GameMap,allyStarts:boolean,banned:string[]){
 const available=brawlers.filter(b=>!banned.includes(b.id)).sort((a,b)=>firstPickScore(b,map)-firstPickScore(a,map));
 const plannedPicks=allyStarts?available.slice(0,3):[];
 return {plannedPicks,reserved:new Set(plannedPicks.map(p=>p.id))};
}

/** Aviso de funções críticas considera Controle de forma explícita. */
export function compositionBalanceAlert(ourTeam:Brawler[],map:GameMap|null):string|null{
  const n=(name:string)=>ourTeam.filter(b=>b.type.includes(name)).length;
  if(n('Tiro preciso')>=3)return 'Atenção: composição com três Atiradores! Considere brawlers anti tanques, que sirvamcontra avanços rápidos.';
  if(n('Artilharia')>=3)return 'Atenção: composição com três Artilharias! Cuidado contra personagens de avanço.';
  if(n('Tanque')>=3)return 'Atenção: composição com três Tanques! Cuidado contra anti-tanques e brawlers de controle.';
  if(map?.terrain==='Aberto' && ourTeam.length>=2 && n('Tiro preciso')===0 && n('Controle')===0)
    return 'Atenção: não há nenhum tiro preciso nem controle nesta composição! Considere isso ao escolher brawlers para o time.';
  return null;
}
