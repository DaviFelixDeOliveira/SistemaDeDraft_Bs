import {describe,it,expect} from 'vitest';
import {corroborateDraftEmptyCards,type DraftEmptyCardSample} from '../lib/draftAutoEmptyReference';

function sample(values:number[], likelyEmpty:boolean, purple=.80,dark=1,spread=18):DraftEmptyCardSample {
  return {portrait:{cells:new Array(192).fill(0).map((_,i)=>values[i%values.length])},
    emptyEvidence:{status:likelyEmpty?'likely-empty':'unknown',
      purpleShare:purple,darkShare:dark,luminanceSpread:spread}};
}
describe('Abstenção com referência de cartas vazias na própria captura',()=>{
  it('reconhece terceiro placeholder semelhante a duas cartas vazias de lados diferentes',()=>{
    const results=corroborateDraftEmptyCards({
      'blue-3':sample([47,45,59],false,.68,.98,20),
      'red-1':sample([45,44,58],true),
      'red-2':sample([46,45,57],true),
      'blue-1':sample([200,100,20],false,.08,.36,65),
    });
    expect(results).toEqual({'blue-3':'similar-to-empty','red-1':'likely-empty',
      'red-2':'likely-empty','blue-1':'unknown'});
  });
  it('não infere slot vazio de uma só referência confiável',()=>{
    expect(corroborateDraftEmptyCards({
      a:sample([40,45,55],true),b:sample([40,45,55],false,.70,.95,20),
    }).b).toBe('unknown');
  });
  it('não afirma que uma skin escura é vazia quando as cores não sustentam isso',()=>{
    const results=corroborateDraftEmptyCards({
      a:sample([45,50,60],true),b:sample([45,50,60],true),
      c:sample([45,50,60],false,.10,.95,20),
    });
    expect(results.c).toBe('unknown');
  });
  it('não usa duas âncoras de aparência incompatível',()=>{
    const results=corroborateDraftEmptyCards({
      a:sample([0],true),b:sample([200],true),c:sample([20],false,.95,1,20),
    });
    expect(results.c).toBe('unknown');
  });
  it('não modifica entradas e aceita ausência de amostras',()=>{
    expect(corroborateDraftEmptyCards({})).toEqual({});
  });
});
