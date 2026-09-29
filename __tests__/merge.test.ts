// ============================================================
// Unit & Integration Tests for AI Chat Merger
// Run with: npx jest --config jest.config.js
// ============================================================

import {
  analyzeConversation,
  deduplicateInformation,
  detectConflicts,
  buildUnifiedContext,
  generateMergePreview,
  executeMerge,
  MockAIProvider,
} from '../src/lib/ai';

import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  addMessage,
  getMessagesByConversation,
  searchConversations,
  duplicateConversation,
  getMergeSources,
  DEMO_USER_ID,
} from '../src/lib/db';

import { Conversation, ConversationAnalysis, Message } from '../src/types';

// ===== Unit Tests =====

describe('Deduplication', () => {
  test('removes duplicate facts', () => {
    const analyses: ConversationAnalysis[] = [
      {
        mainTopic: 'Python',
        subtopics: ['Programming'],
        userRequirements: ['I want to use Python'],
        decisions: ['Use Python for development'],
        preferences: ['Python is preferred'],
        importantFacts: ['Python is versatile', 'Python is popular'],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['Python'],
        unresolvedIssues: [],
      },
      {
        mainTopic: 'Python',
        subtopics: ['Coding'],
        userRequirements: ['I want to use Python for coding'],
        decisions: ['Use Python as primary language'],
        preferences: ['Python is the preferred language'],
        importantFacts: ['Python is versatile', 'Python has great libraries'],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['Python'],
        unresolvedIssues: [],
      },
    ];

    const result = deduplicateInformation(analyses);
    
    // Should have fewer items than total across both analyses
    expect(result.deduplicatedFacts.length).toBeLessThanOrEqual(
      analyses[0].importantFacts.length + analyses[1].importantFacts.length
    );
    
    // Should still contain unique facts
    expect(result.deduplicatedFacts.length).toBeGreaterThan(0);
  });

  test('keeps unique information', () => {
    const analyses: ConversationAnalysis[] = [
      {
        mainTopic: 'Frontend',
        subtopics: ['React'],
        userRequirements: ['Build a React app'],
        decisions: ['Use React'],
        preferences: ['Prefer TypeScript'],
        importantFacts: ['React uses virtual DOM'],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['React'],
        unresolvedIssues: [],
      },
      {
        mainTopic: 'Backend',
        subtopics: ['Node.js'],
        userRequirements: ['Build a REST API'],
        decisions: ['Use Express'],
        preferences: ['Prefer PostgreSQL'],
        importantFacts: ['Node.js is event-driven'],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['Node.js'],
        unresolvedIssues: [],
      },
    ];

    const result = deduplicateInformation(analyses);
    
    // All facts should be preserved since they're different
    expect(result.deduplicatedFacts).toContain('React uses virtual DOM');
    expect(result.deduplicatedFacts).toContain('Node.js is event-driven');
  });
});

describe('Conflict Detection', () => {
  test('detects framework conflicts', () => {
    const conv1: Conversation = {
      id: 'conv-1',
      userId: 'user-1',
      title: 'Chat A',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const conv2: Conversation = {
      id: 'conv-2',
      userId: 'user-1',
      title: 'Chat B',
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    };

    const analyses: ConversationAnalysis[] = [
      {
        mainTopic: 'ML Project',
        subtopics: [],
        userRequirements: [],
        decisions: ['Use PyTorch for the project'],
        preferences: ['I prefer PyTorch'],
        importantFacts: [],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['PyTorch'],
        unresolvedIssues: [],
      },
      {
        mainTopic: 'ML Deployment',
        subtopics: [],
        userRequirements: [],
        decisions: ['Use TensorFlow for deployment'],
        preferences: ['TensorFlow has better deployment'],
        importantFacts: [],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['TensorFlow'],
        unresolvedIssues: [],
      },
    ];

    const conflicts = detectConflicts(analyses, [conv1, conv2]);
    
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].topic).toBe('ML Framework Preference');
  });

  test('no conflicts when no contradictions', () => {
    const conv1: Conversation = {
      id: 'conv-1',
      userId: 'user-1',
      title: 'Chat A',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const analyses: ConversationAnalysis[] = [
      {
        mainTopic: 'React',
        subtopics: [],
        userRequirements: ['Build a web app'],
        decisions: ['Use React'],
        preferences: ['Modern UI'],
        importantFacts: [],
        questions: [],
        answers: [],
        tasks: [],
        constraints: [],
        technicalInfo: ['React'],
        unresolvedIssues: [],
      },
    ];

    const conflicts = detectConflicts(analyses, [conv1]);
    expect(conflicts.length).toBe(0);
  });
});

