import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Gemini function calling — Deep mode tools
const TOOL_DECLARATIONS = [
  { name: 'get_weather', description: 'Get weather forecast', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'get_crypto', description: 'Get crypto prices', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'get_news', description: 'Get India news', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'search_wikipedia', description: 'Search Wikipedia', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Search query' } }, required: ['query'] }},
  { name: 'generate_image', description: 'Generate AI image', parameters: { type: 'OBJECT', properties: { prompt: { type: 'STRING', description: 'Image description' } }, required: ['prompt'] }},
  { name: 'get_meaning', description: 'Get word meaning', parameters: { type: 'OBJECT', properties: { word: { type: 'STRING', description: 'Word to define' } }, required: ['word'] }},
  { name: 'get_joke', description: 'Get a joke', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'get_quote', description: 'Get motivational quote', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'calculate', description: 'Perform math calculation', parameters: { type: 'OBJECT', properties: { expr: { type: 'STRING', description: 'Math expression' } }, required: ['expr'] }},
  { name: 'get_nasa', description: 'Get NASA space photo of the day', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'get_holidays', description: 'Get India public holidays', parameters: { type: 'OBJECT', properties: {}, required: [] }},
  { name: 'search_books', description: 'Search for books', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Book title or author' } }, required: ['query'] }},
];

async function callTool(name: string, args: any): Promise<string> {
  try {
    const r = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: name, params: args }),
    });
    const d = await r.json();
    if (typeof d.result === 'object') return JSON.stringify(d.result);
    return String(d.result);
  } catch (e: any) {
    return `Tool error: ${e.message}`;
  }
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'No Gemini key' }, { status: 400 });

  const { messages, system } = await req.json();

  const geminiMsgs = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // First call — let Gemini decide which tools to call
  let res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system + '\n\nTu real-time tools use kar sakta hai. Jab needed ho toh tools call karo.' }] },
        contents: geminiMsgs,
        tools: [{ function_declarations: TOOL_DECLARATIONS }],
        tool_config: { function_calling_config: { mode: 'AUTO' } },
        generationConfig: { maxOutputTokens: 2000 },
      }),
    }
  );

  let data = await res.json();
  let candidate = data.candidates?.[0];

  // Handle tool calls
  const toolCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];
  if (toolCalls.length > 0) {
    const toolResults = await Promise.all(
      toolCalls.map(async (part: any) => {
        const result = await callTool(part.functionCall.name, part.functionCall.args || {});
        return { functionResponse: { name: part.functionCall.name, response: { result } } };
      })
    );

    // Second call with tool results
    const updatedMsgs = [
      ...geminiMsgs,
      { role: 'model', parts: candidate.content.parts },
      { role: 'user', parts: toolResults },
    ];

    const res2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: updatedMsgs,
          generationConfig: { maxOutputTokens: 2000 },
        }),
      }
    );
    data = await res2.json();
    candidate = data.candidates?.[0];
  }

  const text = candidate?.content?.parts?.map((p: any) => p.text || '').join('') || 'Koi response nahi aaya.';
  const toolsUsed = toolCalls.map((t: any) => t.functionCall?.name).filter(Boolean);

  return NextResponse.json({ text, toolsUsed });
}
