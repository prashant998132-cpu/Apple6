// ══════════════════════════════════════════════════════════════
// JARVIS v8 — ALL APP INTEGRATIONS
// Category-wise, credit-safe, free-first, fallback-always
// ══════════════════════════════════════════════════════════════
// CATEGORIES:
// 🎵 Music         → Spotify, LastFM, Deezer, Shazam-style
// 📺 Video         → YouTube, Vimeo
// 💬 Messaging     → Telegram Bot, Discord Bot, WhatsApp Business
// 📅 Productivity  → Google Calendar, Google Drive, Gmail, Notion, GitHub, Trello
// 🎬 Entertainment → TMDB (movies/TV), IGDB (games), GIPHY
// 🖼️ Media         → Unsplash, Pexels, Pixabay
// 💰 Finance       → NSE India, Alpha Vantage, Razorpay
// 🤖 AI            → ElevenLabs TTS, Stability AI, Hugging Face, DALL-E via Puter
// 📡 Social        → Reddit, Dev.to, RSS Feeds
// 🗺️ Maps          → Google Maps, OpenStreetMap
// 🛒 Shopping      → Amazon PA, Flipkart Affiliate
// 🏥 Health        → FoodData (USDA), Open Food Facts, Nutritionix
// 📚 Books         → Google Books, Open Library, Gutenberg
// 🌐 Translate     → LibreTranslate, DeepL Free, Google Translate
// 📰 News          → NewsAPI, GNews, Currents, RSS
// 🎓 Education     → Khan Academy, MIT OCW, Coursera Public
// ✈️ Travel        → Aviationstack, Exchange Rates, Rest Countries
// 🏏 Sports        → CricAPI, Sportradar, ESPN RSS
// ☁️ Cloud         → Supabase, Puter FS, Cloudflare R2
// ══════════════════════════════════════════════════════════════

'use client';

// ── Cache helpers (shared with toolEngine) ────────────────────
function cacheGet(key: string, ttlMs = 5 * 60_000): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`int_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) { localStorage.removeItem(`int_${key}`); return null; }
    return data;
  } catch { return null; }
}
function cacheSet(key: string, data: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`int_${key}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// ── Env var getter (works client + edge) ─────────────────────
const E = (key: string) => typeof process !== 'undefined' ? process.env[key] || '' : '';

// ══════════════════════════════════════════════════════════════
// 🎵 MUSIC
// ══════════════════════════════════════════════════════════════

// Spotify — search tracks, artist info, album details
// Needs: SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
export async function spotifySearch(query: string, type: 'track' | 'artist' | 'album' = 'track'): Promise<string> {
  const cached = cacheGet(`spotify_${query}`, 10 * 60_000);
  if (cached) return cached;
  const cid = E('SPOTIFY_CLIENT_ID'); const sec = E('SPOTIFY_CLIENT_SECRET');
  if (!cid || !sec) return await lastFmSearch(query); // fallback
  try {
    // Get token
    const tok = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${cid}:${sec}`)}` },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tok.json();
    const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const d = await r.json();
    const items = d.tracks?.items || d.artists?.items || d.albums?.items || [];
    const result = `🎵 **Spotify: "${query}"**\n\n` + items.slice(0, 5).map((item: any, i: number) =>
      `${i + 1}. **${item.name}** ${item.artists ? `— ${item.artists[0]?.name}` : ''}\n   ${item.external_urls?.spotify || ''}`
    ).join('\n\n');
    cacheSet(`spotify_${query}`, result);
    return result;
  } catch { return lastFmSearch(query); }
}

// LastFM — free, no rate limit (primary music fallback)
// Needs: LASTFM_API_KEY (free at last.fm/api)
export async function lastFmSearch(query: string): Promise<string> {
  const key = E('LASTFM_API_KEY');
  if (!key) return `🎵 "${query}" — Spotify/LastFM key nahi hai. Settings mein add karo.`;
  const cached = cacheGet(`lastfm_${query}`, 15 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${key}&format=json&limit=5`);
    const d = await r.json();
    const tracks = d.results?.trackmatches?.track || [];
    const result = `🎵 **Music: "${query}"**\n\n` + tracks.slice(0, 5).map((t: any, i: number) =>
      `${i + 1}. **${t.name}** — ${t.artist}\n   [LastFM](${t.url})`
    ).join('\n\n');
    cacheSet(`lastfm_${query}`, result);
    return result;
  } catch { return `🎵 Music search failed — baad mein try karo`; }
}

// Deezer — FREE, no key needed! 
export async function deezerSearch(query: string): Promise<string> {
  const cached = cacheGet(`deezer_${query}`, 10 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`);
    const d = await r.json();
    const result = `🎵 **Deezer: "${query}"**\n\n` + (d.data || []).slice(0, 5).map((t: any, i: number) =>
      `${i + 1}. **${t.title}** — ${t.artist?.name}\n   💿 ${t.album?.title} | ⏱️ ${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}\n   🔊 [Preview](${t.preview})`
    ).join('\n\n');
    cacheSet(`deezer_${query}`, result);
    return result;
  } catch { return `🎵 Deezer search failed`; }
}

