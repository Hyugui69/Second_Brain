import { useState, useEffect } from 'react';
import { supabase, Goal, Milestone } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  TrendingUp,
  ChevronDown,
  X,
  Edit3,
  Trash2,
  Flag,
  Award,
  AlertCircle,
} from 'lucide-react';

interface GoalsDashboardProps {
  userId: string;
}

const timeframeOptions = [
  { value: 'short-term', label: 'Court terme (semaines)' },
  { value: 'medium-term', label: 'Moyen terme (mois)' },
  { value: 'long-term', label: 'Long terme (années)' },
];

const categoryOptions = [
  { value: 'personal', label: 'Personnel', color: 'bg-blue-500' },
  { value: 'professional', label: 'Professionnel', color: 'bg-amber-500' },
  { value: 'health', label: 'Santé', color: 'bg-green-500' },
  { value: 'learning', label: 'Apprentissage', color: 'bg-purple-500' },
  { value: 'creative', label: 'Créatif', color: 'bg-rose-500' },
  { value: 'financial', label: 'Financier', color: 'bg-emerald-500' },
  { value: 'relationships', label: 'Relations', color: 'bg-cyan-500' },
  { value: 'other', label: 'Autre', color: 'bg-slate-500' },
];

export function GoalsDashboard({ userId }: GoalsDashboardProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal',
    timeframe: 'medium-term',
    target_date: '',
  });
  const [newMilestone, setNewMilestone] = useState({ title: '', due_date: '', goal_id: '' });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (goalsData) {
      setGoals(goalsData);
      const milestonesData: Record<string, Milestone[]> = {};
      for (const goal of goalsData) {
        const { data: ms } = await supabase
          .from('milestones')
          .select('*')
          .eq('goal_id', goal.id)
          .order('created_at', { ascending: true });
        if (ms) milestonesData[goal.id] = ms;
      }
      setMilestones(milestonesData);
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (activeFilter === 'active') return goal.status === 'active';
    if (activeFilter === 'completed') return goal.status === 'completed';
    return true;
  });

  const handleAddGoal = async () => {
    if (!newGoal.title.trim()) return;

    const { data } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: newGoal.title,
        description: newGoal.description,
        category: newGoal.category,
        timeframe: newGoal.timeframe,
        target_date: newGoal.target_date || null,
        status: 'active',
        progress: 0,
      })
      .select()
      .single();

    if (data) {
      setGoals(prev => [data, ...prev]);
      setMilestones(prev => ({ ...prev, [data.id]: [] }));
      setNewGoal({ title: '', description: '', category: 'personal', timeframe: 'medium-term', target_date: '' });
      setIsAddingGoal(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim() || !newMilestone.goal_id) return;

    const { data } = await supabase
      .from('milestones')
      .insert({
        goal_id: newMilestone.goal_id,
        title: newMilestone.title,
        due_date: newMilestone.due_date || null,
      })
      .select()
      .single();

    if (data) {
      setMilestones(prev => ({
        ...prev,
        [newMilestone.goal_id]: [...(prev[newMilestone.goal_id] || []), data],
      }));
      setNewMilestone({ title: '', due_date: '', goal_id: '' });
      setShowMilestoneForm(false);
      await updateProgress(newMilestone.goal_id);
    }
  };

  const handleToggleMilestone = async (milestoneId: string, goalId: string) => {
    const ms = milestones[goalId]?.find(m => m.id === milestoneId);
    if (!ms) return;

    const { data } = await supabase
      .from('milestones')
      .update({
        completed: !ms.completed,
        completed_at: !ms.completed ? new Date().toISOString() : null,
      })
      .eq('id', milestoneId)
      .select()
      .single();

    if (data) {
      setMilestones(prev => ({
        ...prev,
        [goalId]: prev[goalId].map(m => (m.id === milestoneId ? data : m)),
      }));
      await updateProgress(goalId);
    }
  };

  const updateProgress = async (goalId: string) => {
    const ms = milestones[goalId];
    if (!ms || ms.length === 0) return;

    const completed = ms.filter(m => m.completed).length;
    const progress = Math.round((completed / ms.length) * 100);

    const status = progress === 100 ? 'completed' : 'active';
    const completedAt = progress === 100 ? new Date().toISOString() : null;

    await supabase
      .from('goals')
      .update({ progress, status, completed_at: completedAt })
      .eq('id', goalId);

    setGoals(prev =>
      prev.map(g => (g.id === goalId ? { ...g, progress, status, completed_at: completedAt } : g))
    );
  };

  const handleDeleteGoal = async (goalId: string) => {
    await supabase.from('milestones').delete().eq('goal_id', goalId);
    await supabase.from('goals').delete().eq('id', goalId);
    setGoals(prev => prev.filter(g => g.id !== goalId));
    setMilestones(prev => {
      const updated = { ...prev };
      delete updated[goalId];
      return updated;
    });
  };

  const getTotalProgress = () => {
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) return 0;
    return Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length);
  };

  const getCategoryColor = (category: string) => {
    const found = categoryOptions.find(c => c.value === category);
    return found?.color || 'bg-slate-500';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Objectifs</h2>
              <p className="text-sm text-slate-400">{goals.filter(g => g.status === 'active').length} objectifs actifs</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingGoal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouvel objectif
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-white">{goals.filter(g => g.status === 'active').length}</div>
            <div className="text-sm text-slate-400">Objectifs actifs</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-emerald-400">{getTotalProgress()}%</div>
            <div className="text-sm text-slate-400">Progression moyenne</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-amber-400">{goals.filter(g => g.status === 'completed').length}</div>
            <div className="text-sm text-slate-400">Objectifs atteints</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {filter === 'all' ? 'Tous' : filter === 'active' ? 'Actifs' : 'Complétés'}
            </button>
          ))}
        </div>
      </div>

      {isAddingGoal && (
        <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Nouvel objectif</h3>
            <button onClick={() => setIsAddingGoal(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de l'objectif"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="col-span-2">
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optionnel)"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>
            <div>
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={newGoal.timeframe}
                onChange={(e) => setNewGoal(prev => ({ ...prev, timeframe: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {timeframeOptions.map((tf) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Target className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">Aucun objectif {activeFilter !== 'all' ? activeFilter : ''}</p>
            <p className="text-sm text-slate-500">Commencez par définir un nouvel objectif</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGoals.map((goal) => {
              const goalMilestones = milestones[goal.id] || [];
              const completedMilestones = goalMilestones.filter(m => m.completed).length;
              const totalMilestones = goalMilestones.length;

              return (
                <div
                  key={goal.id}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-slate-600 transition-all"
                  onClick={() => setSelectedGoal(selectedGoal?.id === goal.id ? null : goal)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium text-white ${getCategoryColor(goal.category)}`}>
                            {categoryOptions.find(c => c.value === goal.category)?.label}
                          </span>
                          <span className="text-xs text-slate-500">{timeframeOptions.find(t => t.value === goal.timeframe)?.label}</span>
                          {goal.status === 'completed' && <Award className="w-4 h-4 text-amber-400" />}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-slate-400 text-sm mb-3">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Flag className="w-4 h-4" />
                            <span>{completedMilestones}/{totalMilestones} étapes</span>
                          </div>
                          {goal.target_date && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(goal.target_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-400">{goal.progress}%</div>
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedGoal?.id === goal.id && (
                    <div className="border-t border-slate-700 p-5 bg-slate-800/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-white">Étapes</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMilestoneForm(true);
                              setNewMilestone(prev => ({ ...prev, goal_id: goal.id }));
                            }}
                            className="text-sm text-emerald-400 hover:text-emerald-300"
                          >
                            + Ajouter une étape
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGoal(goal.id);
                            }}
                            className="text-sm text-red-400 hover:text-red-300"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>

                      {showMilestoneForm && newMilestone.goal_id === goal.id && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-700/50 rounded-lg">
                          <input
                            type="text"
                            value={newMilestone.title}
                            onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Nouvelle étape"
                            className="flex-1 px-3 py-1.5 rounded bg-slate-600 border border-slate-500 text-white text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddMilestone();
                            }}
                            className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm"
                          >
                            Ajouter
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        {goalMilestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMilestone(milestone.id, goal.id);
                            }}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-all cursor-pointer"
                          >
                            {milestone.completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            )}
                            <span className={`flex-1 ${milestone.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                              {milestone.title}
                            </span>
                            {milestone.due_date && (
                              <span className="text-xs text-slate-500">{formatDate(milestone.due_date)}</span>
                            )}
                          </div>
                        ))}
                        {goalMilestones.length === 0 && (
                          <p className="text-slate-500 text-sm text-center py-4">
                            Aucune étape définie
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
