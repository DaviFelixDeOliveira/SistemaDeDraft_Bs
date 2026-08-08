import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DraftWizard } from './components/draft/DraftWizard';
import { Menu, Loader2 } from 'lucide-react';
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
  const [currentView, setCurrentView] = useState('draft');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    clearSession();
    setIsAuthenticated(false);
  };

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