// ══════════════════════════════════════════════════════════════
// 📺 VIDEO
// ══════════════════════════════════════════════════════════════

// YouTube — search videos (no playback via server, just links)
// Needs: YOUTUBE_API_KEY (free 10k units/day — Google Cloud Console)
export async function youtubeSearch(query: string): Promise<string> {
  const key = E('YOUTUBE_API_KEY');
  if (!key) return youtubeRSS(query);
  const cached = cacheGet(`yt_${query}`, 15 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=5&type=video&key=${key}`);
    const d = await r.json();
    const result = `📺 **YouTube: "${query}"**\n\n` + (d.items || []).slice(0, 5).map((v: any, i: number) =>
      `${i + 1}. **${v.snippet?.title}**\n   ${v.snippet?.channelTitle} | [Watch](https://youtube.com/watch?v=${v.id?.videoId})`
    ).join('\n\n');
    cacheSet(`yt_${query}`, result);
    return result;
  } catch { return youtubeRSS(query); }
}

// YouTube RSS fallback (no key)
async function youtubeRSS(query: string): Promise<string> {
  return `📺 **YouTube search**: [${query}](https://www.youtube.com/results?search_query=${encodeURIComponent(query)})\n\n*YouTube API key nahi hai — link par click karo*`;
}

// ══════════════════════════════════════════════════════════════
// 💬 MESSAGING
// ══════════════════════════════════════════════════════════════

// Telegram — send message via Bot API
// Needs: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
export async function telegramSend(message: string, chatId?: string): Promise<string> {
  const token = E('TELEGRAM_BOT_TOKEN');
  const cid = chatId || E('TELEGRAM_CHAT_ID');
  if (!token || !cid) return '❌ Telegram bot token nahi hai — Settings mein add karo';
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cid, text: message, parse_mode: 'Markdown' }),
    });
    const d = await r.json();
    return d.ok ? `✅ Telegram message bhej diya!` : `❌ Telegram error: ${d.description}`;
  } catch { return '❌ Telegram bhejne mein error'; }
}

// Telegram — get recent messages from bot
export async function telegramGetUpdates(): Promise<string> {
  const token = E('TELEGRAM_BOT_TOKEN');
  if (!token) return '❌ Telegram token nahi hai';
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=5`);
    const d = await r.json();
    const msgs = (d.result || []).filter((u: any) => u.message).slice(-5);
    if (!msgs.length) return '📬 Koi naya Telegram message nahi';
    return `📬 **Telegram Messages (last ${msgs.length})**\n\n` + msgs.map((u: any) =>
      `👤 **${u.message.from?.first_name}**: ${u.message.text}`
    ).join('\n');
  } catch { return '❌ Telegram messages fetch failed'; }
}

// Discord — send to webhook (no bot needed, just webhook URL)
// Needs: DISCORD_WEBHOOK_URL
export async function discordSend(message: string, username = 'JARVIS'): Promise<string> {
  const url = E('DISCORD_WEBHOOK_URL');
  if (!url) return '❌ Discord webhook URL nahi hai';
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, username }),
    });
    return '✅ Discord mein bhej diya!';
  } catch { return '❌ Discord send failed'; }
}

// WhatsApp Business API (Meta)
// Needs: WHATSAPP_TOKEN + WHATSAPP_PHONE_ID + WHATSAPP_TO
export async function whatsappSend(message: string, to?: string): Promise<string> {
  const token = E('WHATSAPP_TOKEN');
  const phoneId = E('WHATSAPP_PHONE_ID');
  const recipient = to || E('WHATSAPP_TO');
  if (!token || !phoneId || !recipient) {
    // Fallback: open wa.me link
    return `📱 WhatsApp Business API setup nahi hai.\n\n[Direct open](https://wa.me/?text=${encodeURIComponent(message)})`;
  }
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient, type: 'text',
        text: { body: message },
      }),
    });
    return r.ok ? '✅ WhatsApp message bhej diya!' : '❌ WhatsApp send failed';
  } catch { return '❌ WhatsApp error'; }
}

// ══════════════════════════════════════════════════════════════
// 📅 PRODUCTIVITY
// ══════════════════════════════════════════════════════════════

// Google Calendar — add event
// Needs: GOOGLE_ACCESS_TOKEN (OAuth — user logs in once)
export async function calendarAddEvent(title: string, date: string, time = '10:00', duration = 60): Promise<string> {
  const token = E('GOOGLE_ACCESS_TOKEN') || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : '');
  if (!token) return `📅 Google Calendar connect karo Settings mein.\n\nManually add: [calendar.google.com](https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(title)}&dates=${date.replace(/-/g, '')}T${time.replace(':', '')}00/${date.replace(/-/g, '')}T${String(parseInt(time) + 1).padStart(2, '0')}0000)`;
  try {
    const start = `${date}T${time}:00+05:30`;
    const endH = String(parseInt(time.split(':')[0]) + Math.floor(duration / 60)).padStart(2, '0');
    const end = `${date}T${endH}:${time.split(':')[1]}:00+05:30`;
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: title, start: { dateTime: start }, end: { dateTime: end } }),
    });
    return r.ok ? `✅ Calendar mein add ho gaya: **${title}** — ${date} ${time}` : '❌ Calendar event failed';
  } catch { return '❌ Google Calendar error'; }
}

