import {describe,it,expect} from 'vitest';
import {evaluateDraftHoldout} from '../lib/draftAutoHoldout';

describe('Validação independente das capturas do draft',()=>{
  it('não conta o mesmo exemplo ensinado como acerto',()=>{
    const result=evaluateDraftHoldout([
      {actual:1,predicted:1,memorized:true},
      {actual:2,predicted:2,memorized:false},
      {actual:3,predicted:4,memorized:false},
      {actual:5,predicted:null,memorized:false},
    ]);
    expect(result).toMatchObject({
      memorized:1,evaluated:3,correct:1,incorrect:1,abstained:1,
      accuracy:1/3,coverage:2/3,
    });
  });
  it('sem exemplos de fora do treino, não inventa taxa de acerto',()=>{
    expect(evaluateDraftHoldout([
      {actual:1,predicted:1,memorized:true},
    ])).toMatchObject({evaluated:0,memorized:1,accuracy:null,coverage:null});
    expect(evaluateDraftHoldout([])).toMatchObject({evaluated:0,accuracy:null});
  });
  it('conta previsão de carta vazia corretamente',()=>{
    expect(evaluateDraftHoldout([
      {actual:'empty',predicted:'empty',memorized:false},
      {actual:'empty',predicted:2,memorized:false},
    ])).toMatchObject({correct:1,incorrect:1,evaluated:2});
  });
});
