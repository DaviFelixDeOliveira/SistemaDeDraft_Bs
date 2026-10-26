import { describe,it,expect } from 'vitest';
import { draftAutoOrderFromAnnouncement } from '../lib/draftAutoOrderSummary';
describe('Ordem do draft a partir da faixa de início',()=>{
  it('azul começa e somos azul: primeiro nosso, último inimigo',()=>{
    expect(draftAutoOrderFromAnnouncement('blue','blue'))
      .toEqual({first:'ally',last:'enemy'});
  });
  it('vermelho começa e somos azul: primeiro inimigo, último nosso',()=>{
    expect(draftAutoOrderFromAnnouncement('red','blue'))
      .toEqual({first:'enemy',last:'ally'});
  });
  it('vermelho começa e somos vermelho: primeiro nosso, último inimigo',()=>{
    expect(draftAutoOrderFromAnnouncement('red','red'))
      .toEqual({first:'ally',last:'enemy'});
  });
  it('não adivinha equipe sem identificação e confirmação',()=>{
    expect(draftAutoOrderFromAnnouncement(null,'blue')).toBeNull();
    expect(draftAutoOrderFromAnnouncement('red',null)).toBeNull();
  });
});
