// ============================================================
// AI Service Abstraction Layer
// Implements the merge pipeline with a provider-agnostic design.
// ============================================================

import {
  Conversation,
  Message,
  ConversationAnalysis,
  UnifiedContext,
  ConflictInfo,
  MergePreview,
  MergeMode,
  MergeConversationSummary,
} from '@/types';

// --- Provider Interface ---
export interface AIProvider {
  chat(messages: { role: string; content: string }[]): Promise<string>;
  summarize(text: string): Promise<string>;
}

// --- Mock AI Provider ---
export class MockAIProvider implements AIProvider {
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return "I'm here to help! What would you like to discuss?";

    const content = lastMessage.content.toLowerCase();

    // Check for merge context
    const systemMsg = messages.find(m => m.role === 'system');
    if (systemMsg && systemMsg.content.includes('MERGED CONTEXT')) {
      return this.generateMergeAwareResponse(lastMessage.content, systemMsg.content);
    }

    // General responses
    if (content.includes('hello') || content.includes('hi')) {
      return "Hello! I'm your AI assistant. How can I help you today?";
    }
    if (content.includes('help')) {
      return "I'm here to help! I can discuss various topics including programming, AI/ML, interview preparation, and more. What would you like to know?";
    }
    if (content.includes('thank')) {
      return "You're welcome! Let me know if there's anything else I can help with.";
    }
    if (content.includes('python')) {
      return "Python is a versatile language widely used in AI/ML, web development, and data science. What specific aspect of Python would you like to explore?";
    }
    if (content.includes('continue') || content.includes('where we stopped') || content.includes('previous')) {
      return "Based on our previous discussions, I have the full context available. I can help you continue from where we left off. What specific aspect would you like to focus on next?";
    }
    if (content.includes('plan') || content.includes('summary')) {
      return `Based on our discussions, here's a comprehensive summary:

1. **Key Topics Covered**: We've discussed various technical and preparation topics
2. **Decisions Made**: Several important decisions have been established
3. **Next Steps**: There are clear action items to follow up on

Would you like me to elaborate on any specific area?`;
    }

    return `That's a great question about "${lastMessage.content.substring(0, 50)}...". Let me share my thoughts:

Based on the context of our conversation, I'd recommend taking a structured approach. Here are the key considerations:

1. **Analysis**: Understanding the core requirements
2. **Planning**: Creating a clear action plan
3. **Execution**: Implementing step by step
4. **Review**: Evaluating the results

Would you like me to go deeper into any of these areas?`;
  }

  async summarize(text: string): Promise<string> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length <= 3) return text;
    return sentences.slice(0, 3).join('. ') + '.';
  }

  private generateMergeAwareResponse(userMessage: string, systemContext: string): string {
    const content = userMessage.toLowerCase();
    
    if (content.includes('continue') || content.includes('where we stopped')) {
      return `I have the full context from all your previous conversations. Here's what we've covered:

Based on the merged context, I can see discussions about:
- Interview preparation strategies
- Technical skill development 
- Project portfolio planning
- Resume optimization

The key decisions and preferences have been preserved. What specific area would you like to continue working on?`;
    }

    if (content.includes('plan') || content.includes('project plan')) {
      return `# Comprehensive Project Plan

Based on all our previous discussions, here's your unified plan:

## Phase 1: Foundation (Weeks 1-2)
- Strengthen Python fundamentals
- Review ML/DL theory
- Set up development environment

## Phase 2: Skill Building (Weeks 3-4)
- Deep dive into NLP with Transformers
- Build sentiment analysis project
- Practice SQL window functions

## Phase 3: Projects (Weeks 5-6)
- Complete computer vision project
- Deploy projects with APIs
- Create demo documentation

## Phase 4: Interview Prep (Weeks 7-8)
- Practice coding problems
- Prepare HR interview answers
- Polish resume
- Mock interviews

## Key Decisions Preserved:
- Primary language: Python
- Focus areas: NLP and Computer Vision
- Framework: Decision pending (PyTorch vs TensorFlow)
- Database: PostgreSQL

Would you like to adjust any part of this plan?`;
    }

    return `I understand your question in the context of our merged conversations. Let me provide a comprehensive answer:

${userMessage.length > 20 ? `Regarding "${userMessage.substring(0, 40)}..."` : `Regarding your question`}:

I can draw on all the context from our previous discussions to give you a thorough response. The merged knowledge base includes technical details, decisions, and preferences that help me provide more relevant answers.

Would you like me to focus on any specific aspect?`;
  }
}

