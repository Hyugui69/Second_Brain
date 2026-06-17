import { useState, useEffect } from 'react';
import { supabase, TimelineEvent, Goal, Memory } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import {
  Calendar,
  Star,
  Target,
  Lightbulb,
  Trophy,
  BookOpen,
  MessageSquare,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TimelineProps {
  userId: string;
}

export function Timeline({ userId }: TimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'milestone',
    event_date: '',
  });
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);

    const { data: eventsData } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false });

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    const { data: memoriesData } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsData) setEvents(eventsData);
    if (goalsData) setGoals(goalsData);
    if (memoriesData) setMemories(memoriesData);

    setLoading(false);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.event_date) return;

    const { data } = await supabase
      .from('timeline_events')
      .insert({
        user_id: userId,
        title: newEvent.title,
        description: newEvent.description,
        event_type: newEvent.event_type,
        event_date: newEvent.event_date,
      })
      .select()
      .single();

    if (data) {
      setEvents(prev => [data, ...prev].sort((a, b) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      ));
      setNewEvent({ title: '', description: '', event_type: 'milestone', event_date: '' });
      setIsAddingEvent(false);
    }
  };

  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.event_date);
    const year = date.getFullYear();
    const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push(event);

    return acc;
  }, {} as Record<number, Record<string, TimelineEvent[]>>);

  const years = Object.keys(groupedEvents).map(Number).sort((a, b) => b - a);

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'goal_completed':
        return <Target className="w-5 h-5 text-emerald-400" />;
      case 'learning':
        return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'idea':
        return <Lightbulb className="w-5 h-5 text-purple-400" />;
      case 'conversation':
        return <MessageSquare className="w-5 h-5 text-cyan-400" />;
      default:
        return <Star className="w-5 h-5 text-slate-400" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'goal_completed':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'learning':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'idea':
        return 'border-purple-500/50 bg-purple-500/10';
      case 'conversation':
        return 'border-cyan-500/50 bg-cyan-500/10';
      default:
        return 'border-slate-500/50 bg-slate-500/10';
    }
  };

  const filteredYears = yearFilter ? [yearFilter] : years;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Chronologie</h2>
              <p className="text-sm text-slate-400">{events.length} événements enregistrés</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingEvent(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
          <button
            onClick={() => setYearFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              !yearFilter ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Toutes
          </button>
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setYearFilter(year)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                yearFilter === year ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {isAddingEvent && (
        <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Nouvel événement</h3>
            <button onClick={() => setIsAddingEvent(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de l'événement"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="col-span-2">
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optionnel)"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>
            <div>
              <select
                value={newEvent.event_type}
                onChange={(e) => setNewEvent(prev => ({ ...prev, event_type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="milestone">Jalon</option>
                <option value="goal_completed">Objectif atteint</option>
                <option value="learning">Apprentissage</option>
                <option value="idea">Idée</option>
                <option value="conversation">Conversation importante</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                value={newEvent.event_date}
                onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
              >
                Ajouter à la chronologie
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : filteredYears.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">Aucun événement enregistré</p>
            <p className="text-sm text-slate-500">Commencez par ajouter un événement important</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredYears.map((year) => (
              <div key={year}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg">
                    {year}
                  </span>
                </h3>
                {Object.entries(groupedEvents[year]).map(([month, monthEvents]) => (
                  <div key={month} className="mb-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                      {month}
                    </h4>
                    <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-0 before:bottom-0 before:w-px before:bg-slate-700">
                      {monthEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`relative rounded-xl border p-4 ${getEventTypeColor(event.event_type)}`}
                        >
                          <div className="absolute -left-6 top-4 w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getEventTypeIcon(event.event_type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-white font-medium">{event.title}</h5>
                                <span className="text-xs text-slate-400">
                                  {new Date(event.event_date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-sm text-slate-400">{event.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