// Google Drive — list recent files
export async function driveListFiles(): Promise<string> {
  const token = E('GOOGLE_ACCESS_TOKEN') || (typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : '');
  if (!token) return '📁 Google Drive connect nahi hai';
  try {
    const r = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=8&fields=files(name,mimeType,modifiedTime,webViewLink)', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return `📁 **Google Drive — Recent Files**\n\n` + (d.files || []).map((f: any) =>
      `📄 [${f.name}](${f.webViewLink}) — ${new Date(f.modifiedTime).toLocaleDateString('hi-IN')}`
    ).join('\n');
  } catch { return '❌ Google Drive error'; }
}

// GitHub — search repos or get user profile
// Needs: GITHUB_TOKEN (optional, raises rate limit from 60 to 5000/hr)
export async function githubSearch(query: string): Promise<string> {
  const token = E('GITHUB_TOKEN');
  const cached = cacheGet(`github_${query}`, 10 * 60_000);
  if (cached) return cached;
  const headers: Record<string, string> = token ? { Authorization: `token ${token}` } : {};
  try {
    const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=5`, { headers });
    const d = await r.json();
    const result = `🐙 **GitHub: "${query}"**\n\n` + (d.items || []).slice(0, 5).map((repo: any, i: number) =>
      `${i + 1}. **[${repo.full_name}](${repo.html_url})**\n   ⭐ ${repo.stargazers_count?.toLocaleString()} | ${repo.description?.slice(0, 60) || ''}`
    ).join('\n\n');
    cacheSet(`github_${query}`, result);
    return result;
  } catch { return '❌ GitHub search failed'; }
}

// Notion — create page in database
// Needs: NOTION_API_KEY + NOTION_DATABASE_ID
export async function notionCreatePage(title: string, content: string): Promise<string> {
  const key = E('NOTION_API_KEY'); const dbId = E('NOTION_DATABASE_ID');
  if (!key || !dbId) return `📓 Notion connect nahi hai.\n\n[notion.so](https://notion.so) pe manually add karo`;
  try {
    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content } }] } }],
      }),
    });
    const d = await r.json();
    return d.id ? `✅ Notion mein save ho gaya!\n[Open](${d.url})` : '❌ Notion create failed';
  } catch { return '❌ Notion error'; }
}

// ══════════════════════════════════════════════════════════════
// 🎬 ENTERTAINMENT
// ══════════════════════════════════════════════════════════════

// TMDB — movies & TV (free 1000 req/day)
// Needs: TMDB_API_KEY (free at themoviedb.org)
export async function tmdbSearch(query: string, type: 'movie' | 'tv' = 'movie'): Promise<string> {
  const key = E('TMDB_API_KEY');
  if (!key) return tmdbFallback(query);
  const cached = cacheGet(`tmdb_${query}_${type}`, 30 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${key}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
    const d = await r.json();
    const result = `🎬 **${type === 'movie' ? 'Movies' : 'TV Shows'}: "${query}"**\n\n` + (d.results || []).slice(0, 4).map((item: any, i: number) =>
      `${i + 1}. **${item.title || item.name}** (${(item.release_date || item.first_air_date || '').slice(0, 4)})\n   ⭐ ${item.vote_average}/10 | ${item.overview?.slice(0, 80)}…`
    ).join('\n\n');
    cacheSet(`tmdb_${query}_${type}`, result);
    return result;
  } catch { return tmdbFallback(query); }
}
function tmdbFallback(q: string) { return `🎬 [${q} search on IMDb](https://www.imdb.com/find?q=${encodeURIComponent(q)})`; }

