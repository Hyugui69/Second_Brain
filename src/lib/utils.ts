export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(d);
}

export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
    'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
    'ce', 'cette', 'ces', 'cet', 'son', 'sa', 'ses', 'mon', 'ma', 'mes',
    'ton', 'ta', 'tes', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'lui', 'y', 'en',
    'pour', 'par', 'avec', 'sans', 'dans', 'sur', 'sous', 'entre',
    'vers', 'chez', 'contre', 'après', 'avant', 'depuis', 'pendant',
    'est', 'sont', 'être', 'avoir', 'fait', 'faire', 'peut', 'tout',
    'cela', 'ceci', 'cet', 'cette', 'ainsi', 'alors', 'aussi', 'très',
    'plus', 'moins', 'comme', 'dont', 'quand', 'si', 'où', 'comment',
    'pourquoi', 'combien', 'quel', 'quelle', 'quels', 'quelles'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(extractKeywords(text1));
  const words2 = new Set(extractKeywords(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  return intersection.size / Math.min(words1.size, words2.size);
}

export const categories = [
  { id: 'ideas', label: 'Idées', color: 'bg-amber-500' },
  { id: 'projects', label: 'Projets', color: 'bg-blue-500' },
  { id: 'learning', label: 'Apprentissage', color: 'bg-green-500' },
  { id: 'experiences', label: 'Expériences', color: 'bg-purple-500' },
  { id: 'books', label: 'Livres', color: 'bg-rose-500' },
  { id: 'conversations', label: 'Conversations', color: 'bg-cyan-500' },
  { id: 'goals', label: 'Objectifs', color: 'bg-orange-500' },
  { id: 'general', label: 'Général', color: 'bg-slate-500' },
];

export function getCategoryColor(category: string): string {
  const found = categories.find(c => c.id === category);
  return found?.color || 'bg-slate-500';
}

export function generateId(): string {
  return crypto.randomUUID();
}
