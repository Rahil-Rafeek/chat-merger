// GET /api/conversations/:id — Get single conversation with messages
// PUT /api/conversations/:id — Update conversation
// DELETE /api/conversations/:id — Delete conversation

import { NextRequest, NextResponse } from 'next/server';
import {
  getConversation,
  updateConversation,
  deleteConversation,
  duplicateConversation,
  DEMO_USER_ID,
} from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = getConversation(id);

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (conversation.userId !== DEMO_USER_ID) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, action } = body;

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

    // Handle duplicate action
    if (action === 'duplicate') {
      const duplicated = duplicateConversation(id, DEMO_USER_ID);
      if (!duplicated) {
        return NextResponse.json(
          { success: false, error: 'Failed to duplicate conversation' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: duplicated });
    }

    // Handle rename
    if (title) {
      const updated = updateConversation(id, { title: title.trim() });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: 'No updates provided' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
