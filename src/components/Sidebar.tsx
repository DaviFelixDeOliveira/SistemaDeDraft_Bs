import React, { useRef, useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  Swords, 
  LogOut,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Upload,
  History,
  Shield,
  User as UserIcon,
  Save,
  Clock,
  FileJson,
  Database,
  PanelLeft,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from './LockScreen';
import { backupRestoreService, BackupSnapshotInfo, FullBackupPayload } from '../services/backupRestoreService';
import { ConfirmModal } from './ui/ConfirmModal';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

export function Sidebar({ currentView, onChangeView, onLogout, isOpen, onClose, userRole }: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tbk_hub_sidebar_collapsed') === 'true';
    }
    return false;
  });
  
  const [snapshotInfo, setSnapshotInfo] = useState<BackupSnapshotInfo | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    action: (() => Promise<void>) | null;
    title: string;
    message: string;
    processingText: string;
    successText: string;
    confirmText?: string;
    variant?: 'primary' | 'danger';
  }>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    processingText: '',
    successText: ''
  });

  // Persistir isCollapsed no localStorage
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('tbk_hub_sidebar_collapsed', String(next));
      return next;
    });
  };

  const loadSnapshotInfo = async () => {
    const info = await backupRestoreService.getLatestSnapshotInfo();
    setSnapshotInfo(info);
  };

  useEffect(() => {
    if (userRole === 'admin') {
      loadSnapshotInfo();
    }
  }, [userRole]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'draft', label: 'Draft', icon: Swords },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'maps', label: 'Mapas & Modos', icon: MapIcon },
    { id: 'brawlers', label: 'Brawlers & Estatísticas', icon: Target },
    { id: 'history', label: 'Histórico de Treinos', icon: History },
  ];

  // ── 1. Salvar Backup (sem baixar arquivo) ─────────────────────────────────
  const handleSaveBackup = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Salvar Snapshot de Backup',
      message: 'Deseja salvar um novo snapshot completo do estado atual do sistema no banco de dados Supabase?\nEste snapshot poderá ser restaurado a qualquer momento com 1 clique.',
      processingText: 'Salvando snapshot no banco...',
      successText: 'Snapshot de backup salvo com sucesso!',
      confirmText: 'Salvar Snapshot',
      variant: 'primary',
      action: async () => {
        const res = await backupRestoreService.saveSnapshotToDatabase();
        if (res.success) {
          await loadSnapshotInfo();
        } else {
          alert(res.message);
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ── 2. Baixar Arquivo JSON ────────────────────────────────────────────────
  const handleDownloadBackup = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Baixar Backup JSON',
      message: 'Deseja gerar e baixar um arquivo .json com todos os dados atuais do sistema para guardá-lo fora da plataforma?',
      processingText: 'Gerando arquivo de backup...',
      successText: 'Arquivo de backup baixado!',
      confirmText: 'Baixar .JSON',
      variant: 'primary',
      action: async () => {
        await backupRestoreService.exportBackupJSON();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ── 3. Restaurar do Snapshot Salvo no Banco ──────────────────────────────
  const handleRestoreFromSnapshot = async () => {
    setIsRestoreModalOpen(false);

    const info = snapshotInfo || await backupRestoreService.getLatestSnapshotInfo();
    if (!info || !info.payload) {
      alert('Nenhum snapshot de backup salvo foi encontrado no banco.');
      return;
    }

    const currentMatches = await backupRestoreService.getCurrentMatchCount();
    const backupMatches = info.matchCount;
    const diff = currentMatches - backupMatches;

    let diffText = '';
    if (diff > 0) {
      diffText = `Você tem ${currentMatches} partidas registradas agora. O backup salvo tem ${backupMatches} partidas (${diff} partidas mais recentes serão APAGADAS).`;
    } else if (diff < 0) {
      diffText = `Você tem ${currentMatches} partidas registradas agora. O backup salvo tem ${backupMatches} partidas (${Math.abs(diff)} partidas adicionais serão RECUPERADAS).`;
    } else {
      diffText = `Ambos possuem ${currentMatches} partidas registradas. Os dados atuais serão substituídos pelo snapshot.`;
    }

    const dateStr = info.savedAt ? new Date(info.savedAt).toLocaleString() : 'Recente';

    setConfirmConfig({
      isOpen: true,
      title: 'Restaurar do Último Snapshot Salvo',
      message: `⚠️ ATENÇÃO EXTREMA: Esta ação é DESTRUTIVA!\n\n${diffText}\n\nData do snapshot: ${dateStr}.\nDeseja prosseguir com a restauração?`,
      processingText: 'Restaurando o snapshot salvo...',
      successText: 'Sistema restaurado do snapshot!',
      confirmText: 'Confirmar Restauração',
      variant: 'danger',
      action: async () => {
        const res = await backupRestoreService.restoreFromLatestSnapshot();
        if (res.success) {
          window.location.reload();
        } else {
          alert(res.message);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ── 4. Restaurar de Arquivo .JSON Manual ────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoreModalOpen(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const payload: FullBackupPayload = JSON.parse(content);
          const currentMatches = await backupRestoreService.getCurrentMatchCount();
          const backupMatches = payload.data?.matches?.length || 0;
          const diff = currentMatches - backupMatches;

          let diffText = '';
          if (diff > 0) {
            diffText = `Você tem ${currentMatches} partidas registradas agora. O arquivo enviado tem ${backupMatches} partidas (${diff} partidas serão APAGADAS).`;
          } else if (diff < 0) {
            diffText = `Você tem ${currentMatches} partidas registradas agora. O arquivo enviado tem ${backupMatches} partidas (${Math.abs(diff)} partidas adicionais serão RECUPERADAS).`;
          } else {
            diffText = `Ambos possuem ${currentMatches} partidas. Os dados serão substituídos pelo arquivo enviado.`;
          }

          setConfirmConfig({
            isOpen: true,
            title: 'Restaurar de Arquivo JSON',
            message: `⚠️ ATENÇÃO EXTREMA: Esta ação é DESTRUTIVA!\n\n${diffText}\n\nDeseja prosseguir com a restauração do arquivo ${file.name}?`,
            processingText: 'Apagando dados atuais e aplicando backup do arquivo...',
            successText: 'Banco de dados restaurado com sucesso!',
            confirmText: 'Restaurar do Arquivo',
            variant: 'danger',
            action: async () => {
              const res = await backupRestoreService.importBackupJSON(content);
              if (res.success) {
                window.location.reload();
              } else {
                alert(res.message);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              }
            }
          });
        } catch (err: any) {
          alert('Arquivo JSON inválido.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatSnapshotDate = (isoStr: string | null) => {
    if (!isoStr) return 'Nenhum snapshot salvo';
    try {
      let ts = isoStr;
      if (!/[Zz]$/.test(ts) && !/[+-]\d{2}:\d{2}$/.test(ts)) {
        ts += 'Z';
      }
      const d = new Date(ts);
      return `${d.toLocaleDateString()} às ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Data indisponível';
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn("cursor-pointer touch-manipulation", 
        "fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-[#121212] border-r border-zinc-200 dark:border-[#2A2A2A] h-screen flex flex-col transform transition-all duration-300 ease-in-out",
        isCollapsed ? "w-64 md:w-20" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* ═══ HEADER ═══ */}
        <div className={cn("p-5 flex items-center border-b border-zinc-100 dark:border-[#222] transition-all", isCollapsed ? "justify-center" : "justify-between")}>
          {isCollapsed ? (
            /* Modo Compacto: Estilo Gemini - Logo vira botão com ícone de abrir ao passar o mouse */
            <button
              onClick={toggleCollapse}
              className="hidden md:flex group relative w-10 h-10 rounded-xl items-center justify-center bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-[#20232e] border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
              title="Abrir barra lateral"
            >
              {/* Logo normal */}
              <div className="w-7 h-7 rounded-lg bg-[#FF3366] flex items-center justify-center shadow-[0_0_12px_rgba(255,51,102,0.4)] group-hover:hidden transition-all">
                <Swords className="w-4 h-4 text-white" />
              </div>
              {/* Ícone de Expandir (PanelLeft) visível no hover */}
              <PanelLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-200 hidden group-hover:block transition-all scale-110" />
            </button>
          ) : (
            /* Modo Expandido: Logo + Nome + Botão de Recolher na direita */
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF3366] flex items-center justify-center shadow-[0_0_15px_rgba(255,51,102,0.4)] shrink-0">
                  <Swords className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  TBK <span className="text-[#FFCC00]">Hub</span>
                </h1>
              </div>

              {/* Botão Toggle Collapse */}
              <button
                onClick={toggleCollapse}
                className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                title="Recolher barra lateral"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </>
          )}
          
          {/* Botão Fechar (mobile) */}
          <button 
            onClick={onClose} 
            className="md:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <PanelLeftClose className="w-6 h-6" />
          </button>
        </div>

        {/* ═══ NAVEGAÇÃO ═══ */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={cn("cursor-pointer touch-manipulation", 
                  "w-full flex items-center rounded-lg text-sm font-medium transition-all",
                  isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 md:gap-0 gap-3" : "gap-3 px-4 py-3",
                  isActive 
                    ? "bg-[#FF3366]/10 text-[#FF3366] shadow-[inset_2px_0_0_0_#FF3366]" 
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={cn(isCollapsed ? "md:hidden" : "")}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ═══ FOOTER ═══ */}
        <div className={cn("p-4 border-t border-zinc-200 dark:border-[#2A2A2A] space-y-3", isCollapsed && "md:p-2 md:space-y-2")}>
          
          {/* ── Badge de Nível de Acesso ── */}
          {isCollapsed ? (
            /* Modo colapsado (desktop): só ícone + title */
            <div 
              className="hidden md:flex items-center justify-center py-2"
              title={`Logado como ${userRole === 'admin' ? 'Admin' : 'Player'}`}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                userRole === 'admin' 
                  ? "bg-[#FF3366]/10 border border-[#FF3366]/20" 
                  : "bg-blue-500/10 border border-blue-500/20"
              )}>
                {userRole === 'admin' 
                  ? <Shield className="w-4 h-4 text-[#FF3366]" /> 
                  : <UserIcon className="w-4 h-4 text-blue-500" />
                }
              </div>
            </div>
          ) : null}
          
          {/* Modo expandido: badge completo (sempre visível no mobile) */}
          <div className={cn(
            "flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-[#1A1A1A] rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400",
            isCollapsed && "md:hidden"
          )}>
            <div className="flex items-center gap-2">
              {userRole === 'admin' ? (
                <Shield className="w-4 h-4 text-[#FF3366]" />
              ) : (
                <UserIcon className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-zinc-700 dark:text-zinc-300">Logado como</span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider",
              userRole === 'admin' ? "bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            )}>
              {userRole === 'admin' ? 'Admin' : 'Player'}
            </span>
          </div>

          {/* ── Seção de Backup (Admin only) ── */}
          {userRole === 'admin' && (
            <>
              {/* MODO EXPANDIDO */}
              <div className={cn("space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800", isCollapsed && "md:hidden")}>
                {/* Data do Último Backup */}
                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 px-1">
                  <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {snapshotInfo?.savedAt ? `Salvo: ${formatSnapshotDate(snapshotInfo.savedAt)}` : 'Nenhum backup salvo no banco'}
                  </span>
                </div>

                {/* Botão "Salvar Backup" */}
                <button
                  onClick={handleSaveBackup}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  title="Salva um snapshot completo no banco Supabase (sem baixar arquivo)"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Backup</span>
                </button>

                {/* Botões "Restaurar" e "Baixar .JSON" */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsRestoreModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                    title="Opções de restauração de backup"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Restaurar
                  </button>
                  <button 
                    onClick={handleDownloadBackup}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                    title="Baixar arquivo JSON com backup completo"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar .JSON
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleFileChange}
                />
              </div>

              {/* MODO COLAPSADO (desktop) — ícones empilhados */}
              <div className={cn("hidden pt-1 border-t border-zinc-200/60 dark:border-zinc-800 space-y-1", isCollapsed && "md:block")}>
                <button
                  onClick={handleSaveBackup}
                  className="w-full flex items-center justify-center p-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-all"
                  title="Salvar Backup no Supabase"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsRestoreModalOpen(true)}
                  className="w-full flex items-center justify-center p-2.5 rounded-lg bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] text-zinc-700 dark:text-zinc-300 transition-colors"
                  title="Restaurar Backup"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadBackup}
                  className="w-full flex items-center justify-center p-2.5 rounded-lg bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] text-zinc-700 dark:text-zinc-300 transition-colors"
                  title="Baixar Backup .JSON"
                >
                  <Download className="w-4 h-4" />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleFileChange}
                />
              </div>
            </>
          )}

          {/* ── Botão Sair ── */}
          <button 
            onClick={onLogout}
            title={isCollapsed ? "Sair do Sistema" : undefined}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors",
              isCollapsed ? "md:px-0 md:py-2.5 px-4 py-2" : "px-4 py-2"
            )}
          >
            <LogOut className="w-5 h-5" />
            <span className={cn(isCollapsed && "md:hidden")}>Sair do Sistema</span>
          </button>
        </div>
      </div>

      {/* Modal de Escolha do Tipo de Restauração */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsRestoreModalOpen(false)}>
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" /> Escolha como deseja Restaurar
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Selecione a origem dos dados para a restauração. Ambas as opções realizam a substituição completa dos dados atuais.
            </p>

            <div className="space-y-3 pt-2">
              {/* Opção 1: Do último backup salvo */}
              <button
                onClick={handleRestoreFromSnapshot}
                className="w-full text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1A1A1A] hover:border-indigo-500 transition-all flex items-start gap-3 group"
              >
                <Database className="w-5 h-5 text-indigo-500 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-white">Restaurar do último backup salvo</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {snapshotInfo?.savedAt ? `Snapshot de ${formatSnapshotDate(snapshotInfo.savedAt)} (${snapshotInfo.matchCount} partidas)` : 'Nenhum snapshot salvo disponível no banco.'}
                  </div>
                </div>
              </button>

              {/* Opção 2: De um arquivo .JSON */}
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1A1A1A] hover:border-indigo-500 transition-all flex items-start gap-3 group"
              >
                <FileJson className="w-5 h-5 text-indigo-500 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-white">Restaurar de um arquivo (.JSON)</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Selecione um arquivo .json de backup salvo manualmente em sua máquina.</div>
                </div>
              </button>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação das Ações de Backup/Restauração */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        processingText={confirmConfig.processingText}
        successText={confirmConfig.successText}
        onConfirm={async () => {
          if (confirmConfig.action) {
            await confirmConfig.action();
          }
        }}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant={confirmConfig.variant || (confirmConfig.title.includes('Restaurar') || confirmConfig.title.includes('Sair') ? 'danger' : 'primary')}
        confirmText={confirmConfig.confirmText || (confirmConfig.title.includes('Restaurar') ? 'Restaurar Dados' : confirmConfig.title.includes('Sair') ? 'Sair' : 'Confirmar')}
      />
    </>
  );
}