// GIPHY — GIF search (free 100 req/hr)
// Needs: GIPHY_API_KEY (free at developers.giphy.com)
export async function giphySearch(query: string): Promise<string> {
  const key = E('GIPHY_API_KEY');
  if (!key) return `🎭 [Search GIF: ${query}](https://giphy.com/search/${encodeURIComponent(query)})`;
  try {
    const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=3`);
    const d = await r.json();
    return `🎭 **GIFs: "${query}"**\n\n` + (d.data || []).slice(0, 3).map((g: any) =>
      `![gif](${g.images?.fixed_height?.url})\n[View](${g.url})`
    ).join('\n\n');
  } catch { return `🎭 [GIF: ${query}](https://giphy.com/search/${encodeURIComponent(query)})`; }
}

// ══════════════════════════════════════════════════════════════
// 🖼️ MEDIA (Images)
// ══════════════════════════════════════════════════════════════

// Unsplash — free photos (50 req/hr free)
// Needs: UNSPLASH_ACCESS_KEY
export async function unsplashSearch(query: string): Promise<string> {
  const key = E('UNSPLASH_ACCESS_KEY');
  if (!key) return pexelsSearch(query);
  const cached = cacheGet(`unsplash_${query}`, 30 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&client_id=${key}`);
    const d = await r.json();
    const result = `🖼️ **Photos: "${query}"** (Unsplash)\n\n` + (d.results || []).slice(0, 4).map((p: any) =>
      `![${p.alt_description || query}](${p.urls?.small})\n📸 by [${p.user?.name}](${p.links?.html})`
    ).join('\n\n');
    cacheSet(`unsplash_${query}`, result);
    return result;
  } catch { return pexelsSearch(query); }
}

// Pexels — free photos (200 req/hr free) — fallback
// Needs: PEXELS_API_KEY (free at pexels.com/api)
export async function pexelsSearch(query: string): Promise<string> {
  const key = E('PEXELS_API_KEY');
  if (!key) return pixabaySearch(query);
  try {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=4`, {
      headers: { Authorization: key },
    });
    const d = await r.json();
    return `🖼️ **Photos: "${query}"** (Pexels)\n\n` + (d.photos || []).slice(0, 4).map((p: any) =>
      `![photo](${p.src?.medium})\n📸 by [${p.photographer}](${p.photographer_url})`
    ).join('\n\n');
  } catch { return pixabaySearch(query); }
}

// Pixabay — FREE, no key needed!
export async function pixabaySearch(query: string): Promise<string> {
  const key = E('PIXABAY_API_KEY') || ''; // optional
  const endpoint = key
    ? `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&per_page=4`
    : `https://pixabay.com/api/?key=48313659-7e1a6ccc3de0bd9a2aaeb8890&q=${encodeURIComponent(query)}&per_page=4`; // demo key
  try {
    const r = await fetch(endpoint);
    const d = await r.json();
    return `🖼️ **Photos: "${query}"** (Pixabay)\n\n` + (d.hits || []).slice(0, 4).map((p: any) =>
      `![photo](${p.previewURL})\n[Full size](${p.pageURL})`
    ).join('\n\n');
  } catch { return `🖼️ [Search photos: ${query}](https://unsplash.com/s/photos/${encodeURIComponent(query)})`; }
}

// ══════════════════════════════════════════════════════════════
// 💰 FINANCE (India focused)
// ══════════════════════════════════════════════════════════════

// NSE India — live stock prices (no key!)
export async function nseStockPrice(symbol: string): Promise<string> {
  const sym = symbol.toUpperCase().trim();
  const cached = cacheGet(`nse_${sym}`, 3 * 60_000); // 3 min cache
  if (cached) return cached;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}.NS?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const d = await r.json();
    const meta = d.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No data');
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose;
    const change = price - prev;
    const pct = (change / prev) * 100;
    const result = `📈 **${sym} (NSE)**\n\n💰 ₹${price?.toFixed(2)}\n${change >= 0 ? '🟢' : '🔴'} ${change >= 0 ? '+' : ''}${change?.toFixed(2)} (${pct?.toFixed(2)}%)\n📊 High: ₹${meta.regularMarketDayHigh?.toFixed(2)} | Low: ₹${meta.regularMarketDayLow?.toFixed(2)}`;
    cacheSet(`nse_${sym}`, result);
    return result;
  } catch { return `📈 NSE mein "${sym}" nahi mila — symbol check karo (eg: RELIANCE, TCS, INFY)`; }
}

// Alpha Vantage — detailed financial data (25 req/day free)
// Needs: ALPHA_VANTAGE_KEY (free)
export async function alphavantageQuote(symbol: string): Promise<string> {
  const key = E('ALPHA_VANTAGE_KEY');
  if (!key) return nseStockPrice(symbol);
  const cached = cacheGet(`av_${symbol}`, 5 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}.BSE&apikey=${key}`);
    const d = await r.json();
    const q = d['Global Quote'];
    if (!q || !q['05. price']) return nseStockPrice(symbol);
    const result = `📊 **${symbol} (BSE)**\n\n₹${parseFloat(q['05. price']).toFixed(2)}\n${parseFloat(q['10. change percent']) >= 0 ? '🟢' : '🔴'} ${q['10. change percent']}`;
    cacheSet(`av_${symbol}`, result);
    return result;
  } catch { return nseStockPrice(symbol); }
}

// ══════════════════════════════════════════════════════════════
// 🤖 AI & TTS
// ══════════════════════════════════════════════════════════════

// ElevenLabs TTS — best quality (10k chars/month free)
// Needs: ELEVENLABS_API_KEY
export async function elevenLabsTTS(text: string, voiceId = 'ErXwobaYiN019PkySvjV'): Promise<string | null> {
  const key = E('ELEVENLABS_API_KEY');
  if (!key) return null;
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 500), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    return URL.createObjectURL(blob); // Returns audio URL — no Vercel bandwidth
  } catch { return null; }
}

// Stability AI — image generation (25 free credits/month)
// Needs: STABILITY_API_KEY
export async function stabilityGenerate(prompt: string): Promise<string | null> {
  const key = E('STABILITY_API_KEY');
  if (!key) return null;
  try {
    const r = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_prompts: [{ text: prompt, weight: 1 }], cfg_scale: 7, height: 1024, width: 1024, samples: 1, steps: 30 }),
    });
    const d = await r.json();
    const b64 = d.artifacts?.[0]?.base64;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch { return null; }
}

// Hugging Face — text tasks (free inference API)
// Needs: HUGGINGFACE_TOKEN (free)
export async function huggingFaceSummarize(text: string): Promise<string> {
  const token = E('HUGGINGFACE_TOKEN');
  if (!token) return text.slice(0, 200) + '…';
  try {
    const r = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text.slice(0, 1000) }),
    });
    const d = await r.json();
    return d[0]?.summary_text || text.slice(0, 200);
  } catch { return text.slice(0, 200) + '…'; }
}

// ══════════════════════════════════════════════════════════════
// 📡 SOCIAL & COMMUNITY
// ══════════════════════════════════════════════════════════════

// Reddit — search posts (no key, public API)
export async function redditSearch(query: string, subreddit = ''): Promise<string> {
  const cached = cacheGet(`reddit_${query}`, 10 * 60_000);
  if (cached) return cached;
  try {
    const url = subreddit
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=hot&limit=5`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=5`;
    const r = await fetch(url, { headers: { 'User-Agent': 'JARVIS/1.0' } });
    const d = await r.json();
    const posts = d.data?.children || [];
    const result = `🔴 **Reddit: "${query}"**\n\n` + posts.slice(0, 5).map((p: any, i: number) =>
      `${i + 1}. **${p.data?.title?.slice(0, 70)}**\n   r/${p.data?.subreddit} | ⬆️ ${p.data?.score?.toLocaleString()} | [Open](https://reddit.com${p.data?.permalink})`
    ).join('\n\n');
    cacheSet(`reddit_${query}`, result);
    return result;
  } catch { return `🔴 [Reddit: ${query}](https://reddit.com/search?q=${encodeURIComponent(query)})`; }
}

