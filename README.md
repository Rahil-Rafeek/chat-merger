# AI Chat Merger

> Merge multiple AI conversations into one unified, context-aware conversation.
> **Created & Developed by Rahil**
> 
> 🌐 **Live Demo:** [https://mining-pattern-info-bucks.trycloudflare.com](https://mining-pattern-info-bucks.trycloudflare.com)

## Overview

AI Chat Merger solves a common problem: users often have multiple separate AI chats about the same project or topic. This application allows users to **select multiple conversations and intelligently merge them** into a single new conversation while preserving context, detecting conflicts, and removing duplicates.

## Features

### Core
- ✅ **Chat Interface** — Modern ChatGPT-style AI conversation UI
- ✅ **Conversation Management** — Create, rename, duplicate, delete, export chats
- ✅ **Chat History** — Organized by date (Today, Yesterday, Previous 7 Days, etc.)
- ✅ **Search** — Full-text search across all conversations
- ✅ **Dark/Light Mode** — Theme toggle with system preference detection

### Merge System
- ✅ **Multi-Select** — Select 2+ conversations to merge
- ✅ **Merge Preview** — Review topics, conflicts, and stats before merging
- ✅ **Intelligent Merging** — Deduplication, conflict detection, context extraction
- ✅ **Merge Progress** — Step-by-step progress indicators during merge
- ✅ **Merge Summary** — Post-merge report with topics, decisions, conflicts
- ✅ **Source References** — Merged chats link back to original conversations
- ✅ **Undo Merge** — Delete merged conversation while preserving originals
- ✅ **Standard & Smart Merge** — Two merge modes for different use cases

### Architecture
- ✅ **Provider Abstraction** — Swappable AI provider (Mock + OpenAI-ready)
- ✅ **REST APIs** — Clean API routes for all operations
- ✅ **Type Safety** — Full TypeScript throughout
- ✅ **Seed Data** — 6 realistic demo conversations with intentional overlaps and conflicts

---

## Quick Start

### Prerequisites
- Node.js 18+ (or 20+)
- npm

### Setup

```bash
# 1. Navigate to project
cd ai-chat-merger

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

The app comes pre-loaded with 6 demo conversations ready for testing.

### Running Tests

```bash
npx jest --config jest.config.js
```

---

## How to Test the Merge Feature

1. Open the app at `http://localhost:3000`
2. Browse the pre-loaded conversations in the sidebar
3. Click **"Merge Chats"** in the sidebar footer
4. Select 2+ conversations using checkboxes
5. Choose merge mode (Standard or Smart)
6. Click **"Merge"** to see the preview
7. Review topics, conflicts, and statistics
8. Click **"Merge Conversations"** to execute
9. View the merge summary with topics, decisions, and conflicts
10. Click **"Open Merged Chat"** to continue chatting with merged context
11. Try asking: *"Continue from where we stopped"* or *"Create the final project plan"*

### Demo Conversations

| # | Title | Messages | Notes |
|---|-------|----------|-------|
| 1 | AI Internship Preparation | 8 | Mentions PyTorch preference |
| 2 | Python Interview Preparation | 8 | Python coding focus |
| 3 | SQL Interview Preparation | 6 | PostgreSQL recommendation |
| 4 | Machine Learning Project | 6 | **Switches to TensorFlow** (conflict!) |
| 5 | Resume Discussion | 6 | Portfolio tips |
| 6 | HR Interview Preparation | 6 | Behavioral interview prep |

Merging conversations 1 + 4 will detect the **PyTorch vs TensorFlow conflict**.

---

## Architecture

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── conversations/
│   │   │   ├── route.ts              # GET/POST conversations
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET/PUT/DELETE single conversation
│   │   │       └── messages/
│   │   │           └── route.ts      # POST messages
│   │   └── merge/
│   │       ├── route.ts              # POST execute merge
│   │       └── preview/
│   │           └── route.ts          # POST merge preview
│   ├── globals.css                   # Complete design system
│   ├── layout.tsx                    # Root layout with SEO
│   └── page.tsx                      # Main page entry
├── components/
│   └── ChatMergerApp.tsx             # Main app component
├── hooks/
│   └── index.ts                      # useConversations, useChat, useMerge, useTheme
├── lib/
│   ├── ai/
│   │   └── index.ts                  # AI service, analysis, merge pipeline
│   └── db/
│       └── index.ts                  # In-memory database + seed data
└── types/
    └── index.ts                      # TypeScript type definitions
```

### Merge Pipeline

```
Step 1: Collect         → Retrieve all messages from selected chats
Step 2: Analyze         → Extract topics, decisions, preferences, facts
Step 3: Deduplicate     → Remove repeated information using string similarity
Step 4: Detect Conflicts → Find contradictory statements across chats
Step 5: Build Context   → Generate structured unified context
Step 6: Create Chat     → New conversation with system context + summary
```

### AI Provider Abstraction

```typescript
interface AIProvider {
  chat(messages: { role: string; content: string }[]): Promise<string>;
  summarize(text: string): Promise<string>;
}
```

The application ships with a `MockAIProvider` that generates intelligent responses. To use OpenAI or another provider, implement the `AIProvider` interface and set it via `setAIProvider()`.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/conversations` | List all conversations |
| `GET` | `/api/conversations?q=search` | Search conversations |
| `POST` | `/api/conversations` | Create new conversation |
| `GET` | `/api/conversations/:id` | Get conversation with messages |
| `PUT` | `/api/conversations/:id` | Rename or duplicate |
| `DELETE` | `/api/conversations/:id` | Delete conversation |
| `POST` | `/api/conversations/:id/messages` | Send message + get AI reply |
| `POST` | `/api/merge/preview` | Generate merge preview |
| `POST` | `/api/merge` | Execute merge |

---

## Merge Algorithm

### Deduplication

Uses **Jaccard string similarity** to detect semantically similar statements:

```
"I want to use Java" + "I prefer Java for development"
→ Similarity: 0.67 (above 0.6 threshold)
→ Keeps the more detailed version: "I prefer Java for development"
```

### Conflict Detection

Scans for contradictory preferences across conversations:

```
Chat A: "I prefer PyTorch"
Chat B: "Let's use TensorFlow instead"
→ Conflict: "ML Framework Preference"
→ Resolution includes chronological context
```

### Unified Context

The system message injected into the merged conversation follows this structure:

```
PROJECT
GOALS
USER REQUIREMENTS
PREFERENCES
KEY DECISIONS
TECHNICAL DETAILS
IMPORTANT FACTS
CONFLICTS (with resolution)
UNRESOLVED QUESTIONS
NEXT STEPS
```

This allows the AI to have full awareness of all previous discussions.

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_API_KEY` | API key for LLM provider | - |
| `AI_MODEL` | Model name | `gpt-4` |
| `AI_PROVIDER` | Provider type (`mock`/`openai`) | `mock` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `NEXTAUTH_SECRET` | Auth secret | - |

---

## Technology Stack

- **Frontend**: React 19, Next.js 16, TypeScript
- **Styling**: Tailwind CSS + Custom CSS Design System
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm
- **State**: React hooks (no external state management needed)
- **Database**: In-memory (PostgreSQL-ready via Prisma)
- **AI**: Provider abstraction with Mock implementation
- **Testing**: Jest + ts-jest

---

## Future Enhancements

- [ ] PostgreSQL + Prisma database integration
- [ ] NextAuth.js authentication
- [ ] OpenAI/Anthropic provider integration
- [ ] Streaming AI responses
- [ ] Semantic search with embeddings
- [ ] Topic-based merge recommendations
- [ ] Export to JSON/PDF
- [ ] Rate limiting middleware
- [ ] WebSocket for real-time updates

---

## Author & Credits

- **Creator & Lead Developer:** Rahil
- **Repository:** AI Chat Merger
- **Copyright:** (c) 2026 Rahil. All rights reserved.

---

## License

This project is open-source under the [MIT License](LICENSE).
