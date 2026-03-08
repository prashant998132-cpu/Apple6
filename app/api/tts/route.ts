import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { text, voice = 'hi-IN-SwaraNeural' } = await req.json();
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

  // Edge TTS — free, no key needed
  const clean = text.replace(/[#*`>\[\]]/g, '').slice(0, 500);
  const url = `https://edge-tts-api.vercel.app/tts?text=${encodeURIComponent(clean)}&voice=${voice}`;

  // Return URL only — client fetches audio directly (zero Vercel bandwidth)
  return NextResponse.json({ url });
}