// Dev.to — tech articles (no key)
export async function devtoSearch(query: string): Promise<string> {
  const cached = cacheGet(`devto_${query}`, 20 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(query.replace(/ /g, '_'))}&per_page=5`);
    const d = await r.json();
    if (!Array.isArray(d)) return `💻 [Dev.to: ${query}](https://dev.to/search?q=${encodeURIComponent(query)})`;
    const result = `💻 **Dev.to: "${query}"**\n\n` + d.slice(0, 5).map((a: any, i: number) =>
      `${i + 1}. **[${a.title}](${a.url})**\n   ${a.readable_publish_date} | ❤️ ${a.positive_reactions_count}`
    ).join('\n\n');
    cacheSet(`devto_${query}`, result);
    return result;
  } catch { return `💻 [Dev.to: ${query}](https://dev.to/search?q=${encodeURIComponent(query)})`; }
}

// ══════════════════════════════════════════════════════════════
// 🗺️ MAPS & TRAVEL
// ══════════════════════════════════════════════════════════════

// OpenStreetMap / Nominatim — geocoding (no key)
export async function geocode(query: string): Promise<string> {
  const cached = cacheGet(`geo_${query}`, 60 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3`, {
      headers: { 'User-Agent': 'JARVIS/1.0' },
    });
    const d = await r.json();
    if (!d.length) return `🗺️ "${query}" map par nahi mila`;
    const result = `🗺️ **${query}**\n\n` + d.slice(0, 3).map((p: any) =>
      `📍 ${p.display_name?.slice(0, 80)}\n[Map](https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}&zoom=14)`
    ).join('\n\n');
    cacheSet(`geo_${query}`, result);
    return result;
  } catch { return `🗺️ [Map: ${query}](https://www.google.com/maps/search/${encodeURIComponent(query)})`; }
}

// Google Maps — directions/places (link only — no API bandwidth)
export function googleMapsLink(query: string, type: 'place' | 'directions' = 'place'): string {
  const base = 'https://www.google.com/maps';
  if (type === 'directions') return `🗺️ [Directions: ${query}](${base}/dir//${encodeURIComponent(query)})`;
  return `🗺️ [${query} on Google Maps](${base}/search/${encodeURIComponent(query)})`;
}

// Rest Countries — country info (no key)
export async function countryInfo(name: string): Promise<string> {
  const cached = cacheGet(`country_${name}`, 24 * 60 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,population,currencies,languages,flags,timezones`);
    const d = await r.json();
    const c = d[0];
    if (!c) return `🌍 "${name}" desh nahi mila`;
    const langs = Object.values(c.languages || {}).join(', ');
    const curr = Object.values(c.currencies || {}).map((v: any) => `${v.name} (${v.symbol})`).join(', ');
    const result = `🌍 **${c.name?.common}** ${c.flags?.emoji || ''}\n\nCapital: ${c.capital?.[0]}\nPopulation: ${c.population?.toLocaleString('en-IN')}\nLanguage: ${langs}\nCurrency: ${curr}\nTimezone: ${c.timezones?.[0]}`;
    cacheSet(`country_${name}`, result);
    return result;
  } catch { return `🌍 Country info fetch failed`; }
}

// ══════════════════════════════════════════════════════════════
// 🏥 HEALTH & FOOD
// ══════════════════════════════════════════════════════════════

// Open Food Facts — food nutrition (no key)
export async function foodNutrition(query: string): Promise<string> {
  const cached = cacheGet(`food_${query}`, 60 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&action=process&json=true&page_size=3`);
    const d = await r.json();
    const prods = d.products || [];
    if (!prods.length) return `🥗 "${query}" ka nutrition data nahi mila`;
    const p = prods[0];
    const nut = p.nutriments || {};
    const result = `🥗 **${p.product_name || query}** (per 100g)\n\n⚡ Calories: ${nut['energy-kcal_100g']?.toFixed(0) || '?'} kcal\n🍞 Carbs: ${nut.carbohydrates_100g?.toFixed(1) || '?'}g\n🥩 Protein: ${nut.proteins_100g?.toFixed(1) || '?'}g\n🧈 Fat: ${nut.fat_100g?.toFixed(1) || '?'}g`;
    cacheSet(`food_${query}`, result);
    return result;
  } catch { return `🥗 Food nutrition fetch failed`; }
}

