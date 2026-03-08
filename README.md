# JARVIS v8 — Personal AI Platform

> Zero paid infrastructure. Startup-level features.

## ⚡ 5-Minute Deploy

```bash
# 1. Push to GitHub (new repo: jarvis-v8)
# 2. Vercel: New Project → GitHub → Deploy
# 3. Add env vars in Vercel Dashboard
# Done ✅
```

## 🏗️ Architecture

```
User
 ↓
PWA (Vercel — FREE)

Chat
 ↓
IndexedDB (instant, local)
 ↓
Supabase (multi-device sync, optional)

Media
 ↓
Puter Cloud FS (1GB FREE, no key)
 ↓
Cloudflare R2 backup (optional)
 ↓
IndexedDB thumbnails (instant preview)

AI Router
 ↓
Groq llama-3.3 (flash)
 ↓
Groq DeepSeek-R1 (think)
 ↓
Gemini function-calling (deep)
 ↓
Mistral / OpenRouter (fallback)
 ↓
Pollinations (always-on, no key)

Memory
 ↓
Upstash Vector (10k free vectors)
 ↓
Local TF-IDF fallback (always works)
```

## 🔑 Env Vars

| Key | Source | Free Tier |
|-----|--------|-----------|
| `GROQ_API_KEY` | groq.com | 14,400/day |
| `GEMINI_API_KEY` | aistudio.google.com | 1,500/day |
| `MISTRAL_API_KEY` | console.mistral.ai | Limited |
| `OPENROUTER_API_KEY` | openrouter.ai | Free models |
| `NEWS_API_KEY` | newsapi.org | 100/day |
| `NASA_API_KEY` | api.nasa.gov | Unlimited |
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com | 500MB |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase.com | 500MB |
| `NEXT_PUBLIC_UPSTASH_VECTOR_URL` | upstash.com | 10k vectors |

**Minimum:** Just `GROQ_API_KEY`. Or even nothing — Pollinations fallback always works.

## 🚀 Features

- **6-provider AI cascade** — never fails
- **Puter.js** — GPT-4o mini + DALL-E 3 + TTS (free, user's account)
- **Vector memory** — semantic search (Upstash or local TF-IDF)
- **Media Vault** — Puter cloud FS, AI auto-tagging, search by tags
- **Multi-device sync** — Supabase optional
- **Client encryption** — AES-256-GCM, key never leaves device
- **PWA + Service Worker** — offline capable
- **Gemini function calling** — Deep mode with 12 auto-tools
- **Command palette** — Ctrl+K
- **27 tools** — Math, Finance, Health, Student, Utility, India
- **PIN lock** — SHA-256

## 💰 Cost

| Service | Cost |
|---------|------|
| Vercel Hobby | FREE |
| Puter.js | FREE (user's storage) |
| Groq | FREE (14,400/day) |
| Gemini | FREE (1,500/day) |
| Supabase | FREE (500MB) |
| Upstash | FREE (10k vectors) |
| **Total** | **₹0/month** |

## 🗄️ Supabase Schema

Run this SQL in Supabase Dashboard > SQL Editor:

```sql
create table jarvis_messages (
  id bigserial primary key,
  user_id text not null,
  session_id text not null,
  role text not null,
  content text not null,
  ts bigint not null
);

create table jarvis_profiles (
  user_id text primary key,
  name text, xp int default 0, level int default 1,
  streak int default 0, personality text default 'default',
  updated_at timestamptz default now()
);

create table jarvis_memories (
  id bigserial primary key,
  user_id text not null,
  text text not null,
  type text,
  importance int default 5,
  ts bigint,
  unique(user_id, text)
);

-- Enable RLS
alter table jarvis_messages enable row level security;
alter table jarvis_profiles enable row level security;
alter table jarvis_memories enable row level security;

-- Allow all (user_id is your own random ID, no auth needed)
create policy "allow all" on jarvis_messages for all using (true);
create policy "allow all" on jarvis_profiles for all using (true);
create policy "allow all" on jarvis_memories for all using (true);
```
