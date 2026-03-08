import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { prompt, quality = 'fast' } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

  // Returns CDN URL only — zero bandwidth on Vercel
  if (quality === 'hd' && process.env.GEMINI_API_KEY) {
    // Imagen 3 via Gemini
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
    return NextResponse.json({ url });
  }

  // Default: Pollinations (no key, unlimited, fast)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&enhance=true&seed=${Date.now()}`;
  return NextResponse.json({ url });
}
