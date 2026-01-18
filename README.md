# Context Segmentation Experiment - Stage Zero

A multi-user tutoring application built to establish a baseline for comparing **single-chat tutoring** versus **chunked multi-chat tutoring** approaches in AI-powered learning.

## Project Purpose

This app serves as the **baseline** for a research experiment testing whether **chunking a curriculum into multiple tutoring chats** improves learning quality compared to a **single long chat**. Stage Zero intentionally keeps things simple to clearly demonstrate the **limitations of single-chat tutoring**, including:

- Loss of context over time
- Quality drift in long conversations
- Hard context-length failures when hitting model limits

By establishing this baseline with **native context limits** and **no compression/transforms**, we can later compare against a chunked approach to measure improvement.

## Experiment Design

### Stage Zero Goal

- Compare tutoring behavior across **three fixed models** with **native context limits**
- Provide a clean baseline showing the **limits of single long chats**
- Capture conversation history and allow "Clear chat" to reset a model's thread
- Enable **hard errors on context overflow** (no transforms/compaction) for clear, observable limits

### Model Selection

Three models with varying context windows for comparison:

1. **Mistral Small** (`mistral/mistral-small`) - Smaller context window
2. **ZhipuAI GLM 4.5V** (`zai/glm-4.5v`) - Balanced capabilities
3. **OpenAI GPT-5 Chat** (`openai/gpt-5-chat`) - Larger context window

All models use the same shared **pedagogy-focused system prompt** for consistent tutoring behavior.

## Architecture

### Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- **UI Components**: Vercel AI Elements (built on shadcn/ui)
- **Backend**: Next.js API Routes (Edge Runtime)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (email/password)
- **AI Provider**: Vercel AI Gateway
- **Streaming**: Vercel AI SDK v6 with real-time streaming

### Data Model

```
users (Supabase Auth)
  ↓
models (3 fixed models)
  ↓
conversations (one per user+model, unique constraint)
  ↓
messages (role: user|assistant|error, with timestamps)
```

**Key Features:**
- Per-user data isolation via Row Level Security (RLS)
- One active conversation thread per user per model
- Foreign key constraints ensure data integrity
- Cascade deletes maintain referential integrity

### File Structure

```
app/
├── (auth)/              # Unauthenticated routes
│   ├── login/          # Login page
│   └── register/       # Registration page
├── (app)/              # Authenticated routes
│   ├── page.tsx        # Model selection dashboard
│   ├── layout.tsx      # Auth guard + session management
│   └── chat/[modelId]/ # Per-model chat interface
└── api/
    ├── chat/           # Streaming chat endpoint
    ├── history/        # Load conversation history
    └── clear/          # Clear conversation

lib/
├── models.ts           # Model configuration + system prompt
├── supabaseClient.ts   # Client-side Supabase client
├── supabaseServer.ts   # Server-side Supabase client
└── utils.ts            # Utility functions

components/
├── ai-elements/        # AI Elements UI components
└── ui/                 # shadcn/ui base components

supabase/migrations/
├── 0001_init.sql       # Initial schema + RLS policies
└── 0002_update_models.sql # Updated model IDs for Vercel AI Gateway
```

## Key Implementation Details

### Hard Error Handling

This app **intentionally does NOT** use:
- Context compression
- Message summarization
- Transform middleware
- Fallback strategies

When a model hits its context limit, it returns a **hard error** that is captured and displayed to the user. This provides clear, measurable data on when single-chat tutoring breaks down.

### Streaming Implementation

- Uses Vercel AI SDK's `streamText()` with `toUIMessageStreamResponse()`
- Edge runtime for optimal streaming performance
- Real-time token-by-token display in the UI
- Messages saved to database via `onFinish` callback

### User Isolation

All database queries use Supabase RLS policies to ensure:
- Users can only see their own conversations
- No cross-user data leakage
- Automatic filtering at the database level

### Shared System Prompt

All three models use the same tutoring-focused prompt:

> "You are a patient, structured tutor. Teach step-by-step, confirm understanding, and require mastery before moving forward. Use short explanations, ask targeted questions, and adapt to the learner's level."

This ensures consistency across models for fair comparison.

## Environment Setup

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel AI Gateway API key

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Vercel AI Gateway
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

### Database Setup

1. Create a Supabase project
2. Run migrations in order:
   ```sql
   -- Run in Supabase SQL Editor
   -- 0001_init.sql (creates tables, RLS policies)
   -- 0002_update_models.sql (inserts model configurations)
   ```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

## Usage Flow

1. **Register/Login** - Create an account or sign in
2. **Select Model** - Choose one of three models from the dashboard
3. **Start Chatting** - Begin your tutoring session
4. **Clear Chat** - Reset the conversation at any time
5. **Switch Models** - Return to dashboard to try different models

## Future Stages

**Stage Zero (Current)**: Baseline with single-thread chats, hard errors

**Stage One (Planned)**: Introduce chunked curriculum approach:
- Break learning into discrete sessions
- Test if context segmentation improves outcomes
- Compare against Stage Zero baseline

## Development

Built with modern web standards:
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- React Server Components where applicable
- Edge runtime for optimal performance

## License

This is a research experiment project.
