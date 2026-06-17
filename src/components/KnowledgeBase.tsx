import { useState, useEffect, useMemo } from 'react';
import { supabase, Memory } from '../lib/supabase';
import { categories, getCategoryColor, formatRelativeTime, formatDate } from '../lib/utils';
import {
  Search,
  Plus,
  Filter,
  Database,
  Tag,
  Calendar,
  Brain,
  FileText,
  ChevronDown,
  X,
  Edit3,
  Trash2,
  Star,
  Eye,
} from 'lucide-react';

interface KnowledgeBaseProps {
  userId: string;
}

export function KnowledgeBase({ userId }: KnowledgeBaseProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [viewingMemory, setViewingMemory] = useState<Memory | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'general', tags: '', importance: 5 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemories();
  }, [userId]);

  const loadMemories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setMemories(data);
    setLoading(false);
  };

  const filteredMemories = useMemo(() => {
    return memories.filter(memory => {
      const matchesSearch = searchQuery === '' ||
        memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = !selectedCategory || memory.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [memories, searchQuery, selectedCategory]);

  const handleAddNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const tags = newNote.tags.split(',').map(t => t.trim()).filter(t => t);

    const { data } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        title: newNote.title,
        content: newNote.content,
        category: newNote.category,
        tags,
        importance: newNote.importance,
        source: 'manual',
      })
      .select()
      .single();

    if (data) {
      setMemories(prev => [data, ...prev]);
      setNewNote({ title: '', content: '', category: 'general', tags: '', importance: 5 });
      setIsAddingNote(false);
    }
  };

  const handleUpdateMemory = async () => {
    if (!editingMemory) return;

    const tags = newNote.tags.split(',').map(t => t.trim()).filter(t => t);

    const { data } = await supabase
      .from('memories')
      .update({
        title: newNote.title,
        content: newNote.content,
        category: newNote.category,
        tags,
        importance: newNote.importance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingMemory.id)
      .select()
      .single();

    if (data) {
      setMemories(prev => prev.map(m => m.id === data.id ? data : m));
      setEditingMemory(null);
      setNewNote({ title: '', content: '', category: 'general', tags: '', importance: 5 });
    }
  };

  const handleDeleteMemory = async (id: string) => {
    await supabase.from('memories').delete().eq('id', id);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const startEdit = (memory: Memory) => {
    setEditingMemory(memory);
    setNewNote({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      tags: memory.tags.join(', '),
      importance: memory.importance,
    });
    setIsAddingNote(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Base de connaissances</h2>
              <p className="text-sm text-slate-400">{memories.length} éléments mémorisés</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsAddingNote(true);
              setEditingMemory(null);
              setNewNote({ title: '', content: '', category: 'general', tags: '', importance: 5 });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouvelle note
          </button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans vos notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all">
              <Filter className="w-4 h-4" />
              {selectedCategory ? categories.find(c => c.id === selectedCategory)?.label : 'Catégorie'}
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-4 py-2 text-sm ${!selectedCategory ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
              >
                Toutes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isAddingNote && (
        <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">{editingMemory ? 'Modifier la note' : 'Nouvelle note'}</h3>
            <button
              onClick={() => {
                setIsAddingNote(false);
                setEditingMemory(null);
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="col-span-2">
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Contenu de la note..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>
            <div>
              <select
                value={newNote.category}
                onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="text"
                value={newNote.tags}
                onChange={(e) => setNewNote(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags (séparés par des virgules)"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Importance:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newNote.importance}
                  onChange={(e) => setNewNote(prev => ({ ...prev, importance: parseInt(e.target.value) }))}
                  className="w-32 accent-emerald-500"
                />
                <span className="text-sm text-white">{newNote.importance}/10</span>
              </div>
              <button
                onClick={editingMemory ? handleUpdateMemory : handleAddNote}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
              >
                {editingMemory ? 'Mettre à jour' : 'Sauvegarder'}
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
        ) : filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">{searchQuery ? 'Aucun résultat trouvé' : 'Aucune note'}</p>
            <p className="text-sm text-slate-500">
              {searchQuery ? 'Essayez d\'autres termes' : 'Commencez par ajouter une nouvelle note'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium text-white ${getCategoryColor(memory.category)}`}>
                        {categories.find(c => c.id === memory.category)?.label || memory.category}
                      </span>
                      {memory.importance >= 8 && <Star className="w-4 h-4 text-amber-400" />}
                      <span className="text-xs text-slate-500">{formatRelativeTime(memory.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 truncate">{memory.title}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2">{memory.content}</p>
                    {memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {memory.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewingMemory(memory)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(memory)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingMemory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{viewingMemory.title}</h3>
              <button onClick={() => setViewingMemory(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium text-white ${getCategoryColor(viewingMemory.category)}`}>
                  {categories.find(c => c.id === viewingMemory.category)?.label}
                </span>
                <span className="text-sm text-slate-400">Importance: {viewingMemory.importance}/10</span>
                <span className="text-sm text-slate-400">Créé le {formatDate(viewingMemory.created_at)}</span>
              </div>
              <div className="text-slate-300 whitespace-pre-wrap">{viewingMemory.content}</div>
              {viewingMemory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {viewingMemory.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
