// POST /api/conversations/:id/messages — Add a message and get AI response

import { NextRequest, NextResponse } from 'next/server';
import {
  getConversation,
  addMessage,
  getMessagesByConversation,
  DEMO_USER_ID,
} from '@/lib/db';
import { getAIProvider } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    const conversation = getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== DEMO_USER_ID) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Add user message
    const userMessage = addMessage(id, 'user', content.trim());

    // Get all messages for context
    const allMessages = getMessagesByConversation(id);
    const chatHistory = allMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get AI response
    const aiProvider = getAIProvider();
    const aiResponse = await aiProvider.chat(chatHistory);

    // Add AI response
    const assistantMessage = addMessage(id, 'assistant', aiResponse);

    return NextResponse.json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
      },
    });
  } catch (error) {
    console.error('Message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
