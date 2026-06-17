import { useState, useEffect } from 'react';
import { supabase, Memory, Goal, Insight } from '../lib/supabase';
import { formatDate, categories } from '../lib/utils';
import {
  Calendar,
  TrendingUp,
  Target,
  Lightbulb,
  BookOpen,
  Award,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface WeeklyReviewProps {
  userId: string;
}

interface WeekData {
  startDate: Date;
  endDate: Date;
  memoriesCreated: number;
  goalsCompleted: number;
  insightsGenerated: number;
  reviewCount: number;
  topCategories: Array<{ category: string; count: number }>;
  progress: number;
}

export function WeeklyReview({ userId }: WeeklyReviewProps) {
  const [weeklyData, setWeeklyData] = useState<WeekData | null>(null);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [recentInsights, setRecentInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  useEffect(() => {
    loadWeeklyData();
  }, [userId, selectedWeekOffset]);

  const getWeekBounds = (offset: number) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - offset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
  };

  const loadWeeklyData = async () => {
    setLoading(true);
    const { start, end } = getWeekBounds(selectedWeekOffset);

    const { data: memoriesData } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());

    const { data: insightsData } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const { data: activeGoalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memoriesData) setRecentMemories(memoriesData);
    if (activeGoalsData) setActiveGoals(activeGoalsData);
    if (insightsData) setRecentInsights(insightsData);

    const categoryCount = new Map<string, number>();
    memoriesData?.forEach(m => {
      categoryCount.set(m.category, (categoryCount.get(m.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgProgress = activeGoalsData && activeGoalsData.length > 0
      ? activeGoalsData.reduce((sum, g) => sum + g.progress, 0) / activeGoalsData.length
      : 0;

    setWeeklyData({
      startDate: start,
      endDate: end,
      memoriesCreated: memoriesData?.length || 0,
      goalsCompleted: goalsData?.length || 0,
      insightsGenerated: insightsData?.length || 0,
      reviewCount: memoriesData?.filter(m => m.review_count > 0).length || 0,
      topCategories,
      progress: Math.round(avgProgress),
    });

    setLoading(false);
  };

  const formatWeekLabel = (offset: number) => {
    const { start, end } = getWeekBounds(offset);
    if (offset === 0) return 'Cette semaine';
    if (offset === 1) return 'Semaine dernière';
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Revue hebdomadaire</h2>
              <p className="text-sm text-slate-400">{weeklyData && `${formatDate(weeklyData.startDate)} - ${formatDate(weeklyData.endDate)}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWeekOffset(prev => prev + 1)}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-400 w-32 text-center">{formatWeekLabel(selectedWeekOffset)}</span>
            <button
              onClick={() => setSelectedWeekOffset(prev => Math.max(0, prev - 1))}
              disabled={selectedWeekOffset === 0}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={loadWeeklyData}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors ml-2"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {weeklyData && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <BookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{weeklyData.memoriesCreated}</div>
                <div className="text-sm text-slate-400">Nouvelles notes</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <Target className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{weeklyData.goalsCompleted}</div>
                <div className="text-sm text-slate-400">Objectifs atteints</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{weeklyData.insightsGenerated}</div>
                <div className="text-sm text-slate-400">Insights générés</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{weeklyData.progress}%</div>
                <div className="text-sm text-slate-400">Progression moyenne</div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Focus de la semaine
              </h3>
              {weeklyData.topCategories.length > 0 ? (
                <div className="grid grid-cols-5 gap-3">
                  {weeklyData.topCategories.map((cat, i) => {
                    const categoryInfo = categories.find(c => c.id === cat.category);
                    return (
                      <div
                        key={cat.category}
                        className="bg-slate-700/50 rounded-lg p-3 text-center"
                      >
                        <div className={`w-8 h-8 rounded-full ${categoryInfo?.color || 'bg-slate-500'} mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold`}>
                          {i + 1}
                        </div>
                        <div className="text-sm text-white font-medium">
                          {categoryInfo?.label || cat.category}
                        </div>
                        <div className="text-xs text-slate-400">{cat.count} notes</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400">Aucune activité enregistrée cette semaine</p>
              )}
            </div>

            {recentMemories.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Notes de la semaine</h3>
                <div className="space-y-2">
                  {recentMemories.slice(0, 5).map((memory) => (
                    <div key={memory.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                        categories.find(c => c.id === memory.category)?.color || 'bg-slate-500'
                      }`}>
                        {categories.find(c => c.id === memory.category)?.label || memory.category}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{memory.title}</p>
                        <p className="text-sm text-slate-400 truncate">{memory.content.substring(0, 80)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeGoals.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Objectifs en cours</h3>
                <div className="space-y-3">
                  {activeGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{goal.title}</p>
                        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-400">{goal.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentInsights.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Insights de la semaine</h3>
                <div className="space-y-2">
                  {recentInsights.map((insight) => (
                    <div key={insight.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-400">{insight.title}</span>
                      </div>
                      <p className="text-sm text-slate-300">{insight.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                Résumé de la semaine
              </h3>
              <p className="text-slate-300">
                {weeklyData.memoriesCreated === 0 && weeklyData.goalsCompleted === 0 ? (
                  "Vous n'avez pas enregistré d'activité cette semaine. C'est le moment idéal pour ajouter des notes ou définir de nouveaux objectifs !"
                ) : (
                  <>
                    Cette semaine, vous avez ajouté <span className="text-emerald-400 font-semibold">{weeklyData.memoriesCreated} note{weeklyData.memoriesCreated > 1 ? 's' : ''}</span>
                    {weeklyData.goalsCompleted > 0 && (
                      <> et atteint <span className="text-emerald-400 font-semibold">{weeklyData.goalsCompleted} objectif{weeklyData.goalsCompleted > 1 ? 's' : ''}</span></>
                    )}
                    .
                    {weeklyData.insightsGenerated > 0 && (
                      <> L'IA a généré <span className="text-amber-400 font-semibold">{weeklyData.insightsGenerated} insight{weeklyData.insightsGenerated > 1 ? 's' : ''}</span> pour vous aider à progresser.</>
                    )}
                    {activeGoals.length > 0 && (
                      <> Vous avez <span className="text-blue-400 font-semibold">{activeGoals.length} objectif{activeGoals.length > 1 ? 's' : ''} en cours</span> avec une progression moyenne de <span className="text-emerald-400 font-semibold">{weeklyData.progress}%</span>.</>
                    )}
                  </>
                )}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Continuez à alimenter votre Second Brain ! Chaque note renforce votre mémoire personnelle.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