// --- Analysis Engine ---
export function analyzeConversation(conversation: Conversation): ConversationAnalysis {
  const messages = conversation.messages || [];
  const allContent = messages.map(m => m.content).join(' ');
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);

  return {
    mainTopic: extractMainTopic(conversation.title, allContent),
    subtopics: extractSubtopics(allContent),
    userRequirements: extractPatterns(userMessages, ['want', 'need', 'should', 'must', 'require']),
    decisions: extractPatterns(allContent.split('. '), ['decided', 'will use', 'going with', 'choice', 'prefer', 'recommend']),
    preferences: extractPreferences(userMessages),
    importantFacts: extractFacts(assistantMessages),
    questions: userMessages.filter(m => m.includes('?')),
    answers: assistantMessages.filter(m => m.length > 50).slice(0, 5).map(a => a.substring(0, 200)),
    tasks: extractPatterns(allContent.split('. '), ['build', 'create', 'implement', 'develop', 'prepare']),
    constraints: extractPatterns(userMessages, ['only', 'must', 'cannot', 'don\'t want']),
    technicalInfo: extractTechnicalTerms(allContent),
    unresolvedIssues: extractUnresolved(messages),
  };
}

function extractMainTopic(title: string, content: string): string {
  return title;
}

function extractSubtopics(content: string): string[] {
  const topics: Set<string> = new Set();
  const topicKeywords: Record<string, string> = {
    'python': 'Python Programming',
    'java': 'Java Programming',
    'sql': 'SQL & Databases',
    'machine learning': 'Machine Learning',
    'deep learning': 'Deep Learning',
    'pytorch': 'PyTorch Framework',
    'tensorflow': 'TensorFlow Framework',
    'nlp': 'Natural Language Processing',
    'computer vision': 'Computer Vision',
    'interview': 'Interview Preparation',
    'resume': 'Resume Building',
    'portfolio': 'Portfolio Development',
    'deployment': 'Model Deployment',
    'data structure': 'Data Structures',
    'algorithm': 'Algorithms',
    'neural network': 'Neural Networks',
    'transformer': 'Transformer Architecture',
    'bert': 'BERT Model',
    'sentiment': 'Sentiment Analysis',
    'postgresql': 'PostgreSQL',
  };

  const lowerContent = content.toLowerCase();
  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerContent.includes(keyword)) {
      topics.add(topic);
    }
  }
  return Array.from(topics);
}

function extractPatterns(items: string[], keywords: string[]): string[] {
  const results: string[] = [];
  for (const item of items) {
    const lower = item.toLowerCase();
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        const cleaned = item.trim();
        if (cleaned.length > 10 && cleaned.length < 200) {
          results.push(cleaned);
        }
        break;
      }
    }
  }
  return results.slice(0, 10);
}

function extractPreferences(userMessages: string[]): string[] {
  const prefs: string[] = [];
  for (const msg of userMessages) {
    const lower = msg.toLowerCase();
    if (lower.includes('prefer') || lower.includes('want to use') || lower.includes('i like') || lower.includes('i\'ll') || lower.includes('my choice')) {
      prefs.push(msg.substring(0, 150));
    }
  }
  return prefs;
}

function extractFacts(assistantMessages: string[]): string[] {
  const facts: string[] = [];
  for (const msg of assistantMessages) {
    // Extract bold statements as key facts
    const boldPattern = /\*\*([^*]+)\*\*/g;
    let match;
    while ((match = boldPattern.exec(msg)) !== null) {
      if (match[1].length > 5 && match[1].length < 100) {
        facts.push(match[1]);
      }
    }
  }
  return [...new Set(facts)].slice(0, 15);
}

