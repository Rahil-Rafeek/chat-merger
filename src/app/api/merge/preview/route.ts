// POST /api/merge/preview — Generate merge preview
// POST /api/merge — Execute merge

import { NextRequest, NextResponse } from 'next/server';
import { getConversation, DEMO_USER_ID } from '@/lib/db';
import { generateMergePreview } from '@/lib/ai';
import { Conversation } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationIds } = body;

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

    const preview = generateMergePreview(conversations);
    return NextResponse.json({ success: true, data: preview });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate merge preview' },
      { status: 500 }
    );
  }
}
