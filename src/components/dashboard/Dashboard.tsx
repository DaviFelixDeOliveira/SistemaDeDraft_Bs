import { getBrawlerBgColor } from "../../lib/utils";
import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { mapService } from '../../services/mapService';
import { Trophy, Swords, XCircle, Activity, Map as MapIcon, Flame, Shield, Crosshair, Loader2, Eye, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CustomTooltip } from "../ui/CustomTooltip";
import { AreaChart, LabelList, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Composition } from '../../types';
import { ErrorBoundary } from '../ErrorBoundary';

function DashboardContent() {

  const CustomBrawlerTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white shadow-xl min-w-[150px]">
          <p className="font-bold mb-2 border-b border-[#2A2A2A] pb-2 text-sm">{label || data.name}</p>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-zinc-400">Picks (Nós)</span>
              </span>
              <span className="font-bold text-blue-500">{data.tbkPickCount}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-zinc-400">Bans (Geral)</span>
              </span>
              <span className="font-bold text-red-500">{data.ban}</span>
            </div>
            <div className="flex justify-between items-center gap-4 mt-1 border-t border-[#2A2A2A] pt-1">
              <span className="text-zinc-400 text-xs">Winrate (Nós)</span>
              <span className={cn("font-bold text-xs", data.winrate >= 50 ? "text-emerald-500" : "text-red-500")}>{data.winrate}%</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-zinc-400 text-xs">Vitórias / Derrotas</span>
              <span className="font-bold text-xs"><span className="text-emerald-500">{data.tbkWins}V</span> - <span className="text-red-500">{data.tbkLosses}D</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    // Usa os dados já carregados do Supabase via brawlerStats
    const brawler = (brawlerStats || []).find((b: any) => b?.name === payload.value);

    return (
      <g transform={`translate(${x},${y})`}>
        {(brawler?.iconUrl || brawler?.imageUrl) ? (
          <image href={brawler.iconUrl || brawler.imageUrl} x={-12} y={0} height={24} width={24} clipPath="inset(0% round 4px)" />
        ) : (
          <text x={0} y={15} dy={0} textAnchor="middle" fill="#52525B" fontSize={10}>
            {payload.value}
          </text>
        )}
      </g>
    );
  };
  const [stats, setStats] = useState({ totalMatches: 0, wins: 0, losses: 0, winrate: 0 });
  const [hoveredMode, setHoveredMode] = useState<any>(null);
  const [mapPerformance, setMapPerformance] = useState<any[]>([]);
  const [weeklyWinrate, setWeeklyWinrate] = useState<any[]>([]);
  const [modeWinrate, setModeWinrate] = useState<any[]>([]);
  const [brawlerStats, setBrawlerStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapAlerts, setMapAlerts] = useState<any[]>([]);
  const [isBansModalOpen, setIsBansModalOpen] = useState(false);
  const [bansSortOrder, setBansSortOrder] = useState<"mais" | "menos">("mais");
  const [selectedComposition, setSelectedComposition] = useState<any | null>(null);
  const [selectedHotBrawler, setSelectedHotBrawler] = useState<any | null>(null);
  const [selectedMapImage, setSelectedMapImage] = useState<string | null>(null);

  // Bans Tabs State
  const [activeBanTab, setActiveBanTab] = useState<'geral' | 'tbk' | 'enemy'>('geral');
  const [isLoadingBans, setIsLoadingBans] = useState(false);
  const [activeTimeFilter, setActiveTimeFilter] = useState<'Última Semana' | 'Último Mês' | 'Geral'>('Geral');
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const [hotBrawlerDetails, setHotBrawlerDetails] = useState<any>(null);
  const [mapDetailStatsMap, setMapDetailStatsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [s, mPerf, wWr, mWr, bStats, alerts] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getMapPerformance(),
        analyticsService.getWeeklyWinrate(),
        analyticsService.getWinrateByMode(),
        analyticsService.getBrawlerStats(),
        analyticsService.getMapRotationAlerts(5)
      ]);
      setStats(s);
      setMapPerformance(mPerf);
      setWeeklyWinrate(wWr);
      setModeWinrate(mWr);
      setBrawlerStats(bStats);
      setMapAlerts(alerts);
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedHotBrawler) {
      analyticsService.getBrawlerDetailStats(selectedHotBrawler.id).then(setHotBrawlerDetails);
    } else {
      setHotBrawlerDetails(null);
    }
  }, [selectedHotBrawler]);

  useEffect(() => {
    if (selectedMode) {
      const modeMaps = mapPerformance.filter(m => m?.map?.mode === selectedMode);
      Promise.all(modeMaps.map(m => analyticsService.getMapDetailStats(m.map.id))).then(results => {
        const statsMap: Record<string, any> = {};
        modeMaps.forEach((m, idx) => {
          statsMap[m.map.id] = results[idx];
        });
        setMapDetailStatsMap(statsMap);
      });
    }
  }, [selectedMode, mapPerformance]);

  // Ordena por quantidade de picks (TBK) primeiro, e desempata por Winrate (P1-4)
  const activeHotBrawlers = (brawlerStats || [])
    .filter(b => (b.tbkPickCount || b.pick || 0) > 0)
    .sort((a, b) => {
      const picksA = a.tbkPickCount || a.pick || 0;
      const picksB = b.tbkPickCount || b.pick || 0;
      if (picksB !== picksA) return picksB - picksA;
      return b.winrate - a.winrate;
    })
    .slice(0, 10);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Geral</h2>
      </div>



      {/* Alerta de Rotação de Mapas */}
      {mapAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
          <div className="flex gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-amber-600 dark:text-amber-400 font-bold text-lg leading-none mt-0.5">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Aviso de Rotação de Mapas</h4>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                O mapa <strong>"{mapAlerts[0].map.name}"</strong> ({mapAlerts[0].map.mode}) não é treinado há {mapAlerts[0].daysSince === Infinity ? 'muito tempo' : `${mapAlerts[0].daysSince} dias`}. Considere incluí-lo na próxima scrim.
                {mapAlerts.length > 1 && ` (E mais ${mapAlerts.length - 1} mapas inativos).`}
              </p>
            </div>
          </div>
          {mapAlerts[0].map.imageUrl && (
            <div
              className="relative group shrink-0 self-center sm:self-auto cursor-pointer rounded-lg overflow-hidden border border-amber-200 dark:border-amber-500/20 shadow-sm"
              onClick={() => setSelectedMapImage(mapAlerts[0].map.imageUrl)}
            >
              <img src={mapAlerts[0].map.imageUrl} alt={mapAlerts[0].map.name} className="w-24 h-16 sm:w-32 sm:h-20 object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* A) Top Cards (KPIs) - 2 cols mobile, 4 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className={cn(
          "bg-white dark:bg-[#121212] border rounded-xl p-4 sm:p-5 shadow-sm transition-all relative overflow-hidden",
          stats.winrate >= 60 ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-200 dark:border-[#2A2A2A]"
        )}>
          {stats.winrate >= 60 && <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full" />}
          <div className="flex items-center gap-2 mb-2">
            <Trophy className={cn("w-4 h-4 sm:w-5 sm:h-5", stats.winrate >= 60 ? "text-emerald-500" : "text-slate-500 dark:text-zinc-400")} />
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Taxa de Vitória</span>
          </div>
          <div className={cn("text-2xl sm:text-4xl font-black", stats.winrate >= 60 ? "text-emerald-500" : "text-slate-900 dark:text-white")}>
            {stats.winrate}%
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Partidas</span>
          </div>
          <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">{stats.totalMatches}</div>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Vitórias</span>
          </div>
          <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">{stats.wins}</div>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Derrotas</span>
          </div>
          <div className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">{stats.losses}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* B) Desempenho por Modo */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FF3366]" /> Desempenho por Modo
          </h3>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
            {(modeWinrate || []).map((item) => {
              const wr = item.winrate !== undefined ? item.winrate : (item.value || 0);
              const textWrColor = wr > 50 ? "text-emerald-500" : wr >= 30 ? "text-amber-500" : "text-red-500 font-black";
              const barWrColor = wr > 50 ? "bg-emerald-500" : wr >= 30 ? "bg-amber-500" : "bg-red-500";
              return (
                <div
                  key={item.mode || item?.name}
                  onClick={() => setSelectedMode(item?.name)}
                  className="bg-slate-50 dark:bg-[#0A0A0A] hover:bg-slate-100 dark:hover:bg-[#1A1A1A] p-3 rounded-lg border border-slate-200 dark:border-[#2A2A2A] cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{item.mode || item?.name}</span>
                    <span className={cn("text-xs font-bold", textWrColor)}>
                      {wr.toFixed(1)}% <span className="opacity-50 text-slate-500 font-normal">({item.wins || 0}V / {(item.total || 0) - (item.wins || 0)}D)</span>
                    </span>
                  </div>
                  {/* Progress Bar linear */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out", barWrColor)}
                      style={{ width: `${item.winrate}%` }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/50 blur-[2px] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              );
            })}
            {(modeWinrate || []).length === 0 && (
              <div className="col-span-1 sm:col-span-2 text-sm text-slate-500 dark:text-zinc-400 text-center py-8">Nenhum modo registrado ainda.</div>
            )}
          </div>
        </div>

        {/* D) Central de Banimentos */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-fuchsia-500" /> Top Banimentos
            </h3>
            <div className="flex gap-2">
              {['Última Semana', 'Último Mês', 'Geral'].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTimeFilter(t as any)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-md transition-colors",
                    activeTimeFilter === t ? "bg-fuchsia-500/10 text-fuchsia-500" : "text-slate-500 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-[#1A1A1A]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-[#0A0A0A] p-1 rounded-lg mb-4">
            {['geral', 'tbk', 'enemy'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveBanTab(tab as any)}
                className={cn(
                  "flex-1 text-xs font-bold py-1.5 rounded-md transition-all duration-200",
                  activeBanTab === tab ? "bg-white dark:bg-[#2A2A2A] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                )}
              >
                {tab === 'geral' ? 'Geral' : tab === 'tbk' ? 'Nossos' : 'Inimigos'}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[250px] pr-2 relative">
            {isLoadingBans ? (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-[#2A2A2A] rounded-t-lg overflow-hidden z-20">
                <div className="h-full bg-fuchsia-500 w-1/3 animate-pulse rounded-full" style={{ animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              </div>
            ) : null}
            <div className={cn("space-y-3 transition-opacity duration-300", isLoadingBans ? "opacity-30" : "opacity-100")}>
              {(() => {
                // Seleciona o campo de ban correto baseado na aba ativa
                const banField = activeBanTab === 'tbk' ? 'tbkBan' : activeBanTab === 'enemy' ? 'enemyBan' : 'ban';
                const filtered = (brawlerStats || [])
                  .filter(b => (b[banField] || 0) > 0)
                  .sort((a, b) => (b[banField] || 0) - (a[banField] || 0))
                  .slice(0, 5);
                const maxBan = filtered.length > 0 ? (filtered[0][banField] || 1) : 1;

                if (filtered.length === 0) {
                  return <div className="text-center text-slate-500 dark:text-zinc-500 py-8 italic text-sm">Nenhum banimento registrado nesta categoria.</div>;
                }

                return filtered.map((b, i) => (
                  <div key={b?.id || b?.name} className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-slate-400 dark:text-zinc-600">#{i + 1}</span>
                    <div className="w-10 h-10 rounded-md bg-slate-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                      {(b?.imageUrl || b?.iconUrl) && (
                        <img src={b.imageUrl || b.iconUrl} alt={b?.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-900 dark:text-white">{b?.name}</span>
                        <span className="font-bold text-[#FF3366]">{b[banField]}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF3366] rounded-full"
                          style={{ width: `${((b[banField] || 0) / maxBan) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <button onClick={() => setIsBansModalOpen(true)} className="mt-4 w-full py-2 bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#2A2A2A] rounded-lg text-sm font-bold text-slate-700 dark:text-zinc-300 transition-colors">Ver Relatório Completo</button>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico de Área: Evolução Semanal */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Winrate Semanal</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyWinrate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#52525B" fontSize={12} tickLine={false} axisLine={false} tick={<CustomXAxisTick />} />
                <YAxis stroke="#52525B" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="winrate" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorWr)"><LabelList dataKey="winrate" position="top" fill="#10B981" fontSize={10} fontWeight="bold" className="block md:hidden" /></Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Rosca/Donut: Winrate por Modo */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-6 shadow-sm relative">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Winrate por Modo</h3>
          <div className="h-[250px] w-full relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {hoveredMode ? `${hoveredMode.winrate}%` : `${stats.winrate}%`}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-500 tracking-wider text-center max-w-[80px]">
                {hoveredMode ? hoveredMode?.name : 'Geral'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeWinrate}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setHoveredMode(modeWinrate[index])}
                  onMouseLeave={() => setHoveredMode(null)}
                  onClick={(_, index) => setHoveredMode(modeWinrate[index])}
                >
                  {(modeWinrate || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="name" position="outside" fontSize={10} fontWeight="bold" className="block md:hidden" />
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras: Pick vs Ban */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Top Brawlers (Picks vs Bans)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(brawlerStats || []).slice().sort((a, b) => (b.tbkPickCount || 0) - (a.tbkPickCount || 0)).slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis dataKey="name" stroke="#52525B" fontSize={12} tickLine={false} axisLine={false} tick={<CustomXAxisTick />} />
                <YAxis stroke="#52525B" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomBrawlerTooltip />} cursor={{ fill: '#2A2A2A' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="tbkPickCount" name="Nossos Picks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ban" name="Bans" fill="#FF3366" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* C) Brawlers mais escolhidos da semana */}
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" /> Brawlers mais escolhidos da semana
        </h3>
        {activeHotBrawlers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {activeHotBrawlers.map((b, i) => {
              const wr = b.winrate || 0;
              const wrColor = wr > 50
                ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                : wr >= 30
                  ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                  : "text-red-500 bg-red-500/20 border-red-500/40 font-black animate-pulse";
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedHotBrawler(b)}
                  className="bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-[#FF3366]/50 transition-colors relative"
                >
                  <span className="text-[10px] font-bold text-slate-400 absolute top-2 left-2">#{i + 1}</span>
                  <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-zinc-800 overflow-hidden mt-1">
                    {(b.iconUrl || b.imageUrl) && <img src={b.iconUrl || b.imageUrl} alt={b?.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="text-center w-full">
                    <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{b?.name}</div>
                    <div className="flex flex-col items-center justify-center gap-1 mt-2">
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border font-bold", wrColor)}>{wr}% WR</span>
                      <div className="flex flex-col items-center mt-1 text-[10px] text-slate-500 font-bold leading-none gap-0.5">
                        <span><span className="text-blue-500">{b.tbkPickCount || 0}</span> picks nossos</span>
                        <span><span className="text-red-500">{b.enemyPickCount || 0}</span> picks inimigos</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-zinc-500 text-sm italic border border-dashed border-slate-200 dark:border-[#2A2A2A] rounded-xl">
            Nenhum dado de partida registrado ainda.
          </div>
        )}
      </div>

      {/* Mode Details Modal */}
      {isBansModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-[#2A2A2A] flex justify-between items-center bg-slate-50 dark:bg-[#0A0A0A]">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-fuchsia-500" />
                  Relatório Completo de Banimentos
                </h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Análise detalhada de restrições de brawlers ({activeTimeFilter})</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-200 dark:bg-zinc-800 p-1 rounded-lg">
                  <button onClick={() => setBansSortOrder('mais')} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", bansSortOrder === 'mais' ? "bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400")}>Mais Banidos</button>
                  <button onClick={() => setBansSortOrder('menos')} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", bansSortOrder === 'menos' ? "bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400")}>Menos Banidos</button>
                </div>
                <button
                  onClick={() => setIsBansModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-white dark:bg-[#121212] flex-1 space-y-4">
              {[...brawlerStats].filter(b => b.ban > 0).sort((a, b) => bansSortOrder === 'mais' ? b.ban - a.ban : a.ban - b.ban).map((b, i) => (
                <div key={b?.name} className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-[#2A2A2A] bg-slate-50 dark:bg-[#0A0A0A]">
                  <span className="w-6 text-center text-sm font-bold text-slate-400 dark:text-zinc-600">#{i + 1}</span>
                  {(b.iconUrl || b.imageUrl) && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={b.iconUrl || b.imageUrl} alt={b?.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{b?.name}</span>
                      <span className="font-bold text-[#FF3366]">{b.ban} bans</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF3366] rounded-full" style={{ width: `${Math.min((b.ban / 10) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {[...brawlerStats].filter(b => b.ban > 0).length === 0 && (
                <div className="text-center text-slate-500 py-8 italic">Nenhum banimento registrado ainda.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedHotBrawler && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-[#2A2A2A] flex justify-between items-center bg-slate-50 dark:bg-[#0A0A0A]">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Estatísticas: {selectedHotBrawler?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedHotBrawler(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-white dark:bg-[#121212] flex-1 space-y-6">
              <div className="flex gap-4 items-center justify-center bg-slate-50 dark:bg-[#0A0A0A] p-4 rounded-xl border border-slate-200 dark:border-[#2A2A2A]">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-zinc-800 overflow-hidden border-2 border-emerald-500">
                    {(selectedHotBrawler.iconUrl || selectedHotBrawler.imageUrl) && <img src={selectedHotBrawler.iconUrl || selectedHotBrawler.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedHotBrawler?.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Partidas Jogadas</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{hotBrawlerDetails?.tbkPicksCount ?? 0}</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Taxa de Vitória</div>
                  <div className="text-2xl font-black text-emerald-500">{hotBrawlerDetails?.tbkPicksCount > 0 ? `${hotBrawlerDetails.winrate}%` : '—'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Bans por Mapa</label>
                <div className="flex flex-wrap gap-2">
                  {hotBrawlerDetails?.topMapBans && hotBrawlerDetails.topMapBans.length > 0 ? (
                    hotBrawlerDetails.topMapBans.map((mb: any, i: number) => (
                      <span key={i} className="bg-blue-500/10 text-blue-500 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-500/20">
                        {mb.mapName} ({mb.count}x)
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">Sem bans suficientes neste mapa.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Melhores Parceiros</label>
                <div className="space-y-2">
                  {hotBrawlerDetails?.partners && hotBrawlerDetails.partners.length > 0 ? (
                    hotBrawlerDetails.partners.map((partner: any) => (
                      <div key={partner.id} className="bg-slate-50 dark:bg-[#0A0A0A] p-2 rounded-lg border border-slate-200 dark:border-[#2A2A2A] text-sm text-slate-700 dark:text-zinc-300 font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded overflow-hidden">
                          {partner.iconUrl && <img src={partner.iconUrl} className="w-full h-full object-cover" />}
                        </div>
                        <span>{partner.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-1">Sem dados suficientes ainda.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Details Modal */}
      {selectedMode && (() => {
        const currentModeStats = (modeWinrate || []).find(m => m.name === selectedMode);
        const currentModeWr = currentModeStats?.winrate !== undefined ? currentModeStats.winrate : (currentModeStats?.value || 0);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-200 dark:border-[#2A2A2A] flex justify-between items-center bg-slate-50 dark:bg-[#0A0A0A]">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                    Mapas de {selectedMode}
                  </h3>
                  <div className="flex gap-4 mt-2">
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-zinc-400">WR Global: </span>
                      <span className={cn("font-bold", stats.winrate >= 60 ? "text-emerald-500" : stats.winrate >= 40 ? "text-amber-500" : "text-red-500")}>
                        {stats.winrate}%
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-zinc-400">WR {selectedMode}: </span>
                      <span className={cn("font-bold", currentModeWr >= 60 ? "text-emerald-500" : currentModeWr >= 40 ? "text-amber-500" : "text-red-500")}>
                        {currentModeWr}%
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMode(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto bg-white dark:bg-[#121212] flex-1 space-y-4">
                {(mapPerformance || []).filter(m => m?.map?.mode === selectedMode).map(item => {
                  const mStats = mapDetailStatsMap[item.map.id] || {};
                  return (
                    <div key={item.map.id} className="border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 bg-slate-50 dark:bg-[#0A0A0A] flex flex-col sm:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <MapIcon className="w-4 h-4 text-emerald-500" />
                          <h4 className="font-bold text-slate-900 dark:text-white text-lg">{item.map?.name}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                            <Trophy className="w-4 h-4 text-emerald-500" /> {mStats.wins || 0}V
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                            <XCircle className="w-4 h-4 text-red-500" /> {(mStats.totalMatches || 0) - (mStats.wins || 0)}D
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                            WR: {mStats.totalMatches > 0 ? `${mStats.winrate}%` : '0%'}
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mStats.winrate || 0}%` }} />
                        </div>
                      </div>

                      <div className="flex gap-6 sm:w-1/2">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">Top Bans</div>
                          <div className="space-y-1.5">
                            {mStats.topTotalBans && mStats.topTotalBans.length > 0 ? (
                              mStats.topTotalBans.map((tb: any, i: number) => (
                                <div key={i} className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                  <span className="w-4 text-slate-400">#{i + 1}</span> {tb.brawler?.name} ({tb.count}x)
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 italic">Sem bans ainda</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">Top Picks</div>
                          <div className="space-y-1.5">
                            {mStats.topTbkPicks && mStats.topTbkPicks.length > 0 ? (
                              mStats.topTbkPicks.map((tp: any, i: number) => (
                                <div key={i} className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                                  <span className="w-4 text-slate-400">#{i + 1}</span> {tp.brawler?.name} ({tp.picks}x)
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 italic">Sem picks ainda</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(mapPerformance || []).filter(m => m?.map?.mode === selectedMode).length === 0 && (
                  <div className="text-center text-slate-500 py-8">Nenhum mapa registrado para este modo.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedMapImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedMapImage(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-full flex items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMapImage(null)}
              className="absolute -top-12 right-0 sm:-right-12 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <img
              src={selectedMapImage}
              alt="Visualização do Mapa"
              className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
export function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
