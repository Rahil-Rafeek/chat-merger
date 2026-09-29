'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus,
  Search,
  Send,
  Moon,
  Sun,
  Menu,
  X,
  MessageSquare,
  GitMerge,
  Trash2,
  Edit3,
  Copy,
  Download,
  MoreHorizontal,
  Check,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Zap,
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
  ExternalLink,
  Undo2,
  Bot,
  User as UserIcon,
  Settings,
} from 'lucide-react';
import { useConversations, useChat, useMerge, useTheme } from '@/hooks';
import { Conversation, MergeStep, MERGE_STEPS } from '@/types';

// ===== Helper: Format Date Group =====
function getDateGroup(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  if (diffDays <= 30) return 'Previous 30 Days';
  return 'Older';
}

function groupConversations(convs: Conversation[]): Map<string, Conversation[]> {
  const groups = new Map<string, Conversation[]>();
  const order = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];
  order.forEach(g => groups.set(g, []));
  
  convs.forEach(c => {
    const group = getDateGroup(new Date(c.updatedAt));
    const arr = groups.get(group) || [];
    arr.push(c);
    groups.set(group, arr);
  });
  
  // Remove empty groups
  for (const [key, val] of groups) {
    if (val.length === 0) groups.delete(key);
  }
  return groups;
}