function extractTechnicalTerms(content: string): string[] {
  const terms: Set<string> = new Set();
  const technicalKeywords = [
    'Python', 'Java', 'PyTorch', 'TensorFlow', 'BERT', 'GPT',
    'CNN', 'RNN', 'LSTM', 'Transformer', 'REST API', 'FastAPI',
    'Docker', 'PostgreSQL', 'MongoDB', 'NumPy', 'Pandas',
    'Scikit-learn', 'Hugging Face', 'YOLO', 'ResNet',
    'SQL', 'NoSQL', 'GIL', 'OOP', 'NLP',
  ];

  for (const term of technicalKeywords) {
    if (content.includes(term)) {
      terms.add(term);
    }
  }
  return Array.from(terms);
}

function extractUnresolved(messages: Message[]): string[] {
  const unresolved: string[] = [];
  const lastMessages = messages.slice(-4);
  for (const msg of lastMessages) {
    if (msg.role === 'user' && msg.content.includes('?')) {
      // Check if there's a follow-up answer
      const idx = messages.indexOf(msg);
      const nextMsg = messages[idx + 1];
      if (!nextMsg || nextMsg.role !== 'assistant') {
        unresolved.push(msg.content.substring(0, 100));
      }
    }
    if (msg.content.toLowerCase().includes('not sure') || msg.content.toLowerCase().includes('think about')) {
      unresolved.push(msg.content.substring(0, 100));
    }
  }
  return unresolved;
}

// --- Deduplication ---
export function deduplicateInformation(analyses: ConversationAnalysis[]): {
  deduplicatedFacts: string[];
  deduplicatedDecisions: string[];
  deduplicatedPreferences: string[];
  deduplicatedRequirements: string[];
} {
  const allFacts = analyses.flatMap(a => a.importantFacts);
  const allDecisions = analyses.flatMap(a => a.decisions);
  const allPreferences = analyses.flatMap(a => a.preferences);
  const allRequirements = analyses.flatMap(a => a.userRequirements);

  return {
    deduplicatedFacts: deduplicateStrings(allFacts),
    deduplicatedDecisions: deduplicateStrings(allDecisions),
    deduplicatedPreferences: deduplicateStrings(allPreferences),
    deduplicatedRequirements: deduplicateStrings(allRequirements),
  };
}

