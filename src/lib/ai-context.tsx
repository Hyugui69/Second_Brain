import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase, Memory, Goal, Insight } from './supabase';
import { extractKeywords, calculateSimilarity, generateId } from './utils';

type AIContextType = {
  isProcessing: boolean;
  lastInsight: Insight | null;
  processContent: (content: string, type: 'memory' | 'goal') => Promise<void>;
  generateConnections: (memories: Memory[], goals: Goal[]) => Promise<void>;
  generateInsight: () => Promise<Insight | null>;
};

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInsight, setLastInsight] = useState<Insight | null>(null);

  const processContent = useCallback(async (content: string, type: 'memory' | 'goal') => {
    setIsProcessing(true);
    try {
      const keywords = extractKeywords(content);

      const { data: existingMemories } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId);

      if (existingMemories && existingMemories.length > 0) {
        for (const memory of existingMemories.slice(0, 20)) {
          const similarity = calculateSimilarity(content, memory.content);
          if (similarity > 0.3) {
            await supabase.from('connections').insert({
              user_id: userId,
              source_id: type === 'memory' ? generateId() : '',
              source_type: type,
              target_id: memory.id,
              target_type: 'memory',
              connection_type: similarity > 0.6 ? 'strong' : 'weak',
              strength: Math.round(similarity * 10),
              description: 'Connexion détectée automatiquement',
              ai_discovered: true,
            });
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const generateConnections = useCallback(async (memories: Memory[], goals: Goal[]) => {
    setIsProcessing(true);
    try {
      const connections: Array<{ source: string; target: string; strength: number }> = [];

      for (let i = 0; i < memories.length; i++) {
        for (let j = i + 1; j < memories.length; j++) {
          const similarity = calculateSimilarity(memories[i].content, memories[j].content);
          if (similarity > 0.4) {
            connections.push({
              source: memories[i].id,
              target: memories[j].id,
              strength: Math.round(similarity * 10),
            });
          }
        }
      }

      for (const goal of goals) {
        for (const memory of memories) {
          if (goal.description && goal.title) {
            const combined = `${goal.title} ${goal.description}`;
            const similarity = calculateSimilarity(combined, memory.content);
            if (similarity > 0.35) {
              connections.push({
                source: goal.id,
                target: memory.id,
                strength: Math.round(similarity * 10),
              });
            }
          }
        }
      }

      for (const conn of connections) {
        await supabase.from('connections').upsert({
          user_id: userId,
          source_id: conn.source,
          source_type: memories.find(m => m.id === conn.source) ? 'memory' : 'goal',
          target_id: conn.target,
          target_type: 'memory',
          connection_type: conn.strength > 7 ? 'strong' : 'related',
          strength: conn.strength,
          description: 'Connexion découverte par analyse de similarité',
          ai_discovered: true,
        }, { onConflict: 'source_id,target_id,user_id' });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const generateInsight = useCallback(async (): Promise<Insight | null> => {
    setIsProcessing(true);
    try {
      const { data: memories } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!memories || memories.length < 3) return null;

      const categories = new Map<string, number>();
      memories.forEach(m => {
        categories.set(m.category, (categories.get(m.category) || 0) + 1);
      });

      const topCategories = Array.from(categories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      let insightContent = '';
      let insightType = 'pattern';
      let isActionable = false;
      let actionSuggestion = '';
      const relatedMemories: string[] = [];
      const relatedGoals: string[] = [];

      if (topCategories.length > 0) {
        const [topCat, count] = topCategories[0];
        if (count >= 3) {
          insightContent = `Vous avez enregistré ${count} éléments dans la catégorie "${topCat}". Cela suggère un fort intérêt pour ce domaine.`;
          insightType = 'pattern';
          isActionable = true;
          actionSuggestion = `Considérez définir un objectif spécifique lié à ${topCat} pour structurer votre apprentissage.`;
          relatedMemories.push(...memories.filter(m => m.category === topCat).slice(0, 5).map(m => m.id));
        }
      }

      const recentlyCreated = memories.filter(m => {
        const created = new Date(m.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created > weekAgo;
      });

      if (recentlyCreated.length >= 5 && goals && goals.filter(g => g.status === 'active').length === 0) {
        insightContent = `Vous avez ajouté ${recentlyCreated.length} éléments cette semaine sans objectif actif. Définir des objectifs pourrait aider à structurer vos efforts.`;
        insightType = 'suggestion';
        isActionable = true;
        actionSuggestion = 'Créez un nouvel objectif pour canaliser votre énergie créative.';
      }

      const keywords = new Map<string, number>();
      memories.forEach(m => {
        extractKeywords(m.content).forEach(kw => {
          keywords.set(kw, (keywords.get(kw) || 0) + 1);
        });
      });

      const recurringTopics = Array.from(keywords.entries())
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1]);

      if (recurringTopics.length >= 2) {
        const topTopics = recurringTopics.slice(0, 3).map(([kw]) => kw);
        insightContent = `Thèmes récurrents détectés : ${topTopics.join(', ')}. Ces éléments pourraient être connectés.`;
        insightType = 'connection';
        isActionable = true;
        actionSuggestion = 'Créez une note synthèse reliant ces thèmes pour une vue unifiée.';
      }

      if (!insightContent) return null;

      const insight = {
        user_id: userId,
        title: insightType === 'pattern' ? 'Motif détecté' :
               insightType === 'connection' ? 'Connexion potentielle' : 'Suggestion',
        content: insightContent,
        insight_type: insightType,
        related_memories: relatedMemories,
        related_goals: relatedGoals,
        actionable: isActionable,
        action_suggestion: actionSuggestion,
        acknowledged: false,
      };

      const { data: insertedInsight } = await supabase
        .from('insights')
        .insert(insight)
        .select()
        .single();

      if (insertedInsight) {
        setLastInsight(insertedInsight);
        return insertedInsight;
      }

      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  return (
    <AIContext.Provider value={{ isProcessing, lastInsight, processContent, generateConnections, generateInsight }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}