// ===== Main App Component =====
export default function ChatMergerApp() {
  // State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Hooks
  const {
    conversations, loading: convsLoading, fetchConversations,
    createConversation, deleteConversation, renameConversation, duplicateConversation,
  } = useConversations();
  
  const {
    conversation: activeConversation, loading: chatLoading, sending,
    fetchConversation, sendMessage, setConversation: setActiveConversation,
  } = useChat(activeConversationId);
  
  const merge = useMerge();
  const { theme, toggleTheme, initTheme } = useTheme();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Init
  useEffect(() => {
    initTheme();
    fetchConversations();
  }, []);
  
  // Fetch active conversation when ID changes
  useEffect(() => {
    if (activeConversationId) {
      fetchConversation();
    }
  }, [activeConversationId, fetchConversation]);
  
  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);
  
  // Close context menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  // Search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchConversations(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);
  
  // Handlers
  const handleNewChat = async () => {
    const conv = await createConversation('New Chat');
    if (conv) {
      setActiveConversationId(conv.id);
      setSidebarOpen(false);
      if (mergeMode) {
        setMergeMode(false);
        merge.clearSelection();
      }
    }
  };
  
  const handleSelectConversation = (id: string) => {
    if (mergeMode) {
      merge.toggleSelection(id);
    } else {
      setActiveConversationId(id);
      setSidebarOpen(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;
    const msg = inputValue.trim();
    setInputValue('');
    
    // If no active conversation, create one
    let convId = activeConversationId;
    if (!convId) {
      const title = msg.substring(0, 50) + (msg.length > 50 ? '...' : '');
      const conv = await createConversation(title);
      if (conv) {
        convId = conv.id;
        setActiveConversationId(conv.id);
      } else return;
    }
    
    await sendMessage(msg);
    await fetchConversations(); // Refresh sidebar
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setActiveConversation(null);
    }
    setDeleteConfirmId(null);
    setContextMenuId(null);
  };
  
  const handleRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameConversation(renamingId, renameValue.trim());
      setRenamingId(null);
    }
  };
  
  const handleDuplicate = async (id: string) => {
    await duplicateConversation(id);
    setContextMenuId(null);
  };
  
  const handleExport = (conv: Conversation) => {
    const fullConv = conversations.find(c => c.id === conv.id);
    if (!fullConv) return;
    const text = `# ${fullConv.title}\n\nExported: ${new Date().toLocaleString()}\n\n---\n\n` +
      (activeConversation?.messages || [])
        .filter(m => m.role !== 'system')
        .map(m => `**${m.role === 'user' ? 'You' : 'AI'}:**\n${m.content}\n`)
        .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullConv.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setContextMenuId(null);
  };
  
  const handleEnterMergeMode = () => {
    setMergeMode(true);
    merge.clearSelection();
  };
  
  const handleExitMergeMode = () => {
    setMergeMode(false);
    merge.clearSelection();
  };
  
  const handleMergePreview = async () => {
    await merge.fetchPreview();
  };
  
  const handleExecuteMerge = async () => {
    const newId = await merge.executeMerge();
    if (newId) {
      await fetchConversations();
    }
  };
  
  const handleOpenMerged = () => {
    if (merge.mergedConversationId) {
      setActiveConversationId(merge.mergedConversationId);
      setMergeMode(false);
      merge.clearSelection();
    }
  };
  
  const handleUndoMerge = async () => {
    const success = await merge.undoMerge();
    if (success) {
      if (activeConversationId === merge.mergedConversationId) {
        setActiveConversationId(null);
        setActiveConversation(null);
      }
      await fetchConversations();
    }
  };
  
  const grouped = groupConversations(conversations);
  
  // Visible messages (filter out system messages for display)
  const visibleMessages = (activeConversation?.messages || []).filter(m => m.role !== 'system');
  
  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {mergeMode ? (
          // Merge Selection Mode
          <>
            <div className="merge-mode-header">
              <div className="merge-mode-title">Select conversations to merge</div>
              <div className="merge-mode-subtitle">Choose 2 or more conversations</div>
            </div>
            <div className="sidebar-content">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-item ${merge.selectedIds.has(conv.id) ? 'active' : ''}`}
                  onClick={() => merge.toggleSelection(conv.id)}
                >
                  <input
                    type="checkbox"
                    className="merge-checkbox"
                    checked={merge.selectedIds.has(conv.id)}
                    onChange={() => merge.toggleSelection(conv.id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="conversation-item-content">
                    <div className="conversation-item-title">{conv.title}</div>
                    <div className="conversation-item-meta">
                      {conv.messageCount} messages · {new Date(conv.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {conv.isMerged && (
                    <span className="conversation-item-badge">Merged</span>
                  )}
                </div>
              ))}
            </div>
            <div className="merge-selection-bar">
              <div className="merge-selected-count">
                Selected: {merge.selectedIds.size}
              </div>
              {/* Merge Mode Selector */}
              <div className="merge-mode-selector">
                <div
                  className={`merge-mode-option ${merge.mode === 'standard' ? 'selected' : ''}`}
                  onClick={() => merge.setMode('standard')}
                >
                  <div className="merge-mode-option-title">⚡ Standard</div>
                  <div className="merge-mode-option-desc">Preserves context</div>
                </div>
                <div
                  className={`merge-mode-option ${merge.mode === 'smart' ? 'selected' : ''}`}
                  onClick={() => merge.setMode('smart')}
                >
                  <div className="merge-mode-option-title">🧠 Smart</div>
                  <div className="merge-mode-option-desc">AI-optimized</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={handleExitMergeMode}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  disabled={merge.selectedIds.size < 2 || merge.loading}
                  onClick={handleMergePreview}
                >
                  {merge.loading ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <>Merge {merge.selectedIds.size > 0 ? `(${merge.selectedIds.size})` : ''}</>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          // Normal Sidebar Mode
          <>
            <div className="sidebar-header">
              <button className="btn-new-chat" onClick={handleNewChat}>
                <Plus size={18} />
                New Chat
              </button>
            </div>
            <div className="search-container" style={{ paddingTop: '12px' }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="sidebar-content">
              {convsLoading && conversations.length === 0 ? (
                // Skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="conversation-item">
                    <div className="conversation-item-content">
                      <div className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 30}%` }} />
                      <div className="skeleton skeleton-text" style={{ width: '40%', height: '10px' }} />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <div className="empty-state-text">
                    {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                  </div>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([group, convs]) => (
                  <div key={group} className="conversation-group">
                    <div className="conversation-group-label">{group}</div>
                    {convs.map(conv => (
                      <div
                        key={conv.id}
                        className={`conversation-item ${activeConversationId === conv.id ? 'active' : ''}`}
                        onClick={() => handleSelectConversation(conv.id)}
                      >
                        <MessageSquare size={16} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                        <div className="conversation-item-content">
                          {renamingId === conv.id ? (
                            <input
                              type="text"
                              className="rename-input"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={handleRename}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRename();
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <div className="conversation-item-title">{conv.title}</div>
                          )}
                          {!renamingId && (
                            <div className="conversation-item-meta">
                              {conv.messageCount || 0} msgs
                            </div>
                          )}
                        </div>
                        {conv.isMerged && (
                          <span className="conversation-item-badge">
                            <GitMerge size={8} /> Merged
                          </span>
                        )}
                        <div className="conversation-item-actions" style={{ position: 'relative' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={e => {
                              e.stopPropagation();
                              setContextMenuId(contextMenuId === conv.id ? null : conv.id);
                            }}
                            style={{ padding: '4px' }}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {contextMenuId === conv.id && (
                            <div className="context-menu" ref={contextMenuRef} onClick={e => e.stopPropagation()}>
                              <button
                                className="context-menu-item"
                                onClick={() => {
                                  setRenamingId(conv.id);
                                  setRenameValue(conv.title);
                                  setContextMenuId(null);
                                }}
                              >
                                <Edit3 size={14} /> Rename
                              </button>
                              <button
                                className="context-menu-item"
                                onClick={() => handleDuplicate(conv.id)}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button
                                className="context-menu-item"
                                onClick={() => handleExport(conv)}
                              >
                                <Download size={14} /> Export
                              </button>
                              <button
                                className="context-menu-item danger"
                                onClick={() => {
                                  setDeleteConfirmId(conv.id);
                                  setContextMenuId(null);
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="sidebar-footer">
              <button
                className="btn btn-secondary btn-full btn-sm"
                style={{ marginBottom: '8px', justifyContent: 'flex-start', gap: '8px' }}
                onClick={handleEnterMergeMode}
              >
                <GitMerge size={16} />
                Merge Chats
              </button>
              <button
                className="btn btn-ghost btn-full btn-sm"
                style={{ justifyContent: 'flex-start', gap: '8px' }}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </>
        )}
      </aside>
      
      {/* ===== MAIN CONTENT ===== */}
      <main className="main-content">
        {/* Header */}
        <div className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <div className="main-header-title">
              {activeConversation ? (
                <>
                  <MessageSquare size={18} />
                  {activeConversation.title}
                  {activeConversation.isMerged && (
                    <span className="conversation-item-badge" style={{ fontSize: '10px' }}>
                      <GitMerge size={10} /> Merged
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                  AI Chat Merger
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
        
        {/* Chat / Welcome / Merge Flow */}
        {merge.step === 'preview' && merge.preview ? (
          // Merge Preview
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 24px' }}>
            <div className="modal" style={{ position: 'static', maxWidth: '580px', width: '100%' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => merge.setStep('select')}>
                    <ArrowLeft size={16} />
                  </button>
                  <div className="modal-title">Merge Conversations</div>
                </div>
                <div className="modal-subtitle">Review before merging</div>
              </div>
              <div className="modal-body">
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  You selected:
                </div>
                {merge.preview.conversations.map((c, i) => (
                  <div key={c.id} className="preview-conv-item">
                    <div>
                      <div className="preview-conv-title">{i + 1}. {c.title}</div>
                    </div>
                    <div className="preview-conv-meta">{c.messageCount} messages</div>
                  </div>
                ))}
                
                <div className="preview-stats">
                  <div className="preview-stat" style={{ flex: 1 }}>
                    <div className="preview-stat-value">{merge.preview.conversationCount}</div>
                    <div className="preview-stat-label">Conversations</div>
                  </div>
                  <div className="preview-stat" style={{ flex: 1 }}>
                    <div className="preview-stat-value">{merge.preview.messageCount}</div>
                    <div className="preview-stat-label">Messages</div>
                  </div>
                  <div className="preview-stat" style={{ flex: 1 }}>
                    <div className="preview-stat-value">{merge.preview.estimatedTokens.toLocaleString()}</div>
                    <div className="preview-stat-label">Est. Tokens</div>
                  </div>
                </div>

                {merge.preview.topics.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      Topics detected:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {merge.preview.topics.map(t => (
                        <span key={t} style={{
                          padding: '4px 10px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {merge.preview.conflicts.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                      <span className="conflict-badge">
                        {merge.preview.conflicts.length} conflict{merge.preview.conflicts.length > 1 ? 's' : ''} detected
                      </span>
                    </div>
                    {merge.preview.conflicts.map((c, i) => (
                      <div key={i} style={{
                        padding: '12px',
                        background: 'var(--warning-light)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                      }}>
                        <strong>{c.topic}:</strong> {c.sourceA.statement.substring(0, 80)} vs {c.sourceB.statement.substring(0, 80)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="preview-actions">
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    AI will:
                  </div>
                  {[
                    'Combine relevant context',
                    'Remove duplicate information',
                    'Preserve important decisions',
                    'Detect contradictions',
                    'Preserve original conversations',
                  ].map(action => (
                    <div key={action} className="preview-action-item">
                      <Check size={14} className="preview-action-check" />
                      {action}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => merge.setStep('select')}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleExecuteMerge}
                  disabled={merge.loading}
                >
                  {merge.loading ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <>
                      <GitMerge size={14} /> Merge Conversations
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : merge.step === 'merging' ? (
          // Merge Progress
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 24px' }}>
            <div style={{ maxWidth: '400px', width: '100%' }}>
              <div className="merge-progress">
                <div className="merge-progress-title">
                  <Loader2 size={20} className="spin" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Merging conversations...
                </div>
                {MERGE_STEPS.map(s => {
                  const stepIndex = MERGE_STEPS.findIndex(ms => ms.id === s.id);
                  const progressIndex = MERGE_STEPS.findIndex(ms => ms.id === merge.mergeProgress);
                  let status: 'completed' | 'in_progress' | 'pending' = 'pending';
                  if (stepIndex < progressIndex) status = 'completed';
                  else if (stepIndex === progressIndex) status = 'in_progress';
                  
                  return (
                    <div key={s.id} className="merge-step">
                      <div className={`merge-step-indicator ${status}`}>
                        {status === 'completed' && <Check size={12} />}
                        {status === 'in_progress' && <Loader2 size={12} className="spin" />}
                        {status === 'pending' && <Circle size={12} />}
                      </div>
                      <span className={`merge-step-label ${status}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : merge.step === 'summary' && merge.summary ? (
          // Merge Summary
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 24px' }}>
            <div className="modal" style={{ position: 'static', maxWidth: '580px', width: '100%' }}>
              <div className="merge-summary">
                <div className="merge-summary-icon">
                  <CheckCircle2 size={28} />
                </div>
                <div className="merge-summary-title">Merge Complete</div>
                <div className="merge-summary-subtitle">
                  Merged {merge.summary.conversationCount} conversations
                </div>
                
                <div className="merge-summary-section">
                  <div className="merge-summary-section-title">
                    📋 Main Topics
                  </div>
                  <ul>
                    {merge.summary.mainTopics.slice(0, 8).map(t => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                
                {merge.summary.importantDecisions.length > 0 && (
                  <div className="merge-summary-section">
                    <div className="merge-summary-section-title">
                      ✅ Important Decisions
                    </div>
                    <ul>
                      {merge.summary.importantDecisions.slice(0, 5).map((d, i) => (
                        <li key={i}>{d.substring(0, 100)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {merge.summary.conflicts.length > 0 && (
                  <div className="merge-summary-section">
                    <div className="merge-summary-section-title">
                      <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                      Conflicts
                    </div>
                    <ul>
                      {merge.summary.conflicts.map((c, i) => (
                        <li key={i}>⚠️ {c.topic}: {c.resolution || 'Needs resolution'}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {merge.summary.unresolvedTopics.length > 0 && (
                  <div className="merge-summary-section">
                    <div className="merge-summary-section-title">
                      ❓ Unresolved Topics
                    </div>
                    <ul>
                      {merge.summary.unresolvedTopics.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="merge-summary-section">
                  <div className="merge-summary-section-title">
                    📚 Source Conversations
                  </div>
                  <ul>
                    {merge.summary.sourceConversations.map(s => (
                      <li key={s.id}>
                        <span
                          style={{ color: 'var(--primary)', cursor: 'pointer' }}
                          onClick={() => {
                            setActiveConversationId(s.id);
                            setMergeMode(false);
                            merge.clearSelection();
                          }}
                        >
                          {s.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="modal-footer" style={{ flexDirection: 'column' }}>
                <button className="btn btn-primary btn-full" onClick={handleOpenMerged}>
                  <ExternalLink size={14} /> Open Merged Chat
                </button>
                <button className="btn btn-secondary btn-full" onClick={handleUndoMerge}>
                  <Undo2 size={14} /> Undo Merge
                </button>
              </div>
            </div>
          </div>
        ) : activeConversation ? (
          // Chat View
          <>
            {/* Source References for merged chats */}
            {activeConversation.isMerged && activeConversation.mergeSourceIds && (
              <div style={{ padding: '0 24px' }}>
                <div style={{ maxWidth: '768px', margin: '0 auto' }}>
                  <div className="source-references">
                    <div className="source-references-title">Merged from</div>
                    {activeConversation.mergeSourceIds.map(sourceId => {
                      const source = conversations.find(c => c.id === sourceId);
                      return source ? (
                        <span
                          key={sourceId}
                          className="source-reference-item"
                          onClick={() => setActiveConversationId(sourceId)}
                        >
                          <ExternalLink size={10} />
                          {source.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            )}
            
            <div className="chat-container">
              <div className="chat-messages">
                {chatLoading ? (
                  // Skeleton messages
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="message">
                      <div className="skeleton skeleton-avatar" />
                      <div className="message-content">
                        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                      </div>
                    </div>
                  ))
                ) : visibleMessages.length === 0 ? (
                  <div className="empty-state" style={{ paddingTop: '80px' }}>
                    <div className="empty-state-icon">✨</div>
                    <div className="empty-state-text">Start a conversation</div>
                  </div>
                ) : (
                  visibleMessages.map(msg => (
                    <div key={msg.id} className="message">
                      <div className={`message-avatar ${msg.role}`}>
                        {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                      </div>
                      <div className="message-content">
                        <div className="message-role">
                          {msg.role === 'user' ? 'You' : 'AI Assistant'}
                        </div>
                        <div className="message-text">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="message">
                    <div className="message-avatar assistant">
                      <Bot size={16} />
                    </div>
                    <div className="message-content">
                      <div className="message-role">AI Assistant</div>
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
            
            {/* Input */}
            <div className="input-container">
              <div className="input-wrapper">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={sending}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || sending}
                >
                  {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          // Welcome Screen
          <>
            <div className="welcome-container">
              <div className="welcome-logo">
                <GitMerge size={32} color="white" />
              </div>
              <div className="welcome-title">AI Chat Merger</div>
              <div className="welcome-subtitle">
                Merge multiple AI conversations into one unified chat. 
                Select conversations, intelligently combine their context, and continue seamlessly.
              </div>
              <div className="welcome-features">
                <div className="welcome-feature" onClick={handleNewChat}>
                  <div className="welcome-feature-icon">💬</div>
                  <div className="welcome-feature-title">New Chat</div>
                  <div className="welcome-feature-desc">Start a fresh AI conversation</div>
                </div>
                <div className="welcome-feature" onClick={handleEnterMergeMode}>
                  <div className="welcome-feature-icon">🔀</div>
                  <div className="welcome-feature-title">Merge Chats</div>
                  <div className="welcome-feature-desc">Combine multiple conversations into one</div>
                </div>
                <div className="welcome-feature">
                  <div className="welcome-feature-icon">🧠</div>
                  <div className="welcome-feature-title">Smart Context</div>
                  <div className="welcome-feature-desc">AI deduplicates and resolves conflicts</div>
                </div>
              </div>
            </div>
            
            {/* Input even on welcome */}
            <div className="input-container">
              <div className="input-wrapper">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Start a new conversation..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={sending}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || sending}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      
      {/* ===== DELETE CONFIRMATION DIALOG ===== */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
                Delete Conversation
              </div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirmId)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style jsx global>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
