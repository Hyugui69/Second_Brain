import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AIProvider } from './lib/ai-context';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Chat } from './components/Chat';
import { KnowledgeBase } from './components/KnowledgeBase';
import { GoalsDashboard } from './components/GoalsDashboard';
import { KnowledgeMap } from './components/KnowledgeMap';
import { Timeline } from './components/Timeline';
import { Insights } from './components/Insights';
import { Learning } from './components/Learning';
import { WeeklyReview } from './components/WeeklyReview';
import { Settings } from './components/Settings';

type View = 'chat' | 'knowledge' | 'goals' | 'map' | 'timeline' | 'settings' | 'insights' | 'learning' | 'weekly';

function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [currentView, setCurrentView] = useState<View>('chat');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setSession({ access_token: session.access_token });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setSession({ access_token: session.access_token });
      } else {
        setUser(null);
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400">Chargement de Second Brain...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={() => {}} />;
  }

  return (
    <AIProvider userId={user.id}>
      <Layout
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        user={user}
        onLogout={handleLogout}
      >
        {currentView === 'chat' && <Chat userId={user.id} />}
        {currentView === 'knowledge' && <KnowledgeBase userId={user.id} />}
        {currentView === 'goals' && <GoalsDashboard userId={user.id} />}
        {currentView === 'map' && <KnowledgeMap userId={user.id} />}
        {currentView === 'timeline' && <Timeline userId={user.id} />}
        {currentView === 'insights' && <Insights userId={user.id} />}
        {currentView === 'learning' && <Learning userId={user.id} />}
        {currentView === 'weekly' && <WeeklyReview userId={user.id} />}
        {currentView === 'settings' && (
          <Settings
            userId={user.id}
            userEmail={user.email}
            onLogout={handleLogout}
          />
        )}
      </Layout>
    </AIProvider>
  );
}

export default App;
