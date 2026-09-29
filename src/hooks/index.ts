import { useState, useCallback } from 'react';
import { Conversation, Message, MergePreview, MergeMode, MergeSummary } from '@/types';

// ===== useConversations =====
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = query
        ? `/api/conversations?q=${encodeURIComponent(query)}`
        : '/api/conversations';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      } else {
        setError(data.error || 'Failed to fetch conversations');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (title: string): Promise<Conversation | null> => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [fetchConversations]);

  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchConversations]);

  const renameConversation = useCallback(async (id: string, title: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchConversations]);

  const duplicateConversation = useCallback(async (id: string): Promise<Conversation | null> => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    duplicateConversation,
  };
}

// ===== useChat =====
export function useChat(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      const data = await res.json();
      if (data.success) {
        setConversation(data.data);
      } else {
        setError(data.error || 'Failed to fetch conversation');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!conversationId) return false;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        // Update conversation with new messages
        setConversation(prev => {
          if (!prev) return prev;
          const messages = [...(prev.messages || []), data.data.userMessage, data.data.assistantMessage];
          return { ...prev, messages, messageCount: messages.length };
        });
        return true;
      }
      setError(data.error || 'Failed to send message');
      return false;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  return {
    conversation,
    loading,
    sending,
    error,
    fetchConversation,
    sendMessage,
    setConversation,
  };
}

// ===== useMerge =====
export type MergeStep = 'select' | 'preview' | 'merging' | 'summary';

export function useMerge() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<MergeStep>('select');
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [mode, setMode] = useState<MergeMode>('standard');
  const [summary, setSummary] = useState<MergeSummary | null>(null);
  const [mergedConversationId, setMergedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeProgress, setMergeProgress] = useState<string>('');

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setStep('select');
    setPreview(null);
    setSummary(null);
    setMergedConversationId(null);
    setError(null);
    setMergeProgress('');
  }, []);

  const fetchPreview = useCallback(async (): Promise<boolean> => {
    if (selectedIds.size < 2) return false;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
        setStep('preview');
        return true;
      }
      setError(data.error || 'Failed to generate preview');
      return false;
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  const executeMerge = useCallback(async (): Promise<string | null> => {
    if (selectedIds.size < 2) return null;
    setStep('merging');
    setLoading(true);
    setError(null);

    // Simulate progress steps
    const steps = ['read', 'extract', 'deduplicate', 'conflicts', 'context', 'create'];
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setMergeProgress(steps[currentStep]);
        currentStep++;
      }
    }, 600);

    try {
      const res = await fetch('/api/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds: Array.from(selectedIds),
          mode,
        }),
      });
      const data = await res.json();

      clearInterval(progressInterval);
      setMergeProgress('create'); // Ensure final step shows

      if (data.success) {
        setSummary(data.data.summary);
        setMergedConversationId(data.data.conversation.id);
        setStep('summary');
        return data.data.conversation.id;
      }
      setError(data.error || 'Failed to merge conversations');
      return null;
    } catch (err) {
      clearInterval(progressInterval);
      setError('Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedIds, mode]);

  const undoMerge = useCallback(async (): Promise<boolean> => {
    if (!mergedConversationId) return false;
    try {
      const res = await fetch(`/api/conversations/${mergedConversationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        clearSelection();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [mergedConversationId, clearSelection]);

  return {
    selectedIds,
    step,
    preview,
    mode,
    summary,
    mergedConversationId,
    loading,
    error,
    mergeProgress,
    setMode,
    setStep,
    toggleSelection,
    clearSelection,
    fetchPreview,
    executeMerge,
    undoMerge,
  };
}

// ===== useTheme =====
export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', t === 'dark');
      localStorage.setItem('theme', t);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const initTheme = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const t = stored || preferred;
      setTheme(t);
    }
  }, [setTheme]);

  return { theme, setTheme, toggleTheme, initTheme };
}
