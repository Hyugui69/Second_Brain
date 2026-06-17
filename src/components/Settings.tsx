import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Download,
  Trash2,
  LogOut,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface SettingsProps {
  userId: string;
  userEmail: string;
  onLogout: () => void;
}

export function Settings({ userId, userEmail, onLogout }: SettingsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const [memoriesRes, goalsRes, timelineRes, insightsRes] = await Promise.all([
        supabase.from('memories').select('*').eq('user_id', userId),
        supabase.from('goals').select('*, milestones(*)').eq('user_id', userId),
        supabase.from('timeline_events').select('*').eq('user_id', userId),
        supabase.from('insights').select('*').eq('user_id', userId),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: { email: userEmail },
        memories: memoriesRes.data || [],
        goals: goalsRes.data || [],
        timeline: timelineRes.data || [],
        insights: insightsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `second-brain-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      await supabase.from('memories').delete().eq('user_id', userId);
      await supabase.from('goals').delete().eq('user_id', userId);
      await supabase.from('timeline_events').delete().eq('user_id', userId);
      await supabase.from('insights').delete().eq('user_id', userId);
      await supabase.from('connections').delete().eq('user_id', userId);
      await supabase.from('conversations').delete().eq('user_id', userId);
      await supabase.from('learning_items').delete().eq('user_id', userId);

      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Error deleting account:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Paramètres</h2>
            <p className="text-sm text-slate-400">Gérez votre compte et vos données</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Profil</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <p className="text-white">{userEmail}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">ID Utilisateur</label>
                <p className="text-slate-500 text-sm font-mono">{userId}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Données</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Exportez ou supprimez toutes vos données personnelles. Vos données vous appartiennent.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Exporter mes données
                  </>
                )}
              </button>
              {exportSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Export réussi
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Confidentialité</h3>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Toutes vos données sont chiffrées et stockées de manière sécurisée
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Seul vous avez accès à vos informations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Vous pouvez exporter ou supprimer vos données à tout moment
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Aucune donnée partagée avec des tiers
              </li>
            </ul>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Zone dangereuse</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              La suppression de votre compte est irréversible. Toutes vos données seront définitivement perdues.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
              >
                Supprimer mon compte
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmer la suppression</h3>
                  <p className="text-sm text-slate-400">Cette action est irréversible</p>
                </div>
              </div>

              <p className="text-slate-300 mb-6">
                Êtes-vous sûr de vouloir supprimer votre compte ? Toutes vos notes, objectifs, et données seront définitivement supprimés.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
