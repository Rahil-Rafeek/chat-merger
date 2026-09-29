// POST /api/merge — Execute the merge operation

import { NextRequest, NextResponse } from 'next/server';
import {
  getConversation,
  createConversation,
  addMessage,
  DEMO_USER_ID,
} from '@/lib/db';
import { executeMerge } from '@/lib/ai';
import { Conversation, MergeMode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationIds, mode = 'standard' } = body as {
      conversationIds: string[];
      mode?: MergeMode;
    };

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 conversation IDs are required' },
        { status: 400 }
      );
    }

    // Fetch all conversations
    const conversations: Conversation[] = [];
    for (const id of conversationIds) {
      const conv = getConversation(id);
      if (!conv) {
        return NextResponse.json(
          { success: false, error: `Conversation ${id} not found` },
          { status: 404 }
        );
      }
      if (conv.userId !== DEMO_USER_ID) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access to conversation' },
          { status: 403 }
        );
      }
      conversations.push(conv);
    }

    // Execute merge pipeline
    const result = await executeMerge(conversations, mode);

    // Create new merged conversation
    const titles = conversations.map(c => c.title);
    const mergedTitle = `Merged: ${titles.join(' + ')}`;

    const mergedConversation = createConversation(
      DEMO_USER_ID,
      mergedTitle.length > 80 ? mergedTitle.substring(0, 77) + '...' : mergedTitle,
      true,
      result.summary,
      conversationIds
    );

    // Add the system message with merged context
    addMessage(mergedConversation.id, 'system', result.systemMessage);

    // Add merge summary as assistant message
    addMessage(
      mergedConversation.id,
      'assistant',
      result.summary
    );

    // Fetch updated conversation
    const updatedConv = getConversation(mergedConversation.id);

    return NextResponse.json({
      success: true,
      data: {
        conversation: updatedConv,
        summary: {
          conversationCount: conversations.length,
          mainTopics: result.topics,
          importantDecisions: result.decisions,
          conflicts: result.conflicts,
          unresolvedTopics: result.unresolvedTopics,
          sourceConversations: conversations.map(c => ({
            id: c.id,
            title: c.title,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to merge conversations' },
      { status: 500 }
    );
  }
}
