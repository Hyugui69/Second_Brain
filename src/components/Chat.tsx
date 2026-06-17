import { useState, useRef, useEffect } from 'react';
import { supabase, Memory, Goal } from '../lib/supabase';
import { useAI } from '../lib/ai-context';
import { formatDate, extractKeywords, categories } from '../lib/utils';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Database,
  Target,
  Clock,
  Tag,
  Lightbulb,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ChatProps {
  userId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  relatedItems?: { type: 'memory' | 'goal'; title: string }[];
}

export function Chat({ userId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { processContent, generateInsight } = useAI();

  useEffect(() => {
    loadData();
    addWelcomeMessage();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const { data: memoriesData } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memoriesData) setMemories(memoriesData);
    if (goalsData) setGoals(goalsData);
  };

  const addWelcomeMessage = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "Bonjour ! Je suis votre Second Brain. Je suis là pour vous aider à mémoriser, organiser et connecter vos idées.\n\nVous pouvez me demander de :\n- Noter une idée ou un apprentissage\n- Retrouver une information\n- Analyser des connexions entre vos connaissances\n- Générer des insights\n\nQue souhaitez-vous faire aujourd'hui ?",
        timestamp: new Date(),
        suggestions: [
          'Ajouter une nouvelle idée',
          'Rechercher dans mes notes',
          'Voir mes objectifs',
          'Générer un insight',
        ],
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    await processUserIntent(userMessage.content);
    setIsTyping(false);
  };

  const processUserIntent = async (message: string) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('ajouter') || lowerMessage.includes('note') || lowerMessage.includes('mémoriser') || lowerMessage.includes('nouveau')) {
      await handleMemoryCreation(message);
    } else if (lowerMessage.includes('rechercher') || lowerMessage.includes('trouver') || lowerMessage.includes('chercher')) {
      await handleSearch(message);
    } else if (lowerMessage.includes('objectif') || lowerMessage.includes('but') || lowerMessage.includes('goal')) {
      await handleGoalQuery(message);
    } else if (lowerMessage.includes('insight') || lowerMessage.includes('analyse') || lowerMessage.includes('connexion')) {
      await handleInsightRequest();
    } else if (lowerMessage.includes('résumé') || lowerMessage.includes('synthèse')) {
      await handleSummary();
    } else if (lowerMessage.includes('décision') || lowerMessage.includes('choisir') || lowerMessage.includes('choix') || lowerMessage.includes('décider')) {
      await handleDecision(message);
    } else if (lowerMessage.includes('aide') || lowerMessage.includes('comment')) {
      await handleHelp();
    } else {
      await handleGeneralQuery(message);
    }
  };

  const handleMemoryCreation = async (message: string) => {
    const contentMatch = message.match(/(?:ajouter|note|mémoriser|nouveau)[:\s]+(.+)/i) || message.match(/["'](.+)["']/);
    const content = contentMatch ? contentMatch[1].trim() : message;

    const keywords = extractKeywords(content);
    const detectedCategory = detectCategory(content, keywords);

    const response: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `J'ai trouvé un contenu à mémoriser. Laissez-moi l'analyser...\n\n📝 **Contenu détecté :**\n"${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"\n\n🏷️ **Catégorie suggérée :** ${detectedCategory.label}\n📌 **Tags détectés :** ${keywords.slice(0, 5).join(', ')}`,
      timestamp: new Date(),
      suggestions: ['Confirmer et sauvegarder', 'Changer la catégorie', 'Ajouter des tags personnalisés', 'Annuler'],
    };

    setMessages((prev) => [...prev, response]);
  };

  const handleSearch = async (message: string) => {
    const searchTerms = message
      .replace(/(?:rechercher|trouver|chercher)[:\s]+/i, '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const results = memories.filter(m =>
      searchTerms.some(term =>
        m.title.toLowerCase().includes(term) ||
        m.content.toLowerCase().includes(term) ||
        m.tags.some(t => t.toLowerCase().includes(term))
      )
    );

    if (results.length > 0) {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🔍 J'ai trouvé ${results.length} résultat${results.length > 1 ? 's' : ''} correspondant à votre recherche :\n\n${results.slice(0, 5).map((m, i) => `**${i + 1}. ${m.title}**\n_${m.content.substring(0, 100)}..._\n📊 Catégorie: ${m.category} | 📅 ${formatDate(m.created_at)}`).join('\n\n')}`,
        timestamp: new Date(),
        relatedItems: results.slice(0, 5).map(m => ({ type: 'memory' as const, title: m.title })),
      };
      setMessages((prev) => [...prev, response]);
    } else {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🔍 Je n'ai pas trouvé de résultats correspondants dans votre base de connaissances.\n\nEssayez avec d'autres termes ou ajoutez de nouvelles informations à mémoriser.",
        timestamp: new Date(),
        suggestions: ['Ajouter cette information', 'Rechercher autre chose', 'Voir toutes mes notes'],
      };
      setMessages((prev) => [...prev, response]);
    }
  };

  const handleGoalQuery = async (message: string) => {
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*, milestones(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (goalsData && goalsData.length > 0) {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🎯 Vous avez ${goalsData.length} objectif${goalsData.length > 1 ? 's' : ''} actif${goalsData.length > 1 ? 's' : ''} :\n\n${goalsData.map((g, i) => {
          const milestoneCount = g.milestones?.length || 0;
          const completedMilestones = g.milestones?.filter((m: { completed: boolean }) => m.completed).length || 0;
          return `**${i + 1}. ${g.title}**\n📊 Progression: ${g.progress}%\n✅ ${completedMilestones}/${milestoneCount} étapes\n📅 ${g.target_date ? formatDate(g.target_date) : 'Pas de date limite'}`;
        }).join('\n\n')}`,
        timestamp: new Date(),
        relatedItems: goalsData.map(g => ({ type: 'goal' as const, title: g.title })),
      };
      setMessages((prev) => [...prev, response]);
    } else {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "🎯 Vous n'avez pas encore d'objectifs actifs. Voulez-vous en créer un nouveau ?",
        timestamp: new Date(),
        suggestions: ['Créer un nouvel objectif', 'Voir tous mes objectifs', 'Comment définir un objectif'],
      };
      setMessages((prev) => [...prev, response]);
    }
  };

  const handleInsightRequest = async () => {
    const insight = await generateInsight();
    if (insight) {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `💡 **${insight.title}**\n\n${insight.content}\n\n${insight.actionable && insight.action_suggestion ? `✨ Suggestion d'action : ${insight.action_suggestion}` : ''}`,
        timestamp: new Date(),
        suggestions: ['Générer un autre insight', 'Voir tous les insights', 'Explorer les connexions'],
      };
      setMessages((prev) => [...prev, response]);
    } else {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "💡 Je n'ai pas encore suffisamment de données pour générer des insights pertinents. Ajoutez plus de notes et d'idées pour que je puisse découvrir des connexions intéressantes !",
        timestamp: new Date(),
        suggestions: ['Ajouter une note', 'Créer un objectif', 'En savoir plus'],
      };
      setMessages((prev) => [...prev, response]);
    }
  };

  const handleDecision = async (message: string) => {
    const decisionMatch = message.match(/(?:décision|choisir|choix|décider)[:\s]+(.+)/i);
    const decisionTopic = decisionMatch ? decisionMatch[1].trim() : message;
    const keywords = extractKeywords(decisionTopic);

    const relevantGoals = goals.filter(g =>
      g.status === 'active' &&
      (g.title.toLowerCase().includes(decisionTopic.toLowerCase()) ||
       (g.description && g.description.toLowerCase().includes(decisionTopic.toLowerCase())) ||
       keywords.some(kw => g.title.toLowerCase().includes(kw)))
    );

    const relevantMemories = memories.filter(m =>
      m.content.toLowerCase().includes(decisionTopic.toLowerCase()) ||
      keywords.some(kw => m.content.toLowerCase().includes(kw) || m.tags.some(t => t.toLowerCase().includes(kw)))
    ).slice(0, 5);

    let analysis = `🤔 **Analyse de décision : "${decisionTopic.substring(0, 100)}"**\n\n`;

    if (relevantGoals.length > 0) {
      analysis += `**🎯 Objectifs liés à cette décision:**\n`;
      relevantGoals.forEach((g, i) => {
        analysis += `${i + 1}. ${g.title} (${g.progress}% complété)\n`;
      });
      analysis += '\n';
    }

    if (relevantMemories.length > 0) {
      analysis += `**📌 Contexte pertinent de votre base:**\n`;
      relevantMemories.forEach((m, i) => {
        analysis += `${i + 1}. ${m.title}\n   _${m.content.substring(0, 80)}..._\n`;
      });
      analysis += '\n';
    }

    analysis += `**⚖️ Facteurs à considérer:**\n`;
    analysis += `• **Avantages potentiels:** De nouvelles opportunités\n`;
    analysis += `• **Risques potentiels:** Investissement en temps/ressources\n`;
    analysis += `• **Impact sur vos objectifs:** ${relevantGoals.length > 0 ? 'Aligné avec vos objectifs actuels' : 'À évaluer selon vos priorités'}\n\n`;

    analysis += `**📋 Plan d'action suggéré:**\n`;
    analysis += `1. Listez les options possibles\n`;
    analysis += `2. Évaluez chaque option (avantages/inconvénients)\n`;
    analysis += `3. Considérez l'impact à court et long terme\n`;
    analysis += `4. Fixez une date limite de décision\n`;
    analysis += `5. Prenez la décision et documentez-la`;

    const response: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: analysis,
      timestamp: new Date(),
      suggestions: [
        'Explorer les alternatives',
        'Fixer une date limite',
        'Demander un autre point de vue',
        'Mémoriser cette décision',
      ],
    };
    setMessages((prev) => [...prev, response]);
  };

  const handleSummary = async () => {
    const recentMemories = memories.slice(0, 10);
    const categoriesCount = new Map<string, number>();
    recentMemories.forEach(m => categoriesCount.set(m.category, (categoriesCount.get(m.category) || 0) + 1));

    const response: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `📊 **Résumé de votre base de connaissances**\n\n📝 Total de notes : ${memories.length}\n🎯 Objectifs actifs : ${goals.length}\n\n**Catégories principales :**\n${Array.from(categoriesCount.entries()).map(([cat, count]) => `• ${cat}: ${count} éléments`).join('\n')}\n\n**Dernières notes ajoutées :**\n${recentMemories.slice(0, 3).map((m, i) => `${i + 1}. ${m.title}`).join('\n')}`,
      timestamp: new Date(),
      suggestions: ['Voir toutes les notes', 'Explorer par catégorie', 'Générer des insights'],
    };
    setMessages((prev) => [...prev, response]);
  };

  const handleHelp = async () => {
    const response: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "📚 **Comment utiliser Second Brain**\n\n**📝 Mémoriser des informations :**\n• \"Ajoute une note sur...\"\n• \"Mémorise que...\"\n• \"Nouvelle idée : ...\"\n\n**🔍 Rechercher :**\n• \"Trouve des notes sur...\"\n• \"Recherche ...\"\n\n**🎯 Objectifs :**\n• \"Montre mes objectifs\"\n• \"Créer un objectif pour...\"\n\n**💡 Insights :**\n• \"Génère un insight\"\n• \"Analyse mes connexions\"\n\n**🤔 Décisions :**\n• \"Aide-moi à décider...\"\n• \"J'hésite entre...\"\n\n**🎓 Révision :**\nAllez dans l'onglet Apprentissage pour réviser vos cartes",
      timestamp: new Date(),
      suggestions: ['Ajouter une note', 'Voir mes objectifs', 'Générer un insight', 'Aide à la décision'],
    };
    setMessages((prev) => [...prev, response]);
  };

  const handleGeneralQuery = async (message: string) => {
    const keywords = extractKeywords(message);
    const relevantMemories = memories.filter(m =>
      keywords.some(kw =>
        m.content.toLowerCase().includes(kw) ||
        m.tags.some(t => t.toLowerCase().includes(kw))
      )
    ).slice(0, 3);

    let responseContent = "Je réfléchis à votre message...\n\n";

    if (relevantMemories.length > 0) {
      responseContent += "📌 **Notes pertinentes trouvées :**\n";
      relevantMemories.forEach((m, i) => {
        responseContent += `\n${i + 1}. **${m.title}**\n   _${m.content.substring(0, 80)}..._\n`;
      });
      responseContent += "\n";
    }

    responseContent += "Je peux vous aider à :\n- Noter cette information dans votre base\n- L'analyser pour des connexions\n- Créer un objectif lié";

    const response: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      suggestions: ['Mémoriser ceci', 'Créer un objectif', 'Analyser les connexions'],
    };
    setMessages((prev) => [...prev, response]);
  };

  const detectCategory = (content: string, keywords: string[]): typeof categories[0] => {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('projet') || lowerContent.includes('développer') || lowerContent.includes('créer')) {
      return categories.find(c => c.id === 'projects')!;
    }
    if (lowerContent.includes('apprendre') || lowerContent.includes('cours') || lowerContent.includes('livre') || lowerContent.includes('étude')) {
      return categories.find(c => c.id === 'learning')!;
    }
    if (lowerContent.includes('idée') || lowerContent.includes('concept') || lowerContent.includes('penser')) {
      return categories.find(c => c.id === 'ideas')!;
    }
    if (lowerContent.includes('objectif') || lowerContent.includes('but') || lowerContent.includes('goal')) {
      return categories.find(c => c.id === 'goals')!;
    }
    if (lowerContent.includes('expérience') || lowerContent.includes('vécu') || lowerContent.includes('voyage')) {
      return categories.find(c => c.id === 'experiences')!;
    }
    if (lowerContent.includes('conversation') || lowerContent.includes('discussion') || lowerContent.includes('réunion')) {
      return categories.find(c => c.id === 'conversations')!;
    }

    return categories.find(c => c.id === 'general')!;
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Conversation</h2>
            <p className="text-sm text-slate-400">Parlez avec votre Second Brain</p>
          </div>
          {isTyping && (
            <div className="ml-auto flex items-center gap-2 text-emerald-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Réflexion en cours...
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[70%] ${message.role === 'user' ? 'order-1' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.split('**').map((part, j) =>
                        j % 2 === 1 ? <strong key={j} className="text-emerald-400">{part}</strong> : part
                      )}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>

              {message.suggestions && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 order-2">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Écrivez votre message..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