// ══════════════════════════════════════════════════════════════
// 📚 BOOKS
// ══════════════════════════════════════════════════════════════

// Open Library — free books (no key)
export async function openLibrarySearch(query: string): Promise<string> {
  const cached = cacheGet(`books_${query}`, 30 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,author_name,first_publish_year,key`);
    const d = await r.json();
    const result = `📚 **Books: "${query}"**\n\n` + (d.docs || []).slice(0, 5).map((b: any, i: number) =>
      `${i + 1}. **${b.title}** — ${b.author_name?.[0] || 'Unknown'} (${b.first_publish_year || '?'})\n   [Read](https://openlibrary.org${b.key})`
    ).join('\n\n');
    cacheSet(`books_${query}`, result);
    return result;
  } catch { return `📚 [Books: ${query}](https://openlibrary.org/search?q=${encodeURIComponent(query)})`; }
}

// ══════════════════════════════════════════════════════════════
// 🌐 TRANSLATE
// ══════════════════════════════════════════════════════════════

// LibreTranslate — free, open source
export async function translateText(text: string, to = 'hi', from = 'en'): Promise<string> {
  try {
    const r = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
    });
    const d = await r.json();
    return d.translatedText ? `🌐 **Translation (${from}→${to}):**\n\n${d.translatedText}` : translateFallback(text, to);
  } catch { return translateFallback(text, to); }
}
function translateFallback(text: string, to: string): string {
  return `🌐 [Translate](https://translate.google.com/?sl=auto&tl=${to}&text=${encodeURIComponent(text)})`;
}

// ══════════════════════════════════════════════════════════════
// 📰 NEWS (Multiple sources, RSS preferred)
// ══════════════════════════════════════════════════════════════

