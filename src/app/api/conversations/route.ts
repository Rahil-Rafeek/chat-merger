// GET /api/conversations — List all conversations
// POST /api/conversations — Create new conversation

import { NextRequest, NextResponse } from 'next/server';
import {
  getConversations,
  createConversation,
  searchConversations,
  DEMO_USER_ID,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const userId = DEMO_USER_ID; // In production, get from auth session

    const convs = query
      ? searchConversations(userId, query)
      : getConversations(userId);

    return NextResponse.json({ success: true, data: convs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;
    const userId = DEMO_USER_ID;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const conversation = createConversation(userId, title.trim());
    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
