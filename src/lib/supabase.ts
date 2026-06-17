import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Memory = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  importance: number;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
  review_count: number;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  timeframe: string;
  status: string;
  progress: number;
  parent_goal_id: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export type TimelineEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  related_memory_id: string | null;
  related_goal_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Connection = {
  id: string;
  user_id: string;
  source_id: string;
  source_type: string;
  target_id: string;
  target_type: string;
  connection_type: string;
  strength: number;
  description: string | null;
  ai_discovered: boolean;
  created_at: string;
};

export type Insight = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  insight_type: string;
  related_memories: string[];
  related_goals: string[];
  actionable: boolean;
  action_suggestion: string | null;
  acknowledged: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LearningItem = {
  id: string;
  user_id: string;
  memory_id: string | null;
  question: string;
  answer: string;
  difficulty: number;
  last_practiced_at: string | null;
  practice_count: number;
  success_rate: number;
  next_review_at: string | null;
  created_at: string;
};
