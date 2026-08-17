import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DraftWizard } from './components/draft/DraftWizard';
import { Menu, Loader2, Swords } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { Dashboard } from './components/dashboard/Dashboard';
import { TrainingHistory } from './components/dashboard/TrainingHistory';
import { PlayersHub } from './components/players/PlayersHub';
import { MapsHub } from './components/maps/MapsHub';
import { BrawlersHub } from './components/brawlers/BrawlersHub';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { LockScreen, hasActiveSession, clearSession, getUserRole, UserRole } from './components/LockScreen';

const ACTIVE_TAB_KEY = 'tbk_hub_active_tab';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasActiveSession());
  const [userRole, setUserRole] = useState<UserRole>(() => getUserRole());
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Item 2: Restaura a última tela aberta do localStorage ao recarregar a página
  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_TAB_KEY) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  
  // Global listener for ESC and Ctrl+Z on search inputs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && (active.type === 'text' || active.type === 'search')) {
        const isSearchField = active.placeholder.toLowerCase().includes('buscar') || active.placeholder.toLowerCase().includes('pesquisar') || active.type === 'search' || active.placeholder.toLowerCase().includes('ban');
        
        if (e.key === 'Escape' || (isSearchField && (e.ctrlKey || e.metaKey) && e.key === 'z')) {
          e.preventDefault();
          e.stopPropagation();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(active, '');
            const event = new Event('input', { bubbles: true });
            active.dispatchEvent(event);
          }
        }
      }
    };
    // Use capture phase to intercept before React synthetic events if needed
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, []);

  const handleViewChange = (view: string) => {
    setIsViewLoading(true);
    setCurrentView(view);
    setIsSidebarOpen(false);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, view);
    } catch (e) {
      console.warn('Erro ao salvar aba ativa no localStorage:', e);
    }
    setTimeout(() => {
      setIsViewLoading(false);
    }, 400);
  };

  const handleAuthenticated = (role: UserRole) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    clearSession();
    setIsAuthenticated(false);
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-20 h-20 bg-[#FF3366] rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(255,51,102,0.4)] animate-pulse">
            <Swords className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FFCC00] rounded-full flex items-center justify-center shadow-lg">
            <span className="text-[10px] font-black text-black">T</span>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">TBK <span className="text-[#FFCC00]">Hub</span></h1>
          <p className="text-zinc-600 text-sm mt-1">Sistema de Draft · Brawl Stars</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#FF3366]"
              style={{ animation: `bounce 0.9s ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LockScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 overflow-hidden relative">
      <Sidebar
        currentView={currentView}
        onChangeView={handleViewChange}
        onLogout={requestLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={userRole}
      />

      <main className="flex-1 flex flex-col w-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-[#2A2A2A] bg-white dark:bg-[#121212]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-zinc-900 dark:text-white tracking-tight">TBK Hub</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <div className="hidden md:flex justify-end mb-4">
              <ThemeToggle />
            </div>

            {isViewLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-95 duration-300">
                <Loader2 className="w-12 h-12 text-[#FF3366] animate-spin mb-4" />
                <span className="text-slate-500 dark:text-zinc-500 font-medium">Carregando módulo...</span>
              </div>
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <div className="w-full max-w-full">
                    <Dashboard />
                  </div>
                )}
                {currentView === 'draft' && (
                  <div className="w-full max-w-full">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Assistente de Draft</h2>
                    <DraftWizard />
                  </div>
                )}
                {currentView === 'players' && (
                  <div className="w-full max-w-full">
                    <PlayersHub userRole={userRole} />
                  </div>
                )}
                {currentView === 'maps' && (
                  <div className="w-full max-w-full">
                    <MapsHub userRole={userRole} />
                  </div>
                )}
                {currentView === 'brawlers' && (
                  <div className="w-full max-w-full">
                    <BrawlersHub userRole={userRole} />
                  </div>
                )}
                {currentView === 'history' && (
                  <div className="w-full max-w-full">
                    <TrainingHistory />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Sair do Sistema"
        message="Tem certeza que deseja sair do TBK Hub?"
        confirmText="Sim, Sair"
        cancelText="Cancelar"
        processingText="Aguarde..."
        successText="Deslogado com sucesso!"
        variant="danger"
        delayMs={3000}
      />
    </div>
  );
}