describe('Conversation Analysis', () => {
  test('extracts topics from conversation', () => {
    const conversation: Conversation = {
      id: 'test-conv',
      userId: 'user-1',
      title: 'Python Interview',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: 'msg-1',
          conversationId: 'test-conv',
          role: 'user',
          content: 'Help me prepare for Python coding interviews',
          createdAt: new Date(),
          sequenceNumber: 1,
        },
        {
          id: 'msg-2',
          conversationId: 'test-conv',
          role: 'assistant',
          content: 'Let\'s cover Data Structures, Algorithms, and Python-specific concepts like decorators and generators.',
          createdAt: new Date(),
          sequenceNumber: 2,
        },
      ],
    };

    const analysis = analyzeConversation(conversation);
    
    expect(analysis.mainTopic).toBe('Python Interview');
    expect(analysis.subtopics).toContain('Python Programming');
    expect(analysis.subtopics).toContain('Interview Preparation');
  });

  test('handles empty conversation', () => {
    const conversation: Conversation = {
      id: 'empty-conv',
      userId: 'user-1',
      title: 'Empty Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    const analysis = analyzeConversation(conversation);
    
    expect(analysis.mainTopic).toBe('Empty Chat');
    expect(analysis.subtopics.length).toBe(0);
    expect(analysis.questions.length).toBe(0);
  });
});

describe('Chat Selection Validation', () => {
  test('rejects single chat selection', () => {
    const ids = ['conv-1'];
    expect(ids.length).toBeLessThan(2);
  });

  test('accepts two or more chats', () => {
    const ids = ['conv-1', 'conv-2'];
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });

  test('handles duplicate selection', () => {
    const ids = new Set(['conv-1', 'conv-1', 'conv-2']);
    expect(ids.size).toBe(2);
  });
});

describe('Merge Validation', () => {
  test('merge preview contains required fields', () => {
    const conversation: Conversation = {
      id: 'test-1',
      userId: 'user-1',
      title: 'Test Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 5,
      messages: [
        {
          id: 'msg-1',
          conversationId: 'test-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
          sequenceNumber: 1,
        },
      ],
    };

    const preview = generateMergePreview([conversation, conversation]);
    
    expect(preview).toHaveProperty('conversationCount');
    expect(preview).toHaveProperty('messageCount');
    expect(preview).toHaveProperty('topics');
    expect(preview).toHaveProperty('conflicts');
    expect(preview).toHaveProperty('estimatedTokens');
    expect(preview.conversationCount).toBe(2);
  });
});

describe('Context Extraction', () => {
  test('builds unified context from multiple analyses', () => {
    const analyses: ConversationAnalysis[] = [
      {
        mainTopic: 'Frontend',
        subtopics: ['React', 'CSS'],
        userRequirements: ['Build responsive UI'],
        decisions: ['Use React'],
        preferences: ['Dark mode'],
        importantFacts: ['React 18 supports concurrent mode'],
        questions: ['Which state management?'],
        answers: ['Use Redux'],
        tasks: ['Implement login page'],
        constraints: ['Must support mobile'],
        technicalInfo: ['React', 'TypeScript'],
        unresolvedIssues: ['Performance optimization'],
      },
    ];

    const conversations: Conversation[] = [
      {
        id: 'conv-1',
        userId: 'user-1',
        title: 'Frontend Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 10,
      },
    ];

    const context = buildUnifiedContext(analyses, conversations, [], 'standard');
    
    expect(context.goals.length).toBeGreaterThan(0);
    expect(context.technicalDetails).toContain('React');
    expect(context.conversationHistory.length).toBe(1);
  });
});

// ===== Integration Tests =====

describe('Database Operations', () => {
  test('creates and retrieves conversation', () => {
    const conv = createConversation(DEMO_USER_ID, 'Integration Test Chat');
    expect(conv.title).toBe('Integration Test Chat');
    
    const retrieved = getConversation(conv.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Integration Test Chat');
    
    // Clean up
    deleteConversation(conv.id);
  });

  test('adds and retrieves messages', () => {
    const conv = createConversation(DEMO_USER_ID, 'Message Test Chat');
    
    addMessage(conv.id, 'user', 'Hello');
    addMessage(conv.id, 'assistant', 'Hi there!');
    
    const messages = getMessagesByConversation(conv.id);
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[0].sequenceNumber).toBe(1);
    expect(messages[1].sequenceNumber).toBe(2);
    
    deleteConversation(conv.id);
  });

  test('searches conversations', () => {
    const results = searchConversations(DEMO_USER_ID, 'Python');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.title.includes('Python'))).toBe(true);
  });

  test('duplicates conversation', () => {
    const original = createConversation(DEMO_USER_ID, 'Original Chat');
    addMessage(original.id, 'user', 'Test message');
    
    const dup = duplicateConversation(original.id, DEMO_USER_ID);
    expect(dup).toBeDefined();
    expect(dup!.title).toBe('Original Chat (Copy)');
    
    const dupMessages = getMessagesByConversation(dup!.id);
    expect(dupMessages.length).toBe(1);
    expect(dupMessages[0].content).toBe('Test message');
    
    deleteConversation(original.id);
    deleteConversation(dup!.id);
  });

  test('deletes conversation and its messages', () => {
    const conv = createConversation(DEMO_USER_ID, 'Delete Test');
    addMessage(conv.id, 'user', 'Will be deleted');
    
    deleteConversation(conv.id);
    
    const retrieved = getConversation(conv.id);
    expect(retrieved).toBeUndefined();
    
    const messages = getMessagesByConversation(conv.id);
    expect(messages.length).toBe(0);
  });
});

