import React, { useState, useEffect, useRef } from 'react';
import { History, Calendar, Clock, Map as MapIcon, Crosshair, Users, Trophy, Download, FileText, Image as ImageIcon, X, ChevronDown, Shield, Swords, Ban, FileImage } from 'lucide-react';
import { sessionService, TrainingSession } from '../../services/sessionService';
import { analyticsService } from '../../services/analyticsService';
import { Match, MatchPick, MatchBan, Brawler, Player } from '../../types';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../ui/ConfirmModal';
import { mapService } from '../../services/mapService';
import { brawlerService } from '../../services/brawlerService';
import { playerService } from '../../services/playerService';
import { domToPng, domToJpeg, domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

/**
 * Converte timestamp do Supabase (sem fuso) para Date correta.
 * O Supabase salva 'timestamp without time zone' como UTC, mas sem o "Z".
 * Sem essa conversão, JS interpreta como hora local, gerando offset errado.
 */
function parseTs(ts: string): Date {
  if (!ts) return new Date();
  if (/[Zz]$/.test(ts) || /[+-]\d{2}:\d{2}$/.test(ts)) return new Date(ts);
  return new Date(ts + 'Z');
}

export function TrainingHistory() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<MatchPick[]>([]);
  const [bans, setBans] = useState<MatchBan[]>([]);
  const [mapsMap, setMapsMap] = useState<Record<string, any>>({});
  const [brawlersMap, setBrawlersMap] = useState<Record<string, Brawler>>({});
  const [playersMap, setPlayersMap] = useState<Record<string, Player>>({});
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, action: (() => void) | null, title: string, message: string}>({ isOpen: false, action: null, title: '', message: '' });
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportSession, setSelectedExportSession] = useState<string>('');
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<Match | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const reportCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();

    // Sincroniza em tempo real com mudanças no Supabase
    const subscription = sessionService.subscribeToSessions(() => {
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const generateMockSession = async () => {
    const mapKeys = Object.keys(mapsMap);
    const brawlerKeys = Object.keys(brawlersMap);
    if(mapKeys.length === 0 || brawlerKeys.length < 6) {
      alert("É necessário ter mapas e pelo menos 6 brawlers cadastrados para gerar treino.");
      return;
    }

    const sessionId = crypto.randomUUID();
    const newSession = {
      id: sessionId,
      start_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    };

    const mockMatches: Match[] = [];
    const mockPicks: MatchPick[] = [];
    const mockBans: MatchBan[] = [];

    const addMockMatch = (offsetMins: number, result: 'victory'|'defeat', mapIdx: number, opp: string) => {
      const matchId = crypto.randomUUID();
      mockMatches.push({
        id: matchId,
        session_id: sessionId,
        match_date: new Date(Date.now() - offsetMins * 60 * 1000).toISOString(),
        map_id: mapKeys[mapIdx],
        result,
        opponent_name: opp,
        notes: 'Mock match'
      });

      const shuffled = [...brawlerKeys].sort(() => 0.5 - Math.random());
      const tbkP = shuffled.slice(0, 3);
      const enmP = shuffled.slice(3, 6);
      const tbkB = shuffled.slice(6, 9);
      const enmB = shuffled.slice(9, 12);

      tbkP.forEach(b => mockPicks.push({ match_id: matchId, team: 'tbk', brawler_id: b }));
      enmP.forEach(b => mockPicks.push({ match_id: matchId, team: 'enemy', brawler_id: b }));
      tbkB.forEach(b => mockBans.push({ match_id: matchId, team: 'tbk', brawler_id: b }));
      enmB.forEach(b => mockBans.push({ match_id: matchId, team: 'enemy', brawler_id: b }));
    };

    addMockMatch(110, 'victory', 0, 'Mock Team 1');
    addMockMatch(90, 'defeat', Math.min(1, mapKeys.length - 1), 'Mock Team 2');
    addMockMatch(70, 'victory', 0, 'Mock Team 3');

    setSessions(prev => [newSession, ...prev]);
    setMatches(prev => [...mockMatches, ...prev]);
    setPicks(prev => [...mockPicks, ...prev]);
    setBans(prev => [...mockBans, ...prev]);
  };

  const loadData = async () => {
    const rawSessions = await sessionService.getSessions();
    const m = await analyticsService.getAllMatches();
    const p = await analyticsService.getAllPicks();
    const b = await analyticsService.getAllBans();
    const maps = await mapService.getMaps();
    const brwls = await brawlerService.getBrawlers();
    const plyrs = await playerService.getPlayers();
    
    const mMap: Record<string, any> = {};
    maps.forEach(map => { mMap[map.id] = map; });

    const bMap: Record<string, Brawler> = {};
    brwls.forEach(br => { bMap[br.id] = br; });

    const pMap: Record<string, Player> = {};
    plyrs.forEach(pl => { pMap[pl.id] = pl; });

    // Auto-limpeza de sessões vazias (sem partidas) no Supabase
    const validSessions: TrainingSession[] = [];
    for (const session of rawSessions) {
      // Verifica se a sessão possui partidas vinculadas
      const sessionMatches = m.filter(match => {
        if (match.session_id) return match.session_id === session.id;
        const start = parseTs(session.start_date).getTime();
        const end = session.end_date ? parseTs(session.end_date).getTime() : Date.now();
        const matchTime = parseTs(match.match_date).getTime();
        return matchTime >= start && matchTime <= end;
      });

      // Se a sessão está encerrada e não tem NENHUMA partida, apaga do Supabase!
      if (session.end_date !== null && sessionMatches.length === 0) {
        sessionService.deleteSession(session.id);
      } else {
        validSessions.push(session);
      }
    }

    const s = validSessions.sort((a, b) => parseTs(b.start_date).getTime() - parseTs(a.start_date).getTime());

    setSessions(s);
    setMatches(m);
    setPicks(p);
    setBans(b);
    setMapsMap(mMap);
    setBrawlersMap(bMap);
    setPlayersMap(pMap);
  };

  const getSessionMatches = (session: TrainingSession) => {
    return matches.filter(m => {
      // 1. Se tem session_id, faz match direto
      if (m.session_id) {
        return m.session_id === session.id;
      }
      // 2. Fallback por range de data para partidas antigas
      const start = parseTs(session.start_date).getTime();
      const end = session.end_date ? parseTs(session.end_date).getTime() : new Date().getTime();
      const matchTime = parseTs(m.match_date).getTime();
      return matchTime >= start && matchTime <= end;
    }).sort((a, b) => parseTs(b.match_date).getTime() - parseTs(a.match_date).getTime());
  };

  const getSessionPlayers = (sessionMatches: Match[]) => {
    const matchIds = new Set(sessionMatches.map(m => m.id));
    const sessionPicks = picks.filter(p => matchIds.has(p.match_id) && p.team === 'tbk' && p.player_id);
    const uniquePlayerIds = Array.from(new Set(sessionPicks.map(p => p.player_id!)));
    return uniquePlayerIds.map(id => playersMap[id]).filter(Boolean);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Treino',
      message: 'Deseja excluir este registro de treino? (As partidas continuarão salvas no histórico)',
      action: async () => {
        await sessionService.deleteSession(id);
        await loadData();
      }
    });
  };

  const handleResetHistory = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Resetar Todo o Histórico',
      message: 'ATENÇÃO: Deseja apagar todas as sessões E todas as partidas jogadas no sistema? Esta ação é irreversível.',
      action: async () => {
        const allSessions = await sessionService.getSessions();
        for (const s of allSessions) {
          await sessionService.deleteSession(s.id);
        }
        await analyticsService.deleteAllMatches();
        await loadData();
      }
    });
  };

  const handleExportImage = async (format: 'png' | 'jpg') => {
    if (!reportCardRef.current) return;
    try {
      setIsExporting(true);
      const element = reportCardRef.current;
      
      const options = {
        scale: 2.5,
        backgroundColor: '#0d0e12',
        width: element.scrollWidth,
        height: element.scrollHeight,
        features: {
          removeControlCharacter: true
        }
      };

      let imgData: string;
      if (format === 'png') {
        imgData = await domToPng(element, options);
      } else {
        imgData = await domToJpeg(element, { ...options, quality: 0.96 });
      }
      
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}-${month}-${year}`;

      const link = document.createElement('a');
      link.download = `tbk_hub_relatorio_treino_${dateStr}.${format}`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Erro ao exportar imagem:', err);
      alert(`Ocorreu um erro ao gerar a imagem: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportCardRef.current) return;
    try {
      setIsExporting(true);
      const element = reportCardRef.current;

      const imgData = await domToPng(element, {
        scale: 2.5,
        backgroundColor: '#0d0e12',
        width: element.scrollWidth,
        height: element.scrollHeight,
        features: {
          removeControlCharacter: true
        }
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Largura A4 padrão em px (a 72dpi = 595.28, mas podemos criar PDF sob medida da folha ou A4 com proporção)
      const pdfWidth = img.width;
      const pdfHeight = img.height;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}-${month}-${year}`;

      pdf.save(`tbk_hub_relatorio_treino_${dateStr}.pdf`);
    } catch (err: any) {
      console.error('Erro ao exportar PDF:', err);
      alert(`Ocorreu um erro ao gerar o arquivo PDF: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-500" /> Histórico de Treinos
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Visualize as sessões de scrims, desempenho e composições utilizadas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-indigo-200 dark:border-indigo-500/20"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={generateMockSession}
            className="bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-zinc-200 dark:border-[#2A2A2A]"
          >
            Gerar Treino de Exemplo
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum treino registrado</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">Utilize o botão "Iniciar Treino" no Dashboard para registrar sessões.</p>
          </div>
        ) : (
          sessions.map(session => {
            const sessionMatches = getSessionMatches(session);
            const sessionPlayers = getSessionPlayers(sessionMatches);
            const wins = sessionMatches.filter(m => m.result === 'victory').length;
            const losses = sessionMatches.length - wins;
            const wr = sessionMatches.length > 0 ? Math.round((wins / sessionMatches.length) * 100) : 0;
            const isExpanded = expandedSession === session.id;
            
            const startDate = parseTs(session.start_date);
            
            return (
              <div key={session.id} className="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl overflow-hidden shadow-sm transition-all hover:border-indigo-500/30">
                <div 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer relative"
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", session.end_date ? "bg-indigo-50 dark:bg-indigo-500/10" : "bg-emerald-500/10")}>
                      <Clock className={cn("w-6 h-6", session.end_date ? "text-indigo-500" : "text-emerald-500")} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                          Treino de {startDate.toLocaleDateString()}
                        </h4>
                        {!session.end_date && (
                          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                            Em Andamento
                          </span>
                        )}
                        {session.opponent_name && (
                          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold px-2 py-0.5 rounded-md">
                            vs {session.opponent_name}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                        {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                        {session.end_date ? ` - ${parseTs(session.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ' - ...'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="flex items-center gap-6 flex-1 sm:flex-none justify-between sm:justify-start">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Partidas</div>
                        <div className="font-bold text-slate-900 dark:text-white">{sessionMatches.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resultado</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          <span className="text-emerald-500">{wins}V</span> - <span className="text-red-500">{losses}D</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WR</div>
                        <div className={cn("font-black", wr >= 60 ? "text-emerald-500" : wr >= 40 ? "text-amber-500" : "text-red-500")}>
                          {wr}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-[#2A2A2A] bg-slate-50 dark:bg-[#0A0A0A] p-4 sm:p-5 space-y-5">
                    {/* Atletas que jogaram no treino */}
                    {sessionPlayers.length > 0 && (
                      <div>
                        <h5 className="font-bold text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" /> Atletas Participantes ({sessionPlayers.length})
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {sessionPlayers.map(pl => (
                            <span key={pl.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {pl.nickname || pl.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 className="font-bold text-sm text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapIcon className="w-4 h-4" /> Partidas da Sessão
                      </h5>
                      
                      {sessionMatches.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Nenhuma partida registrada nesta sessão.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sessionMatches.map((m) => {
                            const map = mapsMap[m.map_id];
                            const mDate = new Date(m.match_date);
                            return (
                              <div key={m.id} onClick={() => setSelectedMatchForDetails(m)} className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-colors group">
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[150px] group-hover:text-indigo-500 transition-colors">
                                    {map ? map.name : 'Mapa Desconhecido'}
                                  </span>
                                  <span className="text-xs text-slate-500">{mDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <span className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-md uppercase",
                                  m.result === 'victory' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                )}>
                                  {m.result === 'victory' ? 'Vitória' : 'Derrota'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
            <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => {
          if (confirmConfig.action) {
            confirmConfig.action();
          }
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant="danger"
        confirmText="Excluir"
        processingText="Excluindo..."
        successText="Treino excluído!"
        delayMs={500}
      />

      {isExportModalOpen && (() => {
        // Apenas treinos encerrados que POSSUEM partidas
        const completedSessions = sessions.filter(s => {
          if (!s.end_date) return false;
          return getSessionMatches(s).length > 0;
        });

        const exportSession = completedSessions.find(s => s.id === selectedExportSession) || completedSessions[0];
        const expMatches = exportSession ? getSessionMatches(exportSession) : [];
        const expPlayers = exportSession ? getSessionPlayers(expMatches) : [];
        const expWins = expMatches.filter(m => m.result === 'victory').length;
        const expLosses = expMatches.length - expWins;
        const expWr = expMatches.length > 0 ? Math.round((expWins / expMatches.length) * 100) : 0;

        // parseTs já definida no topo do arquivo

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsExportModalOpen(false)}>
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
              {/* Header do Modal */}
              <div className="p-5 border-b border-zinc-100 dark:border-[#2A2A2A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-500" /> Exportar Relatório de Treino
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Selecione o treino e escolha o formato desejado (PNG, JPG ou PDF).</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedExportSession || exportSession?.id || ''}
                    onChange={e => setSelectedExportSession(e.target.value)}
                    className="flex-1 sm:flex-initial bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {completedSessions.length === 0 && <option value="">Nenhum treino encerrado com partidas</option>}
                    {completedSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {parseTs(s.start_date).toLocaleDateString()} — {s.opponent_name || 'Treino'} ({getSessionMatches(s).length} partidas)
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setIsExportModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Report Preview Body (Estilo Folha de Documento / A4 Card com ref) */}
              <div className="overflow-y-auto flex-1 p-6 bg-slate-100 dark:bg-[#0A0A0A] flex justify-center">
                {!exportSession ? (
                  <div className="text-center py-16">
                    <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500 font-bold text-base">Nenhum treino concluído com partidas registradas.</p>
                    <p className="text-zinc-400 text-sm mt-1">Realize e encerre um treino com partidas para visualizar o relatório.</p>
                  </div>
                ) : (
                  /* Folha de Relatório Profissional / Esports Dark Document */
                  <div 
                    ref={reportCardRef} 
                    className="w-full max-w-[760px] bg-[#0f1117] border border-[#232738] rounded-2xl shadow-2xl p-7 sm:p-9 space-y-6 text-white select-none relative overflow-hidden"
                    style={{ minHeight: 'auto', boxSizing: 'border-box' }}
                  >
                    {/* Background Glow sutil */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                    {/* Header do Documento */}
                    <div className="relative z-10 flex justify-between items-start border-b border-[#232738] pb-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-black text-[10px] uppercase tracking-wider">TBK Esports</span>
                            <span className="text-[11px] font-bold text-zinc-400">Scrims Analysis</span>
                          </div>
                          <h1 className="text-2xl font-black tracking-tight text-white uppercase mt-0.5">RELATÓRIO DE TREINO</h1>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-zinc-300 font-mono">{parseTs(exportSession.start_date).toLocaleDateString()}</div>
                        {exportSession.opponent_name ? (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1d28] border border-[#2e3448] text-indigo-300 text-xs font-bold rounded-lg shadow-sm">
                            <Swords className="w-3.5 h-3.5 text-indigo-400" /> vs {exportSession.opponent_name}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">Treino Interno</span>
                        )}
                      </div>
                    </div>

                    {/* Overview Cards (Métricas Chave) */}
                    <div className="relative z-10 grid grid-cols-3 gap-3.5">
                      <div className="bg-[#161822] border border-[#262a3c] rounded-xl p-4 text-center shadow-inner">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">PARTIDAS</div>
                        <div className="text-3xl font-black text-white">{expMatches.length}</div>
                        <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">Disputadas</div>
                      </div>
                      <div className="bg-[#161822] border border-[#262a3c] rounded-xl p-4 text-center shadow-inner">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">WIN RATE</div>
                        <div className={cn("text-3xl font-black", expWr >= 50 ? "text-emerald-400" : "text-red-400")}>
                          {expWr}%
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">Aproveitamento</div>
                      </div>
                      <div className="bg-[#161822] border border-[#262a3c] rounded-xl p-4 text-center shadow-inner">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">PLACAR</div>
                        <div className="text-3xl font-black text-white">
                          <span className="text-emerald-400">{expWins}</span><span className="text-zinc-600 mx-1">-</span><span className="text-red-400">{expLosses}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 mt-0.5">V - D</div>
                      </div>
                    </div>

                    {/* Barra Sequencial de Desempenho */}
                    <div className="relative z-10 bg-[#161822] border border-[#262a3c] rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-indigo-400" /> Linha do Treino
                        </span>
                        <span className="text-zinc-300 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">{expWins}V</span> / <span className="text-red-400 font-bold">{expLosses}D</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 h-3 rounded-full overflow-hidden bg-[#0d0e14] p-0.5 border border-[#232738]">
                        {expMatches.map((m, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "h-full flex-1 rounded-sm transition-all", 
                              m.result === 'victory' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                            )} 
                          />
                        ))}
                      </div>
                    </div>

                    {/* Atletas Escalados */}
                    {expPlayers.length > 0 && (
                      <div className="relative z-10 bg-[#161822] border border-[#262a3c] rounded-xl p-4">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" /> Atletas Escalados ({expPlayers.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {expPlayers.map(pl => (
                            <span key={pl.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1f2333] border border-[#2e344a] rounded-lg text-xs font-bold text-zinc-200 whitespace-nowrap shrink-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 shrink-0" />
                              <span className="leading-none">{pl.nickname || pl.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Partidas do Treino */}
                    <div className="relative z-10 space-y-4 pt-1">
                      <div className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Swords className="w-4 h-4 text-indigo-400" /> Histórico de Partidas ({expMatches.length})
                      </div>

                      <div className="space-y-3.5">
                        {expMatches.map((m, idx) => {
                          const map = mapsMap[m.map_id];
                          const mPicks = picks.filter(p => p.match_id === m.id);
                          const mBans = bans.filter(b => b.match_id === m.id);
                          const tbkP = mPicks.filter(p => p.team === 'tbk');
                          const enmP = mPicks.filter(p => p.team === 'enemy');
                          const tbkB = mBans.filter(b => b.team === 'tbk');
                          const enmB = mBans.filter(b => b.team === 'enemy');
                          const mDate = parseTs(m.match_date);

                          return (
                            <div 
                              key={m.id} 
                              className={cn(
                                "border rounded-xl p-4.5 space-y-3.5 bg-[#141620] transition-all",
                                m.result === 'victory'
                                  ? 'border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                                  : 'border-red-500/30 shadow-sm shadow-red-500/5'
                              )}
                            >
                              {/* Header da Partida */}
                              <div className="flex justify-between items-center pb-2.5 border-b border-[#232738] flex-nowrap gap-2">
                                <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
                                  <span className="text-xs font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 whitespace-nowrap shrink-0">
                                    Jogo #{idx + 1}
                                  </span>
                                  <span className="font-bold text-sm text-white whitespace-nowrap">{map?.name || 'Mapa Desconhecido'}</span>
                                  {map?.mode && (
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#1f2333] text-zinc-300 font-semibold border border-[#2e344a] whitespace-nowrap shrink-0">
                                      {map.mode}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
                                  <span className="text-[11px] text-zinc-400 font-mono whitespace-nowrap">{mDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                  <span className={cn(
                                    "text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0",
                                    m.result === 'victory' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  )}>
                                    {m.result === 'victory' ? 'Vitória' : 'Derrota'}
                                  </span>
                                </div>
                              </div>

                              {/* Picks e Bans Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                                {/* Time TBK */}
                                <div className="bg-[#191c28] rounded-xl p-3.5 border border-[#2b3044]">
                                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-indigo-400" /> Nossa Composição</span>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">TBK</span>
                                  </div>
                                  
                                  {/* Picks TBK */}
                                  <div className="flex gap-2.5 flex-wrap">
                                    {tbkP.length > 0 ? tbkP.map((p, i) => {
                                      const b = brawlersMap[p.brawler_id];
                                      const player = p.player_id ? playersMap[p.player_id] : null;
                                      return b ? (
                                        <div key={i} className="flex flex-col items-center gap-1 w-16 bg-[#13151f] p-1.5 rounded-lg border border-[#232738]">
                                          <img crossOrigin="anonymous" src={b.imageUrl || b.iconUrl} alt={b.name} className="w-10 h-10 rounded-md object-cover border border-[#2e344a] bg-zinc-900" />
                                          <span className="text-[9px] font-bold text-zinc-200 truncate w-full text-center">{b.name}</span>
                                          {player && (
                                            <span className="text-[8px] font-black text-indigo-400 truncate w-full text-center bg-indigo-500/10 px-1 rounded">
                                              {player.nickname || player.name}
                                            </span>
                                          )}
                                        </div>
                                      ) : null;
                                    }) : <span className="text-xs text-zinc-500 italic">—</span>}
                                  </div>

                                  {/* Bans TBK */}
                                  {tbkB.length > 0 && (
                                    <div className="mt-3 pt-2.5 border-t border-[#232738] flex items-center gap-2">
                                      <div className="text-[9px] font-black text-red-400 uppercase flex items-center gap-1"><Ban className="w-3 h-3" /> Bans:</div>
                                      <div className="flex gap-1.5">
                                        {tbkB.map((ban, i) => {
                                          const b = brawlersMap[ban.brawler_id];
                                          return b ? (
                                            <div key={i} className="relative w-6 h-6 rounded overflow-hidden border border-red-500/40 opacity-75">
                                              <img crossOrigin="anonymous" src={b.imageUrl || b.iconUrl} alt={b.name} title={b.name} className="w-full h-full object-cover grayscale" />
                                              <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center"><X className="w-3 h-3 text-red-300" /></div>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Time Inimigo */}
                                <div className="bg-[#191c28] rounded-xl p-3.5 border border-[#2b3044]">
                                  <div className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-red-400" /> Composição Inimiga</span>
                                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px]">Adversário</span>
                                  </div>

                                  {/* Picks Inimigo */}
                                  <div className="flex gap-2.5 flex-wrap">
                                    {enmP.length > 0 ? enmP.map((p, i) => {
                                      const b = brawlersMap[p.brawler_id];
                                      return b ? (
                                        <div key={i} className="flex flex-col items-center gap-1 w-16 bg-[#13151f] p-1.5 rounded-lg border border-[#232738]">
                                          <img crossOrigin="anonymous" src={b.imageUrl || b.iconUrl} alt={b.name} className="w-10 h-10 rounded-md object-cover border border-[#2e344a] bg-zinc-900" />
                                          <span className="text-[9px] font-bold text-zinc-200 truncate w-full text-center">{b.name}</span>
                                          <span className="text-[8px] text-zinc-500 font-semibold truncate w-full text-center">Inimigo</span>
                                        </div>
                                      ) : null;
                                    }) : <span className="text-xs text-zinc-500 italic">—</span>}
                                  </div>

                                  {/* Bans Inimigo */}
                                  {enmB.length > 0 && (
                                    <div className="mt-3 pt-2.5 border-t border-[#232738] flex items-center gap-2">
                                      <div className="text-[9px] font-black text-red-400 uppercase flex items-center gap-1"><Ban className="w-3 h-3" /> Bans:</div>
                                      <div className="flex gap-1.5">
                                        {enmB.map((ban, i) => {
                                          const b = brawlersMap[ban.brawler_id];
                                          return b ? (
                                            <div key={i} className="relative w-6 h-6 rounded overflow-hidden border border-red-500/40 opacity-75">
                                              <img crossOrigin="anonymous" src={b.imageUrl || b.iconUrl} alt={b.name} title={b.name} className="w-full h-full object-cover grayscale" />
                                              <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center"><X className="w-3 h-3 text-red-300" /></div>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rodapé da Folha */}
                    <div className="relative z-10 pt-5 border-t border-[#232738] flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Gerado via TBK Hub — Sistema de Draft Brawl Stars
                      </span>
                      <span className="text-zinc-500">Documento Oficial de Treino</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal com Botões de Exportação */}
              <div className="p-5 border-t border-zinc-100 dark:border-[#2A2A2A] flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-zinc-400">Escolha o formato para exportação do documento:</span>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleExportImage('png')}
                    disabled={!exportSession || isExporting}
                    className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileImage className="w-3.5 h-3.5 text-emerald-500" /> Baixar PNG
                  </button>
                  <button
                    onClick={() => handleExportImage('jpg')}
                    disabled={!exportSession || isExporting}
                    className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileImage className="w-3.5 h-3.5 text-blue-500" /> Baixar JPG
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={!exportSession || isExporting}
                    className="flex-1 sm:flex-none px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" /> {isExporting ? 'Gerando...' : 'Baixar PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MATCH DETAILS MODAL */}
      {selectedMatchForDetails && (() => {
        const match = selectedMatchForDetails;
        const map = mapsMap[match.map_id];
        const mDate = parseTs(match.match_date);
        
        const matchPicks = picks.filter(p => p.match_id === match.id);
        const matchBans = bans.filter(b => b.match_id === match.id);
        
        const tbkPicks = matchPicks.filter(p => p.team === 'tbk');
        const enemyPicks = matchPicks.filter(p => p.team === 'enemy');
        const tbkBans = matchBans.filter(b => b.team === 'tbk');
        const enemyBans = matchBans.filter(b => b.team === 'enemy');

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchForDetails(null)}>
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    Detalhes da Partida
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {mDate.toLocaleDateString()} às {mDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • 
                    <span className={cn("ml-2 font-bold", match.result === 'victory' ? "text-emerald-500" : "text-red-500")}>
                      {match.result === 'victory' ? 'VITÓRIA' : 'DERROTA'}
                    </span>
                  </p>
                </div>
                <button onClick={() => setSelectedMatchForDetails(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Map Section */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {map?.imageUrl ? (
                    <img src={map.imageUrl} alt={map.name} className="w-full sm:w-48 h-32 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800 flex-shrink-0" />
                  ) : (
                    <div className="w-full sm:w-48 h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                      <MapIcon className="w-8 h-8 text-zinc-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Mapa Jogado</div>
                    <h4 className="text-xl font-bold text-zinc-900 dark:text-white">{map ? map.name : 'Mapa Desconhecido'}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold uppercase">{map?.mode}</span>
                      {map?.terrain && (
                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-xs font-bold uppercase">Terreno {map.terrain}</span>
                      )}
                    </div>
                    {match.opponent_name && match.opponent_name !== 'Inimigo' && (
                       <div className="mt-4 text-sm">
                         <span className="text-zinc-500">Adversário: </span>
                         <span className="font-bold text-zinc-900 dark:text-white">{match.opponent_name}</span>
                       </div>
                    )}
                  </div>
                </div>

                {/* Draft Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* TBK Team */}
                  <div className="bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4">
                    <h5 className="font-bold text-indigo-600 dark:text-indigo-400 mb-4 border-b border-indigo-100 dark:border-indigo-500/20 pb-2 flex items-center justify-between">
                      Nossa Composição
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">TBK</span>
                    </h5>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Picks ({tbkPicks.length})</div>
                        <div className="flex gap-2 flex-wrap">
                          {tbkPicks.length > 0 ? tbkPicks.map((p, i) => {
                            const b = brawlersMap[p.brawler_id];
                            const player = p.player_id ? playersMap[p.player_id] : null;
                            return b ? (
                              <div key={i} className="flex flex-col items-center gap-1 w-12 sm:w-16">
                                <img src={b.imageUrl || b.iconUrl} alt={b.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" />
                                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate w-full text-center" title={b.name}>{b.name}</span>
                                {player && <span className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 truncate w-full text-center" title={player.nickname || player.name}>{player.nickname || player.name}</span>}
                              </div>
                            ) : null;
                          }) : <span className="text-xs text-zinc-500 italic">Sem picks salvos</span>}
                        </div>
                      </div>
                      
                      {tbkBans.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Nossos Bans</div>
                          <div className="flex gap-2 flex-wrap">
                            {tbkBans.map((ban, i) => {
                              const b = brawlersMap[ban.brawler_id];
                              return b ? (
                                <div key={i} className="relative w-8 h-8 sm:w-10 sm:h-10 opacity-70 grayscale hover:grayscale-0 transition-all">
                                  <img src={b.imageUrl || b.iconUrl} alt={b.name} className="w-full h-full rounded border border-red-500/30 object-cover" title={b.name} />
                                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                    <X className="w-4 h-4 text-red-500" />
                                  </div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enemy Team */}
                  <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-xl p-4">
                    <h5 className="font-bold text-red-600 dark:text-red-400 mb-4 border-b border-red-100 dark:border-red-500/20 pb-2 flex items-center justify-between">
                      Composição Inimiga
                      <span className="text-[10px] bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded text-red-600 dark:text-red-400">Inimigo</span>
                    </h5>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Picks ({enemyPicks.length})</div>
                        <div className="flex gap-2 flex-wrap">
                          {enemyPicks.length > 0 ? enemyPicks.map((p, i) => {
                            const b = brawlersMap[p.brawler_id];
                            return b ? (
                              <div key={i} className="flex flex-col items-center gap-1 w-12 sm:w-16">
                                <img src={b.imageUrl || b.iconUrl} alt={b.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" />
                                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate w-full text-center" title={b.name}>{b.name}</span>
                              </div>
                            ) : null;
                          }) : <span className="text-xs text-zinc-500 italic">Sem picks salvos</span>}
                        </div>
                      </div>
                      
                      {enemyBans.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Bans Inimigos</div>
                          <div className="flex gap-2 flex-wrap">
                            {enemyBans.map((ban, i) => {
                              const b = brawlersMap[ban.brawler_id];
                              return b ? (
                                <div key={i} className="relative w-8 h-8 sm:w-10 sm:h-10 opacity-70 grayscale hover:grayscale-0 transition-all">
                                  <img src={b.imageUrl || b.iconUrl} alt={b.name} className="w-full h-full rounded border border-red-500/30 object-cover" title={b.name} />
                                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                    <X className="w-4 h-4 text-red-500" />
                                  </div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}