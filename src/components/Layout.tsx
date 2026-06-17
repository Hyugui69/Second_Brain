import { ReactNode } from 'react';
import {
  MessageSquare,
  Database,
  Target,
  GitBranch,
  Calendar,
  Settings,
  LogOut,
  Brain,
  Lightbulb,
  User,
  GraduationCap,
  BarChart3,
} from 'lucide-react';

type View = 'chat' | 'knowledge' | 'goals' | 'map' | 'timeline' | 'settings' | 'insights' | 'learning' | 'weekly';

interface LayoutProps {
  children: ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  user: { email: string } | null;
  onLogout: () => void;
}

const navItems: Array<{ id: View; label: string; icon: typeof MessageSquare }> = [
  { id: 'chat', label: 'Conversation', icon: MessageSquare },
  { id: 'knowledge', label: 'Connaissances', icon: Database },
  { id: 'goals', label: 'Objectifs', icon: Target },
  { id: 'learning', label: 'Apprentissage', icon: GraduationCap },
  { id: 'weekly', label: 'Revue hebdo', icon: BarChart3 },
  { id: 'map', label: 'Carte', icon: GitBranch },
  { id: 'timeline', label: 'Chronologie', icon: Calendar },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export function Layout({ children, currentView, onViewChange, user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-64 bg-slate-800/50 border-r border-slate-700/50 flex flex-col">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Second Brain</h1>
              <p className="text-xs text-slate-400">Mémoire intelligente</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-700/50 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/30">
            <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Connecté</p>
              <p className="text-sm text-white truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onViewChange('settings')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                currentView === 'settings'
                  ? 'bg-slate-700/50 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </button>
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