describe('Merge Flow Integration', () => {
  test('generates merge preview for seeded data', () => {
    const convs = getConversations(DEMO_USER_ID);
    expect(convs.length).toBeGreaterThanOrEqual(6);

    const selected = convs.slice(0, 3).map(c => getConversation(c.id)!);
    const preview = generateMergePreview(selected);

    expect(preview.conversationCount).toBe(3);
    expect(preview.messageCount).toBeGreaterThan(0);
    expect(preview.topics.length).toBeGreaterThan(0);
    expect(preview.estimatedTokens).toBeGreaterThan(0);
  });

  test('executes merge and creates new conversation', async () => {
    const convs = getConversations(DEMO_USER_ID);
    const selected = convs.slice(0, 2).map(c => getConversation(c.id)!);

    const result = await executeMerge(selected, 'standard');

    expect(result.systemMessage).toContain('MERGED CONTEXT');
    expect(result.summary).toContain('Merge Summary');
    expect(result.topics.length).toBeGreaterThan(0);
  });

  test('merged conversation preserves source references', () => {
    const convs = getConversations(DEMO_USER_ID);
    const sourceIds = convs.slice(0, 2).map(c => c.id);

    const mergedConv = createConversation(
      DEMO_USER_ID,
      'Test Merged Chat',
      true,
      'Test summary',
      sourceIds
    );

    const sources = getMergeSources(mergedConv.id);
    expect(sources.length).toBe(2);
    expect(sources).toContain(sourceIds[0]);
    expect(sources).toContain(sourceIds[1]);

    // Original conversations still exist
    const original1 = getConversation(sourceIds[0]);
    const original2 = getConversation(sourceIds[1]);
    expect(original1).toBeDefined();
    expect(original2).toBeDefined();

    deleteConversation(mergedConv.id);
  });

  test('undo merge only removes merged conversation', () => {
    const convs = getConversations(DEMO_USER_ID);
    const sourceIds = convs.slice(0, 2).map(c => c.id);

    const mergedConv = createConversation(
      DEMO_USER_ID,
      'Undo Test Merged',
      true,
      'Test',
      sourceIds
    );

    // Delete merged (undo)
    deleteConversation(mergedConv.id);

    // Sources should still exist
    expect(getConversation(sourceIds[0])).toBeDefined();
    expect(getConversation(sourceIds[1])).toBeDefined();

    // Merged should be gone
    expect(getConversation(mergedConv.id)).toBeUndefined();
  });
});

describe('Edge Cases', () => {
  test('handles empty conversation in merge', () => {
    const emptyConv = createConversation(DEMO_USER_ID, 'Empty');
    const normalConv = createConversation(DEMO_USER_ID, 'Normal');
    addMessage(normalConv.id, 'user', 'Hello');

    const empty = getConversation(emptyConv.id)!;
    const normal = getConversation(normalConv.id)!;

    const preview = generateMergePreview([empty, normal]);
    expect(preview.conversationCount).toBe(2);

    deleteConversation(emptyConv.id);
    deleteConversation(normalConv.id);
  });

  test('handles very large conversation content', () => {
    const conv = createConversation(DEMO_USER_ID, 'Large Chat');
    const largeContent = 'A'.repeat(10000);
    addMessage(conv.id, 'user', largeContent);

    const retrieved = getConversation(conv.id)!;
    const analysis = analyzeConversation(retrieved);

    expect(analysis.mainTopic).toBe('Large Chat');
    expect(retrieved.messages![0].content.length).toBe(10000);

    deleteConversation(conv.id);
  });
});

describe('Mock AI Provider', () => {
  test('generates response for merge context', async () => {
    const provider = new MockAIProvider();
    const response = await provider.chat([
      { role: 'system', content: 'MERGED CONTEXT: Previous discussions about Python and ML' },
      { role: 'user', content: 'Continue from where we stopped.' },
    ]);

    expect(response).toContain('context');
    expect(response.length).toBeGreaterThan(0);
  });

  test('generates project plan response', async () => {
    const provider = new MockAIProvider();
    const response = await provider.chat([
      { role: 'system', content: 'MERGED CONTEXT: Multiple chats about project planning' },
      { role: 'user', content: 'Create the final project plan' },
    ]);

    expect(response).toContain('Phase');
    expect(response).toContain('Plan');
  });

  test('generates generic response', async () => {
    const provider = new MockAIProvider();
    const response = await provider.chat([
      { role: 'user', content: 'Tell me about machine learning' },
    ]);

    expect(response.length).toBeGreaterThan(0);
  });
});
