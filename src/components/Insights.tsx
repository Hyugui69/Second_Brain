import { useState, useEffect } from 'react';
import { supabase, Insight } from '../lib/supabase';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { useAI } from '../lib/ai-context';
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  GitBranch,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';

interface InsightsProps {
  userId: string;
}

export function Insights({ userId }: InsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const { generateInsight, isProcessing } = useAI();

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setInsights(data);
    setLoading(false);
  };

  const handleAcknowledge = async (id: string) => {
    await supabase
      .from('insights')
      .update({ acknowledged: true })
      .eq('id', id);
    setInsights(prev =>
      prev.map(i => (i.id === id ? { ...i, acknowledged: true } : i))
    );
  };

  const handleDelete = async (id: string) => {
    await supabase.from('insights').delete().eq('id', id);
    setInsights(prev => prev.filter(i => i.id !== id));
    setSelectedInsight(null);
  };

  const handleGenerate = async () => {
    await generateInsight();
    await loadInsights();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'connection':
        return <GitBranch className="w-5 h-5 text-purple-400" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
      case 'opportunity':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'connection':
        return 'border-purple-500/50 bg-purple-500/10';
      case 'suggestion':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'opportunity':
        return 'border-emerald-500/50 bg-emerald-500/10';
      default:
        return 'border-slate-500/50 bg-slate-500/10';
    }
  };

  const getInsightLabel = (type: string) => {
    switch (type) {
      case 'pattern':
        return 'Motif détecté';
      case 'connection':
        return 'Connexion potentielle';
      case 'suggestion':
        return 'Suggestion';
      case 'opportunity':
        return 'Opportunité';
      default:
        return 'Insight';
    }
  };

  const unacknowledged = insights.filter(i => !i.acknowledged);
  const acknowledged = insights.filter(i => i.acknowledged);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Insights</h2>
              <p className="text-sm text-slate-400">{unacknowledged.length} nouveaux insights</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer un insight
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Lightbulb className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">Aucun insight généré</p>
            <p className="text-sm text-slate-500 mb-4">
              Ajoutez des notes et objectifs pour que l'IA puisse découvrir des connexions
            </p>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
            >
              Générer mon premier insight
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {unacknowledged.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                  Nouveaux insights ({unacknowledged.length})
                </h3>
                <div className="space-y-3">
                  {unacknowledged.map((insight) => (
                    <div
                      key={insight.id}
                      className={`rounded-xl border p-4 ${getInsightColor(insight.insight_type)} cursor-pointer hover:bg-opacity-20 transition-all`}
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getInsightIcon(insight.insight_type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400">{getInsightLabel(insight.insight_type)}</span>
                            <span className="text-xs text-slate-500">{formatRelativeTime(insight.created_at)}</span>
                          </div>
                          <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                          <p className="text-sm text-slate-400 line-clamp-2">{insight.content}</p>
                          {insight.actionable && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                              <ArrowRight className="w-3 h-3" />
                              Action suggérée
                            </div>
                          )}
                        </div>
                        {!insight.acknowledged && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(insight.id);
                            }}
                            className="text-slate-400 hover:text-emerald-400"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {acknowledged.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                  Historique ({acknowledged.length})
                </h3>
                <div className="space-y-2">
                  {acknowledged.slice(0, 10).map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 hover:border-slate-600 transition-all cursor-pointer"
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-600">{getInsightIcon(insight.insight_type)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-400 text-sm truncate">{insight.title}</h4>
                        </div>
                        <span className="text-xs text-slate-500">{formatRelativeTime(insight.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedInsight && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedInsight.insight_type === 'pattern' ? 'bg-blue-500/20 text-blue-400' :
                    selectedInsight.insight_type === 'connection' ? 'bg-purple-500/20 text-purple-400' :
                    selectedInsight.insight_type === 'suggestion' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {getInsightIcon(selectedInsight.insight_type)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{getInsightLabel(selectedInsight.insight_type)}</p>
                    <h3 className="text-lg font-semibold text-white">{selectedInsight.title}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <p className="text-slate-300 mb-4">{selectedInsight.content}</p>

              {selectedInsight.actionable && selectedInsight.action_suggestion && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-emerald-400">
                    <span className="font-medium">Action suggérée:</span>{' '}
                    {selectedInsight.action_suggestion}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Généré le {formatDate(selectedInsight.created_at)}</span>
                <div className="flex items-center gap-2">
                  {!selectedInsight.acknowledged && (
                    <button
                      onClick={() => {
                        handleAcknowledge(selectedInsight.id);
                        setSelectedInsight({ ...selectedInsight, acknowledged: true });
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white"
                    >
                      Marquer comme lu
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedInsight.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
