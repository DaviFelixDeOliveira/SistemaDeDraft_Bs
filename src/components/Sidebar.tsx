import { useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  Swords, 
  LogOut,
  Target,
  PanelLeftClose,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from './LockScreen';
import { backupRestoreService } from '../services/backupRestoreService';

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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'draft', label: 'Draft', icon: Swords },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'maps', label: 'Mapas & Modos', icon: MapIcon },
    { id: 'brawlers', label: 'Brawlers & Estatísticas', icon: Target },
  ];

  const handleExportBackup = async () => {
    await backupRestoreService.exportBackupJSON();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await backupRestoreService.importBackupJSON(content);
        alert(res.message);
        if (res.success) {
          window.location.reload();
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#121212] border-r border-zinc-200 dark:border-[#2A2A2A] h-screen flex flex-col transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#FF3366] flex items-center justify-center shadow-[0_0_15px_rgba(255,51,102,0.4)]">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              TBK <span className="text-[#FFCC00]">Hub</span>
            </h1>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <PanelLeftClose className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={cn("cursor-pointer touch-manipulation", 
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-[#FF3366]/10 text-[#FF3366] shadow-[inset_2px_0_0_0_#FF3366]" 
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-[#2A2A2A] space-y-3">
          {/* Badge de Nível de Acesso (Item 3) */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-[#1A1A1A] rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <span>Acesso:</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider",
              userRole === 'admin' ? "bg-[#FF3366]/20 text-[#FF3366]" : "bg-blue-500/20 text-blue-400"
            )}>
              {userRole === 'admin' ? '👑 Admin' : '👤 Player'}
            </span>
          </div>

          {/* Botões de Backup & Restauração JSON (Item 1) */}
          <div className="flex gap-2">
            <button
              onClick={handleExportBackup}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
              title="Exportar backup completo em JSON"
            >
              <Download className="w-3.5 h-3.5" />
              Backup
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Restaurar backup via arquivo JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                Restaurar
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair do Sistema
          </button>
        </div>
      </div>
    </>
  );
}
