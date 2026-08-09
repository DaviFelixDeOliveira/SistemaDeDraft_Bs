import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DraftWizard } from './components/draft/DraftWizard';
import { Menu, Loader2, Swords } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { Dashboard } from './components/dashboard/Dashboard';
import { PlayersHub } from './components/players/PlayersHub';
import { MapsHub } from './components/maps/MapsHub';
import { BrawlersHub } from './components/brawlers/BrawlersHub';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { LockScreen, hasActiveSession, clearSession } from './components/LockScreen';

export default function App() {
  // Inicializa autenticado se já houver sessão salva no localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasActiveSession());
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Splash screen: mostra apenas na primeira abertura da sessão
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleViewChange = (view: string) => {
    setIsViewLoading(true);
    setCurrentView(view);
    setIsSidebarOpen(false);
    setTimeout(() => {
      setIsViewLoading(false);
    }, 400);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    clearSession();
    setIsAuthenticated(false);
  };

  // Splash screen inicial
  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF3366] to-[#cc0033] rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(255,51,102,0.4)] animate-pulse">
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

  // Tela de bloqueio — nenhum recurso acessível sem autenticação
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
      />

      <main className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Mobile Header Toggle */}
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

        {/* Scrollable Content Area */}
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
                    <PlayersHub />
                  </div>
                )}
                {currentView === 'maps' && (
                  <div className="w-full max-w-full">
                    <MapsHub />
                  </div>
                )}
                {currentView === 'brawlers' && (
                  <div className="w-full max-w-full">
                    <BrawlersHub />
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
