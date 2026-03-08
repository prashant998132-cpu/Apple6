import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

// ══════════════════════════════════════════════════════════════
// AI MODEL ROUTER — Priority Chain
// 1. Groq      llama-3.1-8b-instant   (Flash  — fastest, free)
// 2. Groq      deepseek-r1-distill-*  (Think  — reasoning)
// 3. Gemini    gemini-2.0-flash       (Deep   — smartest, free)
// 4. Mistral   mistral-small-latest   (fallback)
// 5. OpenRouter gemma-3-27b           (fallback)
// 6. Pollinations openai proxy        (always works, no key)
// ══════════════════════════════════════════════════════════════

function sse(text: string) { return `data: ${JSON.stringify({ text })}\n\n`; }
function done() { return `data: [DONE]\n\n`; }

async function* streamGroq(messages: any[], model: string, apiKey: string) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048, temperature: 0.7 }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += dec.decode(value);
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try { const t = JSON.parse(data)?.choices?.[0]?.delta?.content; if (t) yield t; } catch {}
    }
  }
}

async function* streamGemini(messages: any[], system: string, apiKey: string) {
  const contents = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    }
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += dec.decode(value);
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try { const t = JSON.parse(line.slice(6))?.candidates?.[0]?.content?.parts?.[0]?.text; if (t) yield t; } catch {}
    }
  }
}

async function* streamMistral(messages: any[], apiKey: string) {
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-small-latest', messages, stream: true, max_tokens: 1500 }),
  });
  if (!r.ok) throw new Error(`Mistral ${r.status}`);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += dec.decode(value);
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try { const t = JSON.parse(data)?.choices?.[0]?.delta?.content; if (t) yield t; } catch {}
    }
  }
}

async function* streamOpenRouter(messages: any[], apiKey: string) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jarvis-ai.app', 'X-Title': 'JARVIS',
    },
    body: JSON.stringify({ model: 'google/gemma-3-27b-it:free', messages, stream: true, max_tokens: 1500 }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += dec.decode(value);
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try { const t = JSON.parse(data)?.choices?.[0]?.delta?.content; if (t) yield t; } catch {}
    }
  }
}

async function* streamPollinations(messages: any[]) {
  // Zero-key always-on fallback
  const r = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai', messages, stream: true, max_tokens: 1200 }),
  });
  if (!r.ok) throw new Error(`Pollinations ${r.status}`);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += dec.decode(value);
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try { const t = JSON.parse(data)?.choices?.[0]?.delta?.content; if (t) yield t; } catch {}
    }
  }
}

export async function POST(req: NextRequest) {
  const { messages, system = '', mode = 'auto' } = await req.json();

  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const orKey     = process.env.OPENROUTER_API_KEY;

  const sysMsg = system ? [{ role: 'system', content: system }] : [];
  const allMsgs = [...sysMsg, ...messages];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      // ── Mode → model routing ────────────────────────────────
      // flash → Groq llama (fastest)
      // think → Groq DeepSeek R1 (reasoning)
      // deep  → This route doesn't handle deep (uses /api/deep)
      // auto  → Groq flash first

      const providers: Array<{ name: string; gen: () => AsyncGenerator<string> }> = [];

      if (mode === 'think' && groqKey) {
        providers.push({ name: 'Groq-DeepSeek', gen: () => streamGroq(allMsgs, 'deepseek-r1-distill-llama-70b', groqKey) });
        providers.push({ name: 'Gemini', gen: () => streamGemini(messages, system, geminiKey!) });
      } else if (mode === 'flash') {
        if (groqKey) providers.push({ name: 'Groq-Flash', gen: () => streamGroq(allMsgs, 'llama-3.1-8b-instant', groqKey) });
      } else {
        // auto — try best available
        if (groqKey) providers.push({ name: 'Groq', gen: () => streamGroq(allMsgs, 'llama-3.3-70b-versatile', groqKey) });
        if (geminiKey) providers.push({ name: 'Gemini', gen: () => streamGemini(messages, system, geminiKey) });
      }

      // Always add fallbacks
      if (mistralKey) providers.push({ name: 'Mistral', gen: () => streamMistral(allMsgs, mistralKey) });
      if (orKey) providers.push({ name: 'OpenRouter', gen: () => streamOpenRouter(allMsgs, orKey) });
      providers.push({ name: 'Pollinations', gen: () => streamPollinations(allMsgs) });

      for (const p of providers) {
        try {
          let hasOutput = false;
          for await (const chunk of p.gen()) {
            send(sse(chunk));
            hasOutput = true;
          }
          if (hasOutput) { send(done()); controller.close(); return; }
        } catch (e) {
          console.warn(`[${p.name}] failed:`, (e as Error).message);
          // Try next provider
        }
      }

      // All providers failed — keyword fallback signal
      send(sse('⚠️ Abhi internet ya API issue hai. Offline mode mein hoon.'));
      send(done());
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
