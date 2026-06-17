import { useState, useEffect } from 'react';
import { supabase, LearningItem, Memory } from '../lib/supabase';
import { formatDate, formatRelativeTime, categories } from '../lib/utils';
import {
  Brain,
  BookOpen,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface LearningProps {
  userId: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  answer: string;
  memoryId: string | null;
  difficulty: number;
}

export function Learning({ userId }: LearningProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizStats, setQuizStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'overview' | 'quiz' | 'create'>('overview');
  const [newQuiz, setNewQuiz] = useState({ question: '', answer: '', memoryId: '', difficulty: 5 });
  const [reviewQueue, setReviewQueue] = useState<QuizQuestion[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const { data: memoriesData } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: learningData } = await supabase
      .from('learning_items')
      .select('*')
      .eq('user_id', userId);

    if (memoriesData) setMemories(memoriesData);
    if (learningData) setLearningItems(learningData);
    setLoading(false);
  };

  const generateQuizFromMemories = async () => {
    const unreviewed = memories.filter(m => {
      const item = learningItems.find(l => l.memory_id === m.id);
      return !item || new Date(item.next_review_at || 0) <= new Date();
    });

    const quizzes: QuizQuestion[] = unreviewed.slice(0, 10).map(m => ({
      id: m.id,
      question: `Que retenez-vous de : "${m.title}"?`,
      answer: m.content,
      memoryId: m.id,
      difficulty: m.importance,
    }));

    const existingQuizzes: QuizQuestion[] = learningItems
      .filter(item => new Date(item.next_review_at || 0) <= new Date())
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        memoryId: item.memory_id,
        difficulty: item.difficulty,
      }));

    return [...quizzes, ...existingQuizzes];
  };

  const startReviewSession = async () => {
    const quizzes = await generateQuizFromMemories();
    if (quizzes.length === 0) {
      alert('Aucune carte à réviser. Ajoutez des notes ou attendez que les cartes soient prêtes à réviser.');
      return;
    }
    setReviewQueue(quizzes);
    setQueueIndex(0);
    setActiveQuiz(quizzes[0]);
    setShowAnswer(false);
    setQuizStats({ correct: 0, incorrect: 0, total: quizzes.length });
    setMode('quiz');
  };

  const handleAnswer = async (correct: boolean) => {
    if (!activeQuiz) return;

    const item = learningItems.find(l => l.id === activeQuiz.id || l.memory_id === activeQuiz.memoryId);

    if (item) {
      const successRate = Math.min(100, Math.max(0,
        correct ? item.success_rate + 10 : item.success_rate - 5
      ));

      const now = new Date();
      let nextReview = new Date(now);

      if (correct) {
        const interval = Math.pow(2, Math.floor(item.practice_count / 2));
        nextReview.setDate(nextReview.getDate() + Math.min(interval, 30));
      } else {
        nextReview.setDate(nextReview.getDate() + 1);
      }

      await supabase
        .from('learning_items')
        .update({
          last_practiced_at: now.toISOString(),
          practice_count: item.practice_count + 1,
          success_rate: successRate,
          next_review_at: nextReview.toISOString(),
        })
        .eq('id', item.id);

      setLearningItems(prev =>
        prev.map(l => l.id === item.id
          ? { ...l, last_practiced_at: now.toISOString(), practice_count: l.practice_count + 1, success_rate, next_review_at: nextReview.toISOString() }
          : l
        )
      );
    } else if (activeQuiz.memoryId) {
      const now = new Date();
      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + (correct ? 3 : 1));

      const { data: newItem } = await supabase
        .from('learning_items')
        .insert({
          user_id: userId,
          memory_id: activeQuiz.memoryId,
          question: activeQuiz.question,
          answer: activeQuiz.answer,
          difficulty: activeQuiz.difficulty,
          last_practiced_at: now.toISOString(),
          practice_count: 1,
          success_rate: correct ? 100 : 50,
          next_review_at: nextReview.toISOString(),
        })
        .select()
        .single();

      if (newItem) {
        setLearningItems(prev => [...prev, newItem]);
      }
    }

    setQuizStats(prev => ({
      ...prev,
      correct: correct ? prev.correct + 1 : prev.correct,
      incorrect: correct ? prev.incorrect : prev.incorrect + 1,
    }));

    if (queueIndex + 1 < reviewQueue.length) {
      setQueueIndex(queueIndex + 1);
      setActiveQuiz(reviewQueue[queueIndex + 1]);
      setShowAnswer(false);
    } else {
      setActiveQuiz(null);
    }
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.question.trim() || !newQuiz.answer.trim()) return;

    const { data } = await supabase
      .from('learning_items')
      .insert({
        user_id: userId,
        memory_id: newQuiz.memoryId || null,
        question: newQuiz.question,
        answer: newQuiz.answer,
        difficulty: newQuiz.difficulty,
      })
      .select()
      .single();

    if (data) {
      setLearningItems(prev => [...prev, data]);
      setNewQuiz({ question: '', answer: '', memoryId: '', difficulty: 5 });
      setMode('overview');
    }
  };

  const cardsDueToday = learningItems.filter(item => {
    const nextReview = item.next_review_at ? new Date(item.next_review_at) : new Date(0);
    return nextReview <= new Date();
  }).length;

  const masteredCards = learningItems.filter(item => item.success_rate >= 80).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (mode === 'quiz' && activeQuiz) {
    return (
      <div className="flex-1 flex flex-col bg-slate-900">
        <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Session de révision</h2>
                <p className="text-sm text-slate-400">
                  Carte {queueIndex + 1} sur {reviewQueue.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMode('overview')}
              className="text-slate-400 hover:text-white"
            >
              Quitter
            </button>
          </div>
          <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${((queueIndex + 1) / reviewQueue.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  activeQuiz.difficulty >= 7 ? 'bg-red-500/20 text-red-400' :
                  activeQuiz.difficulty >= 4 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  Difficulté: {activeQuiz.difficulty}/10
                </span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-6">{activeQuiz.question}</h3>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full py-4 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
                >
                  Afficher la réponse
                </button>
              ) : (
                <div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-6">
                    <p className="text-emerald-300 whitespace-pre-wrap">{activeQuiz.answer}</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAnswer(false)}
                      className="flex-1 py-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      À revoir
                    </button>
                    <button
                      onClick={() => handleAnswer(true)}
                      className="flex-1 py-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Correct
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'quiz' && !activeQuiz) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Session terminée !</h2>
        <p className="text-slate-400 mb-4">
          {quizStats.correct} correct sur {quizStats.total} cartes
        </p>
        <p className="text-2xl text-emerald-400 font-bold mb-6">
          {Math.round((quizStats.correct / quizStats.total) * 100)}% de réussite
        </p>
        <button
          onClick={() => setMode('overview')}
          className="px-6 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
        >
          Retour à l'aperçu
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Apprentissage</h2>
              <p className="text-sm text-slate-400">Révision espacée et quiz personnalisés</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('create')}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Créer une carte
            </button>
            <button
              onClick={startReviewSession}
              disabled={cardsDueToday === 0 && learningItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              Commencer la révision
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-2xl font-bold text-white">{cardsDueToday}</span>
            </div>
            <div className="text-sm text-slate-400">À réviser aujourd'hui</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-2xl font-bold text-white">{learningItems.length}</span>
            </div>
            <div className="text-sm text-slate-400">Total des cartes</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-2xl font-bold text-white">{masteredCards}</span>
            </div>
            <div className="text-sm text-slate-400">Cartes maîtrisées</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {learningItems.length > 0
                  ? Math.round(learningItems.reduce((sum, item) => sum + item.success_rate, 0) / learningItems.length)
                  : 0}%
              </span>
            </div>
            <div className="text-sm text-slate-400">Taux de réussite</div>
          </div>
        </div>
      </div>

      {mode === 'create' && (
        <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Nouvelle carte de révision</h3>
            <button onClick={() => setMode('overview')} className="text-slate-400 hover:text-white">
              Annuler
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Question</label>
              <textarea
                value={newQuiz.question}
                onChange={(e) => setNewQuiz(prev => ({ ...prev, question: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                placeholder="Question à poser..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Réponse</label>
              <textarea
                value={newQuiz.answer}
                onChange={(e) => setNewQuiz(prev => ({ ...prev, answer: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                placeholder="Réponse attendue..."
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Difficulté:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newQuiz.difficulty}
                  onChange={(e) => setNewQuiz(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                  className="w-32 accent-emerald-500"
                />
                <span className="text-sm text-white">{newQuiz.difficulty}</span>
              </div>
              <button
                onClick={handleCreateQuiz}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {learningItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">Aucune carte de révision</p>
            <p className="text-sm text-slate-500 mb-4">
              Ajoutez des notes ou créez des cartes pour commencer à réviser
            </p>
            <button
              onClick={() => setMode('create')}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              Créer ma première carte
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {cardsDueToday > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                  À réviser aujourd'hui ({cardsDueToday})
                </h3>
                <div className="space-y-2">
                  {learningItems
                    .filter(item => {
                      const nextReview = item.next_review_at ? new Date(item.next_review_at) : new Date(0);
                      return nextReview <= new Date();
                    })
                    .map((item) => (
                      <div key={item.id} className="bg-slate-800/50 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{item.question}</p>
                            <p className="text-sm text-slate-400 mt-1">
                              Dernière révision: {item.last_practiced_at ? formatRelativeTime(item.last_practiced_at) : 'Jamais'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                              {item.success_rate}% réussite
                            </span>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {learningItems.filter(item => {
              const nextReview = item.next_review_at ? new Date(item.next_review_at) : new Date(0);
              return nextReview > new Date();
            }).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                  Prochaines révisions
                </h3>
                <div className="space-y-2">
                  {learningItems
                    .filter(item => {
                      const nextReview = item.next_review_at ? new Date(item.next_review_at) : new Date(0);
                      return nextReview > new Date();
                    })
                    .sort((a, b) => new Date(a.next_review_at || 0).getTime() - new Date(b.next_review_at || 0).getTime())
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white">{item.question}</p>
                            <p className="text-sm text-slate-400 mt-1">
                              À réviser le {item.next_review_at ? formatDate(item.next_review_at) : 'Non planifié'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.success_rate >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                              item.success_rate >= 50 ? 'bg-amber-500/10 text-amber-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {item.success_rate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