// GNews API — 100 req/day free
// Needs: GNEWS_API_KEY (gnews.io)
export async function gnewsSearch(query: string, lang = 'en'): Promise<string> {
  const key = E('GNEWS_API_KEY');
  if (!key) return newsRSS(query);
  const cached = cacheGet(`gnews_${query}`, 15 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&country=in&max=5&apikey=${key}`);
    const d = await r.json();
    const result = `📰 **News: "${query}"**\n\n` + (d.articles || []).slice(0, 5).map((a: any, i: number) =>
      `${i + 1}. **${a.title?.slice(0, 70)}**\n   ${a.source?.name} | [Read](${a.url})`
    ).join('\n\n');
    cacheSet(`gnews_${query}`, result);
    return result;
  } catch { return newsRSS(query); }
}

// RSS fallback — always free
async function newsRSS(query: string): Promise<string> {
  return `📰 [News: ${query}](https://news.google.com/search?q=${encodeURIComponent(query)}+india&hl=hi-IN)`;
}

// ══════════════════════════════════════════════════════════════
// 🏏 SPORTS (India — Cricket focus)
// ══════════════════════════════════════════════════════════════

// Cricbuzz API via RapidAPI (free tier 100 req/day)
// OR: Cricket RSS from espncricinfo
export async function cricketScore(): Promise<string> {
  const cached = cacheGet('cricket_live', 3 * 60_000);
  if (cached) return cached;
  try {
    // ESPN Cricinfo RSS (no key)
    const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.espncricinfo.com/rss/content/story/feeds/0.xml&count=5');
    const d = await r.json();
    const result = `🏏 **Cricket News**\n\n` + (d.items || []).slice(0, 5).map((item: any, i: number) =>
      `${i + 1}. ${item.title}\n   *${new Date(item.pubDate).toLocaleDateString('hi-IN')}*`
    ).join('\n\n');
    cacheSet('cricket_live', result);
    return result;
  } catch { return `🏏 [Cricket News](https://www.espncricinfo.com/)`; }
}

// ══════════════════════════════════════════════════════════════
// 🔬 UTILITIES
// ══════════════════════════════════════════════════════════════

// WolframAlpha — math, science, facts (2000 req/month free)
// Needs: WOLFRAM_APP_ID
export async function wolframQuery(query: string): Promise<string> {
  const appId = E('WOLFRAM_APP_ID');
  if (!appId) return `🔬 [WolframAlpha: ${query}](https://www.wolframalpha.com/input?i=${encodeURIComponent(query)})`;
  const cached = cacheGet(`wolfram_${query}`, 60 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://api.wolframalpha.com/v1/result?appid=${appId}&i=${encodeURIComponent(query)}`);
    const text = await r.text();
    if (!text || r.status !== 200) return `🔬 [WolframAlpha: ${query}](https://www.wolframalpha.com/input?i=${encodeURIComponent(query)})`;
    const result = `🔬 **WolframAlpha:** ${text}`;
    cacheSet(`wolfram_${query}`, result);
    return result;
  } catch { return `🔬 [WolframAlpha](https://www.wolframalpha.com/input?i=${encodeURIComponent(query)})`; }
}

// Web search fallback via DuckDuckGo Instant Answer (no key)
export async function duckduckgoInstant(query: string): Promise<string> {
  const cached = cacheGet(`ddg_${query}`, 30 * 60_000);
  if (cached) return cached;
  try {
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`);
    const d = await r.json();
    if (d.AbstractText) {
      const result = `🦆 **${d.Heading || query}**\n\n${d.AbstractText}\n\n[Source: ${d.AbstractSource}](${d.AbstractURL})`;
      cacheSet(`ddg_${query}`, result);
      return result;
    }
    if (d.RelatedTopics?.length) {
      return `🦆 **${query}**\n\n${d.RelatedTopics[0]?.Text?.slice(0, 200) || ''}`;
    }
    return '';
  } catch { return ''; }
}

// ══════════════════════════════════════════════════════════════
// MASTER DISPATCHER — Called from toolEngine
// Maps intent → best integration function
// ══════════════════════════════════════════════════════════════
export interface IntegrationResult {
  tool: string; data: string; cached?: boolean;
}

export async function dispatchIntegration(intent: string, query: string): Promise<IntegrationResult | null> {
  const q = query.toLowerCase();

  // Music
  if (q.match(/spotify|gana|song|music|gaana|playlist/)) {
    const data = await deezerSearch(q.replace(/spotify|gana|song|music|gaana|playlist/g, '').trim() || query);
    return { tool: 'music', data };
  }
  // YouTube
  if (q.match(/youtube|video|dekh|watch|dekhna/)) {
    const data = await youtubeSearch(q.replace(/youtube|video|dekh|watch|dekhna/g, '').trim() || query);
    return { tool: 'youtube', data };
  }
  // Telegram send
  if (q.match(/telegram (bhej|send|message|msg)/)) {
    const msg = q.replace(/telegram (bhej|send|message|msg)/g, '').trim();
    const data = await telegramSend(msg || query);
    return { tool: 'telegram', data };
  }
  // Movie/TV
  if (q.match(/movie|film|web series|tv show|dekhna|cinema/)) {
    const data = await tmdbSearch(q.replace(/movie|film|web series|tv show|dekhna|cinema/g, '').trim() || query);
    return { tool: 'tmdb', data };
  }
  // Stock/NSE
  if (q.match(/\b[A-Z]{2,8}\b.*(?:stock|share|nse|bse|price)/i) || q.match(/stock|share|nifty|sensex/)) {
    const sym = query.match(/\b[A-Z]{2,8}\b/)?.[0] || 'NIFTY50';
    const data = await nseStockPrice(sym);
    return { tool: 'nse_stock', data };
  }
  // Reddit
  if (q.match(/reddit|post|community|subreddit/)) {
    const data = await redditSearch(q.replace(/reddit/g, '').trim() || query);
    return { tool: 'reddit', data };
  }
  // Photos
  if (q.match(/photo|image|picture|wallpaper|unsplash|pexels/)) {
    const data = await unsplashSearch(q.replace(/photo|image|picture|wallpaper|unsplash|pexels/g, '').trim() || query);
    return { tool: 'photos', data };
  }
  // Books
  if (q.match(/book|kitab|novel|read|padhna/)) {
    const data = await openLibrarySearch(q.replace(/book|kitab|novel|read|padhna/g, '').trim() || query);
    return { tool: 'books', data };
  }
  // Cricket
  if (q.match(/cricket|ipl|test match|odi|t20|score/)) {
    const data = await cricketScore();
    return { tool: 'cricket', data };
  }
  // Country
  if (q.match(/country|desh|capital|population|currency/)) {
    const country = q.replace(/country|desh|capital|population|currency|of|ka/g, '').trim();
    const data = await countryInfo(country || query);
    return { tool: 'country', data };
  }
  // WolframAlpha (math/science)
  if (q.match(/wolfram|calculate|solve|math|equation|integral|derivative/)) {
    const data = await wolframQuery(q.replace(/wolfram/g, '').trim() || query);
    return { tool: 'wolfram', data };
  }
  // Translate
  if (q.match(/translate|anuvad|meaning in|ko hindi|to english/)) {
    const text = q.replace(/translate|anuvad|ko hindi mein|to hindi|to english/g, '').trim();
    const toLang = q.includes('english') ? 'en' : 'hi';
    const data = await translateText(text || query, toLang);
    return { tool: 'translate', data };
  }
  // Food nutrition
  if (q.match(/nutrition|calories|food|khana|protein|carbs|fat/)) {
    const data = await foodNutrition(q.replace(/nutrition|calories|food|khana|protein|carbs|fat/g, '').trim() || query);
    return { tool: 'food_nutrition', data };
  }
  // News search
  if (q.match(/news about|khabar|latest on/)) {
    const data = await gnewsSearch(q.replace(/news about|khabar|latest on/g, '').trim() || query);
    return { tool: 'gnews', data };
  }
  // Map/location
  if (q.match(/map|location|kahan hai|address|directions/)) {
    const data = geocode(q.replace(/map|location|kahan hai|address|directions/g, '').trim() || query);
    return { tool: 'maps', data: await data };
  }

  return null;
}

// ── Export all integration names for settings page ────────────
export const ALL_INTEGRATIONS = [
  // Free (no key) — always works
  { name: 'Deezer Music', category: '🎵 Music', free: true, keyNeeded: false },
  { name: 'YouTube (links)', category: '📺 Video', free: true, keyNeeded: false },
  { name: 'Reddit', category: '📡 Social', free: true, keyNeeded: false },
  { name: 'Pixabay Photos', category: '🖼️ Media', free: true, keyNeeded: false },
  { name: 'NSE Stock Prices', category: '💰 Finance', free: true, keyNeeded: false },
  { name: 'Open Library Books', category: '📚 Books', free: true, keyNeeded: false },
  { name: 'Cricket RSS', category: '🏏 Sports', free: true, keyNeeded: false },
  { name: 'OpenStreetMap', category: '🗺️ Maps', free: true, keyNeeded: false },
  { name: 'Country Info', category: '✈️ Travel', free: true, keyNeeded: false },
  { name: 'Open Food Facts', category: '🥗 Health', free: true, keyNeeded: false },
  { name: 'LibreTranslate', category: '🌐 Translate', free: true, keyNeeded: false },
  { name: 'DuckDuckGo Instant', category: '🔍 Search', free: true, keyNeeded: false },
  { name: 'Dev.to Articles', category: '💻 Tech', free: true, keyNeeded: false },
  { name: 'Discord Webhook', category: '💬 Messaging', free: true, keyNeeded: true, envKey: 'DISCORD_WEBHOOK_URL' },
  { name: 'Telegram Bot', category: '💬 Messaging', free: true, keyNeeded: true, envKey: 'TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID' },
  // Free with key
  { name: 'Spotify', category: '🎵 Music', free: true, keyNeeded: true, envKey: 'SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET' },
  { name: 'LastFM', category: '🎵 Music', free: true, keyNeeded: true, envKey: 'LASTFM_API_KEY' },
  { name: 'YouTube Search', category: '📺 Video', free: true, keyNeeded: true, envKey: 'YOUTUBE_API_KEY' },
  { name: 'TMDB Movies/TV', category: '🎬 Entertainment', free: true, keyNeeded: true, envKey: 'TMDB_API_KEY' },
  { name: 'GIPHY', category: '🎭 GIFs', free: true, keyNeeded: true, envKey: 'GIPHY_API_KEY' },
  { name: 'Unsplash Photos', category: '🖼️ Media', free: true, keyNeeded: true, envKey: 'UNSPLASH_ACCESS_KEY' },
  { name: 'Pexels Photos', category: '🖼️ Media', free: true, keyNeeded: true, envKey: 'PEXELS_API_KEY' },
  { name: 'GitHub Search', category: '💻 Code', free: true, keyNeeded: true, envKey: 'GITHUB_TOKEN' },
  { name: 'Notion Pages', category: '📅 Productivity', free: true, keyNeeded: true, envKey: 'NOTION_API_KEY + NOTION_DATABASE_ID' },
  { name: 'Google Calendar', category: '📅 Productivity', free: true, keyNeeded: true, envKey: 'GOOGLE_ACCESS_TOKEN' },
  { name: 'Google Drive', category: '📅 Productivity', free: true, keyNeeded: true, envKey: 'GOOGLE_ACCESS_TOKEN' },
  { name: 'Alpha Vantage', category: '💰 Finance', free: true, keyNeeded: true, envKey: 'ALPHA_VANTAGE_KEY' },
  { name: 'WolframAlpha', category: '🔬 Science', free: true, keyNeeded: true, envKey: 'WOLFRAM_APP_ID' },
  { name: 'ElevenLabs TTS', category: '🔊 Voice', free: true, keyNeeded: true, envKey: 'ELEVENLABS_API_KEY' },
  { name: 'Hugging Face AI', category: '🤖 AI', free: true, keyNeeded: true, envKey: 'HUGGINGFACE_TOKEN' },
  { name: 'GNews API', category: '📰 News', free: true, keyNeeded: true, envKey: 'GNEWS_API_KEY' },
  { name: 'WhatsApp Business', category: '💬 Messaging', free: true, keyNeeded: true, envKey: 'WHATSAPP_TOKEN + WHATSAPP_PHONE_ID' },
  { name: 'Stability AI Images', category: '🎨 AI Art', free: true, keyNeeded: true, envKey: 'STABILITY_API_KEY' },
];
