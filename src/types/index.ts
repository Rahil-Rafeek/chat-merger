// ============================================================
// Core Types for AI Chat Merger Application
// ============================================================

// --- User ---
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// --- Conversation ---
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
  messageCount?: number;
  preview?: string;
  isMerged?: boolean;
  mergeSummary?: string | null;
  mergeSourceIds?: string[];
}

// --- Message ---
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  sequenceNumber: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  sourceChatId?: string;
  sourceMessageIds?: string[];
}

// --- Merge ---
export interface MergePreview {
  conversationCount: number;
  messageCount: number;
  topics: string[];
  importantDecisions: string[];
  conflicts: ConflictInfo[];
  unresolvedQuestions: string[];
  estimatedTokens: number;
  conversations: MergeConversationSummary[];
}

export interface MergeConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  preview: string;
}

export interface ConflictInfo {
  topic: string;
  sourceA: { chatId: string; chatTitle: string; statement: string };
  sourceB: { chatId: string; chatTitle: string; statement: string };
  resolution?: string;
}

export type MergeMode = 'standard' | 'smart';

export interface MergeRequest {
  conversationIds: string[];
  mode: MergeMode;
}

export interface MergeResult {
  mergedConversation: Conversation;
  summary: MergeSummary;
}

export interface MergeSummary {
  conversationCount: number;
  mainTopics: string[];
  importantDecisions: string[];
  conflicts: ConflictInfo[];
  unresolvedTopics: string[];
  sourceConversations: { id: string; title: string }[];
}

// --- Merge Progress ---
export type MergeStepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface MergeStep {
  id: string;
  label: string;
  status: MergeStepStatus;
}

export const MERGE_STEPS: Omit<MergeStep, 'status'>[] = [
  { id: 'read', label: 'Reading conversations' },
  { id: 'extract', label: 'Extracting important information' },
  { id: 'deduplicate', label: 'Removing duplicates' },
  { id: 'conflicts', label: 'Detecting conflicts' },
  { id: 'context', label: 'Creating unified context' },
  { id: 'create', label: 'Creating merged conversation' },
];

// --- AI Service ---
export interface ConversationAnalysis {
  mainTopic: string;
  subtopics: string[];
  userRequirements: string[];
  decisions: string[];
  preferences: string[];
  importantFacts: string[];
  questions: string[];
  answers: string[];
  tasks: string[];
  constraints: string[];
  technicalInfo: string[];
  unresolvedIssues: string[];
}

export interface UnifiedContext {
  project: string;
  goals: string[];
  userRequirements: string[];
  preferences: string[];
  decisions: string[];
  technicalDetails: string[];
  conversationHistory: string[];
  unresolvedQuestions: string[];
  conflicts: ConflictInfo[];
  nextSteps: string[];
}

// --- API ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Theme ---
export type Theme = 'light' | 'dark';

// --- Search ---
export interface SearchResult {
  conversation: Conversation;
  matchedMessages: Message[];
  relevanceScore: number;
}