function deduplicateStrings(items: string[]): string[] {
  const unique: string[] = [];
  const normalized = new Map<string, string>();

  for (const item of items) {
    const key = item.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Check similarity with existing items
    let isDuplicate = false;
    for (const [existingKey] of normalized) {
      if (stringSimilarity(key, existingKey) > 0.6) {
        isDuplicate = true;
        // Keep the longer/more detailed version
        if (item.length > (normalized.get(existingKey) || '').length) {
          normalized.delete(existingKey);
          normalized.set(key, item);
          const idx = unique.findIndex(u => 
            u.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim() === existingKey
          );
          if (idx >= 0) unique[idx] = item;
        }
        break;
      }
    }

    if (!isDuplicate) {
      normalized.set(key, item);
      unique.push(item);
    }
  }

  return unique;
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// --- Conflict Detection ---
export function detectConflicts(
  analyses: ConversationAnalysis[],
  conversations: Conversation[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Check framework preferences
  const frameworkPrefs: { chatId: string; chatTitle: string; framework: string; statement: string }[] = [];

  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    const conv = conversations[i];
    const allStatements = [...analysis.preferences, ...analysis.decisions, ...analysis.userRequirements];

    for (const statement of allStatements) {
      const lower = statement.toLowerCase();
      if (lower.includes('pytorch') || lower.includes('tensorflow') || lower.includes('python') || lower.includes('java')) {
        let framework = '';
        if (lower.includes('pytorch')) framework = 'PyTorch';
        else if (lower.includes('tensorflow')) framework = 'TensorFlow';
        else if (lower.includes('python') && (lower.includes('use') || lower.includes('prefer'))) framework = 'Python';
        else if (lower.includes('java') && (lower.includes('use') || lower.includes('prefer'))) framework = 'Java';
        
        if (framework) {
          frameworkPrefs.push({
            chatId: conv.id,
            chatTitle: conv.title,
            framework,
            statement: statement.substring(0, 150),
          });
        }
      }
    }
  }

  // Check for contradictions in framework preferences
  const pyTorch = frameworkPrefs.filter(p => p.framework === 'PyTorch');
  const tenFlow = frameworkPrefs.filter(p => p.framework === 'TensorFlow');
  
  if (pyTorch.length > 0 && tenFlow.length > 0) {
    conflicts.push({
      topic: 'ML Framework Preference',
      sourceA: {
        chatId: pyTorch[0].chatId,
        chatTitle: pyTorch[0].chatTitle,
        statement: `Preferred PyTorch: "${pyTorch[0].statement}"`,
      },
      sourceB: {
        chatId: tenFlow[0].chatId,
        chatTitle: tenFlow[0].chatTitle,
        statement: `Switched to TensorFlow: "${tenFlow[0].statement}"`,
      },
      resolution: 'User initially preferred PyTorch but later considered TensorFlow for deployment advantages. The latest preference should be used, but both frameworks were discussed.',
    });
  }

  return conflicts;
}

// --- Build Unified Context ---
export function buildUnifiedContext(
  analyses: ConversationAnalysis[],
  conversations: Conversation[],
  conflicts: ConflictInfo[],
  mode: MergeMode
): UnifiedContext {
  const deduped = deduplicateInformation(analyses);
  const allTopics = [...new Set(analyses.flatMap(a => [a.mainTopic, ...a.subtopics]))];
  const allTechnical = [...new Set(analyses.flatMap(a => a.technicalInfo))];
  const allUnresolved = [...new Set(analyses.flatMap(a => a.unresolvedIssues))];
  const allTasks = [...new Set(analyses.flatMap(a => a.tasks))];

  return {
    project: allTopics.join(', '),
    goals: allTopics.map(t => `Master ${t}`),
    userRequirements: deduped.deduplicatedRequirements,
    preferences: deduped.deduplicatedPreferences,
    decisions: deduped.deduplicatedDecisions,
    technicalDetails: allTechnical,
    conversationHistory: conversations.map(c => 
      `[${c.title}] (${c.messageCount || 0} messages, ${c.createdAt.toLocaleDateString()})`
    ),
    unresolvedQuestions: allUnresolved,
    conflicts,
    nextSteps: mode === 'smart' 
      ? [
          'Review and resolve framework decision (PyTorch vs TensorFlow)',
          'Complete remaining interview preparation areas',
          'Build and deploy portfolio projects',
          'Practice mock interviews',
          ...allTasks.slice(0, 3),
        ]
      : allTasks.slice(0, 5),
  };
}

// --- Generate Merge Preview ---
export function generateMergePreview(conversations: Conversation[]): MergePreview {
  const analyses = conversations.map(c => analyzeConversation(c));
  const conflicts = detectConflicts(analyses, conversations);
  const allTopics = [...new Set(analyses.flatMap(a => [a.mainTopic, ...a.subtopics]))];
  const allDecisions = [...new Set(analyses.flatMap(a => a.decisions))];
  const allUnresolved = [...new Set(analyses.flatMap(a => a.unresolvedIssues))];
  const totalMessages = conversations.reduce((sum, c) => sum + (c.messageCount || c.messages?.length || 0), 0);

  // Rough token estimate (avg 4 chars per token)
  const totalChars = conversations.reduce((sum, c) => {
    const msgs = c.messages || [];
    return sum + msgs.reduce((s, m) => s + m.content.length, 0);
  }, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  const conversationSummaries: MergeConversationSummary[] = conversations.map(c => ({
    id: c.id,
    title: c.title,
    messageCount: c.messageCount || c.messages?.length || 0,
    createdAt: c.createdAt,
    preview: c.preview || (c.messages && c.messages.length > 0 
      ? c.messages[0].content.substring(0, 100) 
      : ''),
  }));

  return {
    conversationCount: conversations.length,
    messageCount: totalMessages,
    topics: allTopics,
    importantDecisions: allDecisions.slice(0, 10),
    conflicts,
    unresolvedQuestions: allUnresolved,
    estimatedTokens,
    conversations: conversationSummaries,
  };
}

// --- Execute Merge ---
export async function executeMerge(
  conversations: Conversation[],
  mode: MergeMode,
  onProgress?: (step: string) => void
): Promise<{
  systemMessage: string;
  summary: string;
  topics: string[];
  decisions: string[];
  conflicts: ConflictInfo[];
  unresolvedTopics: string[];
}> {
  // Step 1: Read conversations
  onProgress?.('read');
  await simulateDelay(500);

  // Step 2: Analyze
  onProgress?.('extract');
  const analyses = conversations.map(c => analyzeConversation(c));
  await simulateDelay(800);

  // Step 3: Deduplicate
  onProgress?.('deduplicate');
  const deduped = deduplicateInformation(analyses);
  await simulateDelay(600);

  // Step 4: Detect conflicts
  onProgress?.('conflicts');
  const conflicts = detectConflicts(analyses, conversations);
  await simulateDelay(500);

  // Step 5: Build unified context
  onProgress?.('context');
  const context = buildUnifiedContext(analyses, conversations, conflicts, mode);
  await simulateDelay(700);

  // Step 6: Generate system message
  onProgress?.('create');
  
  const allTopics = [...new Set(analyses.flatMap(a => [a.mainTopic, ...a.subtopics]))];

  const systemMessage = `=== MERGED CONTEXT ===
This conversation was created by merging ${conversations.length} separate conversations.

## SOURCE CONVERSATIONS
${conversations.map(c => `- "${c.title}" (${c.messageCount || c.messages?.length || 0} messages)`).join('\n')}

## PROJECT OVERVIEW
${context.project}

## GOALS
${context.goals.map(g => `- ${g}`).join('\n')}

## USER REQUIREMENTS
${deduped.deduplicatedRequirements.map(r => `- ${r}`).join('\n') || '- No specific requirements extracted'}

## PREFERENCES  
${deduped.deduplicatedPreferences.map(p => `- ${p}`).join('\n') || '- No specific preferences extracted'}

## KEY DECISIONS
${deduped.deduplicatedDecisions.map(d => `- ${d}`).join('\n') || '- No specific decisions extracted'}

## TECHNICAL DETAILS
Technologies discussed: ${context.technicalDetails.join(', ')}

## IMPORTANT FACTS
${deduped.deduplicatedFacts.map(f => `- ${f}`).join('\n') || '- No key facts extracted'}

## CONFLICTS
${conflicts.length > 0 
  ? conflicts.map(c => `⚠️ **${c.topic}**: ${c.sourceA.statement} vs ${c.sourceB.statement}${c.resolution ? `\n   Resolution: ${c.resolution}` : ''}`).join('\n')
  : '- No conflicts detected'}

## UNRESOLVED QUESTIONS
${context.unresolvedQuestions.map(q => `- ${q}`).join('\n') || '- No unresolved questions'}

## NEXT STEPS
${context.nextSteps.map(s => `- ${s}`).join('\n')}

=== END MERGED CONTEXT ===

You are an AI assistant continuing from the merged context above. The user has merged multiple conversations and expects you to have full knowledge of everything discussed. Respond as if you were part of all the original conversations.`;

  const summary = `# Merge Summary

**${conversations.length} conversations merged successfully**

## Main Topics
${allTopics.map(t => `- ${t}`).join('\n')}

## Key Decisions
${deduped.deduplicatedDecisions.slice(0, 5).map(d => `- ${d}`).join('\n') || '- No specific decisions extracted'}

## Conflicts Detected
${conflicts.length > 0 
  ? conflicts.map(c => `- ⚠️ **${c.topic}**: ${c.resolution || 'Needs resolution'}`).join('\n')
  : '- No conflicts detected'}

## Unresolved Topics
${context.unresolvedQuestions.map(q => `- ${q}`).join('\n') || '- All topics resolved'}

## Source Conversations
${conversations.map(c => `- ${c.title}`).join('\n')}`;

  await simulateDelay(300);

  return {
    systemMessage,
    summary,
    topics: allTopics,
    decisions: deduped.deduplicatedDecisions.slice(0, 10),
    conflicts,
    unresolvedTopics: context.unresolvedQuestions,
  };
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Singleton Provider ---
let aiProvider: AIProvider = new MockAIProvider();

export function getAIProvider(): AIProvider {
  return aiProvider;
}

export function setAIProvider(provider: AIProvider): void {
  aiProvider = provider;
}
