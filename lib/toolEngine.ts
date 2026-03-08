// ══════════════════════════════════════════════════════════════
// JARVIS AUTONOMOUS TOOL ENGINE
// - Intent detection → category → lazy-load tools → execute (max 2)
// - 5-min result cache (localStorage) — saves API credits
// - No-key APIs preferred: Open-Meteo, JokeAPI, Quotable, Nager.Date
// - Auto-fallback chain per tool
// - Scales to 150+ tools without slowdown
// ══════════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────────
export interface ToolResult {
  tool: string;
  data: any;
  cached: boolean;
  source?: string;
}

type ToolCategory =
  | 'weather' | 'finance' | 'news' | 'utilities'
  | 'education' | 'india' | 'productivity' | 'entertainment'
  | 'health' | 'social' | 'search' | 'datetime';

// ── Intent → Category mapping ──────────────────────────────────
const INTENT_MAP: Record<string, ToolCategory[]> = {
  // Weather
  weather: ['weather'], mausam: ['weather'], barish: ['weather'],
  temperature: ['weather'], garmi: ['weather'], sardi: ['weather'],
  forecast: ['weather'], aaj: ['weather', 'datetime'],

  // Finance
  bitcoin: ['finance'], crypto: ['finance'], stock: ['finance'],
  price: ['finance'], rupee: ['finance'], dollar: ['finance'],
  emi: ['finance'], sip: ['finance'], gst: ['finance'],
  invest: ['finance'], share: ['finance'], market: ['finance'],

  // News
  news: ['news'], khabar: ['news'], today: ['news', 'datetime'],
  india: ['india', 'news'], headline: ['news'], latest: ['news'],

  // India specific
  msp: ['india'], holiday: ['india', 'datetime'], festival: ['india', 'datetime'],
  sarkar: ['india'], government: ['india'], scheme: ['india'],
  pincode: ['india'], state: ['india'],

  // Entertainment
  joke: ['entertainment'], funny: ['entertainment'], mazak: ['entertainment'],
  quote: ['entertainment', 'productivity'], motivation: ['entertainment', 'productivity'],
  song: ['entertainment'], movie: ['entertainment'], film: ['entertainment'],

  // Education
  wiki: ['education'], wikipedia: ['education'], kya_hai: ['education'],
  history: ['education'], science: ['education'], math: ['education'],
  meaning: ['education'], word: ['education'], definition: ['education'],

  // Utilities
  calculate: ['utilities'], calc: ['utilities'], unit: ['utilities'],
  convert: ['utilities'], qr: ['utilities'], shorten: ['utilities'],
  translate: ['utilities'], time: ['datetime', 'utilities'],

  // Health
  bmi: ['health'], calories: ['health'], water: ['health'],
  diet: ['health'], exercise: ['health'], health: ['health'],
  doctor: ['health'], medicine: ['health'],

  // Productivity
  todo: ['productivity'], reminder: ['productivity'], goal: ['productivity'],
  task: ['productivity'], plan: ['productivity'], schedule: ['productivity'],
  habit: ['productivity'], pomodoro: ['productivity'],

  // Social
  post: ['social'], instagram: ['social'], caption: ['social'],
  quote_image: ['social'], share: ['social'],

  // Search
  search: ['search'], find: ['search'], dhundh: ['search'],
  recipe: ['search', 'education'], book: ['search', 'education'],
};

// ── Detect categories from query ───────────────────────────────
export function detectCategories(query: string): ToolCategory[] {
  const q = query.toLowerCase();
  const found = new Set<ToolCategory>();

  for (const [keyword, cats] of Object.entries(INTENT_MAP)) {
    if (q.includes(keyword.replace('_', ' ')) || q.includes(keyword)) {
      cats.forEach(c => found.add(c));
    }
  }

  // Context clues
  if (q.match(/\d+\s*(°|degree|celsius|farenheit)/)) found.add('weather');
  if (q.match(/₹|\$|usd|inr|btc|eth/i)) found.add('finance');
  if (q.match(/\d+\s*%|\d+\s*years|\d+\s*months/)) found.add('finance');
  if (q.match(/who is|what is|explain|define|tell me about/i)) found.add('education');
  if (q.match(/image|photo|picture|generate|banao|bana/i)) found.add('social');
  if (q.match(/kal|aaj|parso|date|din|week|month/i)) found.add('datetime');

  return found.size > 0 ? [...found] : ['search'];
}

// ── Tool definitions per category ─────────────────────────────
// Each tool has: name, keywords, fn, priority (lower = try first), noKey (preferred)
interface ToolDef {
  name: string;
  keywords: string[];
  priority: number;
  noKey: boolean;
  fn: (query: string, params?: any) => Promise<string>;
}

// ── Cache helpers ──────────────────────────────────────────────
const CACHE_TTL: Record<ToolCategory, number> = {
  weather: 10 * 60_000,     // 10 min
  finance: 5 * 60_000,      // 5 min
  news: 15 * 60_000,        // 15 min
  india: 60 * 60_000,       // 1 hr
  entertainment: 30 * 60_000,
  education: 60 * 60_000,
  utilities: 0,              // no cache (calc etc)
  health: 0,
  productivity: 0,
  social: 0,
  search: 5 * 60_000,
  datetime: 0,
};

function cacheGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`tc_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    const cat = key.split('_')[0] as ToolCategory;
    const ttl = CACHE_TTL[cat] || 5 * 60_000;
    if (ttl === 0) return null;
    if (Date.now() - ts > ttl) { localStorage.removeItem(`tc_${key}`); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key: string, data: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`tc_${key}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// ── Tool implementations ───────────────────────────────────────

// WEATHER — Open-Meteo (NO KEY, free forever)
async function toolWeather(query: string): Promise<string> {
  const cacheKey = `weather_rewa`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached + ' *(cached)*';

  // Get location from ip-api (no key)
  let lat = 24.54, lon = 81.30, city = 'Rewa';
  try {
    const loc = await fetch('http://ip-api.com/json/?fields=lat,lon,city', { signal: AbortSignal.timeout(3000) });
    const ld = await loc.json();
    if (ld.lat) { lat = ld.lat; lon = ld.lon; city = ld.city || 'Rewa'; }
  } catch {}

  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=3`,
    { signal: AbortSignal.timeout(5000) }
  );
  const d = await r.json();
  const c = d.current;

  const WMO: Record<number, string> = {
    0: '☀️ Clear', 1: '🌤️ Mostly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
    45: '🌫️ Foggy', 48: '🌫️ Foggy', 51: '🌦️ Drizzle', 53: '🌦️ Drizzle',
    61: '🌧️ Rain', 63: '🌧️ Heavy rain', 71: '❄️ Snow', 80: '🌦️ Showers',
    95: '⛈️ Thunderstorm',
  };

  const desc = WMO[c.weathercode] || '🌡️ ' + c.weathercode;
  const result = `**🌤️ ${city} ka Mausam**\n\n${desc} | 🌡️ ${c.temperature_2m}°C | 💧 ${c.relative_humidity_2m}% humidity | 💨 ${c.wind_speed_10m} km/h\n\n**Agle 3 din:**\n${d.daily.time.slice(0,3).map((t: string, i: number) =>
    `${t}: ${d.daily.temperature_2m_min[i]}°–${d.daily.temperature_2m_max[i]}°C, ${d.daily.precipitation_sum[i]}mm rain`
  ).join('\n')}`;

  cacheSet(cacheKey, result);
  return result;
}

// CRYPTO — CoinGecko (no key, public)
async function toolCrypto(query: string): Promise<string> {
  const cacheKey = `finance_crypto`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached + ' *(cached)*';

  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin,ripple&vs_currencies=inr,usd&include_24hr_change=true', { signal: AbortSignal.timeout(5000) });
  const d = await r.json();

  const fmt = (n: number) => n?.toFixed(2);
  const arrow = (n: number) => n > 0 ? `🟢 +${fmt(n)}%` : `🔴 ${fmt(n)}%`;

  const result = `**💰 Crypto Prices**\n\n` +
    `₿ Bitcoin: ₹${d.bitcoin?.inr?.toLocaleString('en-IN')} (${arrow(d.bitcoin?.inr_24h_change)})\n` +
    `Ξ Ethereum: ₹${d.ethereum?.inr?.toLocaleString('en-IN')} (${arrow(d.ethereum?.inr_24h_change)})\n` +
    `◎ Solana: ₹${d.solana?.inr?.toLocaleString('en-IN')} (${arrow(d.solana?.inr_24h_change)})\n` +
    `🐕 Doge: ₹${d.dogecoin?.inr?.toFixed(4)} (${arrow(d.dogecoin?.inr_24h_change)})\n` +
    `*Updated: ${new Date().toLocaleTimeString('hi-IN')}*`;

  cacheSet(cacheKey, result);
  return result;
}

// EXCHANGE RATE — ExchangeRate-API (no key for basic)
async function toolExchange(query: string): Promise<string> {
  const cacheKey = `finance_exchange`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached + ' *(cached)*';

  const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  const result = `**💵 Exchange Rates (vs USD)**\n\n🇮🇳 INR: ₹${d.rates.INR?.toFixed(2)}\n🇪🇺 EUR: €${d.rates.EUR?.toFixed(4)}\n🇬🇧 GBP: £${d.rates.GBP?.toFixed(4)}\n🇯🇵 JPY: ¥${d.rates.JPY?.toFixed(2)}\n🇦🇪 AED: ${d.rates.AED?.toFixed(4)}\n🇸🇦 SAR: ${d.rates.SAR?.toFixed(4)}`;
  cacheSet(cacheKey, result);
  return result;
}

// NEWS — RSS feeds (no key)
async function toolNews(query: string): Promise<string> {
  const cacheKey = `news_india`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached + ' *(cached)*';

  // Using rss2json proxy (free)
  const feeds = [
    'https://feeds.feedburner.com/ndtvnews-india-news',
    'https://www.thehindu.com/news/national/feeder/default.rss',
  ];

  for (const feed of feeds) {
    try {
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&count=5`, { signal: AbortSignal.timeout(5000) });
      const d = await r.json();
      if (d.items?.length) {
        const result = `**📰 India News**\n\n` + d.items.slice(0, 5).map((item: any, i: number) =>
          `${i + 1}. ${item.title}\n   *${new Date(item.pubDate).toLocaleDateString('hi-IN')}*`
        ).join('\n\n') + `\n\n*Source: ${d.feed?.title}*`;
        cacheSet(cacheKey, result);
        return result;
      }
    } catch {}
  }
  return '📡 News abhi available nahi — thodi der mein try karo';
}

// JOKE — JokeAPI (no key)
async function toolJoke(): Promise<string> {
  const r = await fetch('https://v2.jokeapi.dev/joke/Programming,Misc?safe-mode&type=single', { signal: AbortSignal.timeout(4000) });
  const d = await r.json();
  return `😂 **Joke**\n\n${d.joke || `${d.setup}\n\n${d.delivery}`}`;
}

// QUOTE — Quotable (no key)
async function toolQuote(): Promise<string> {
  const r = await fetch('https://api.quotable.io/random?maxLength=150', { signal: AbortSignal.timeout(4000) });
  const d = await r.json();
  return `💬 **"${d.content}"**\n\n— *${d.author}*`;
}

// HOLIDAYS — Nager.Date (no key)
async function toolHolidays(): Promise<string> {
  const year = new Date().getFullYear();
  const cacheKey = `india_holidays_${year}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, { signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  const today = new Date();
  const upcoming = d.filter((h: any) => new Date(h.date) >= today).slice(0, 6);
  const result = `**🎉 Upcoming Holidays (India ${year})**\n\n` + upcoming.map((h: any) =>
    `📅 ${new Date(h.date).toLocaleDateString('hi-IN')} — **${h.localName || h.name}**`
  ).join('\n');
  cacheSet(cacheKey, result);
  return result;
}

// WIKI — Wikipedia REST API (no key)
async function toolWiki(query: string): Promise<string> {
  const topic = query.replace(/what is|what's|who is|tell me about|explain|kya hai/gi, '').trim();
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, { signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  if (d.extract) {
    return `📖 **${d.title}**\n\n${d.extract.slice(0, 500)}${d.extract.length > 500 ? '…' : ''}\n\n[Read more](${d.content_urls?.desktop?.page})`;
  }
  return `Wikipedia par "${topic}" nahi mila — kuch aur try karo`;
}

// WORD MEANING — Free Dictionary API (no key)
async function toolMeaning(query: string): Promise<string> {
  const word = query.replace(/meaning|define|definition|matlab/gi, '').trim().split(' ')[0];
  const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, { signal: AbortSignal.timeout(4000) });
  const d = await r.json();
  if (Array.isArray(d) && d[0]) {
    const entry = d[0];
    const meanings = entry.meanings?.slice(0, 2).map((m: any) =>
      `*${m.partOfSpeech}:* ${m.definitions?.[0]?.definition}`
    ).join('\n');
    return `📚 **${entry.word}**\n\nPhonetic: ${entry.phonetic || ''}\n\n${meanings}`;
  }
  return `"${word}" ka meaning nahi mila`;
}

// QR CODE — qrserver.com (no key, returns URL)
async function toolQR(query: string): Promise<string> {
  const text = query.replace(/qr|generate|banao/gi, '').trim() || 'JARVIS';
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
  return `**QR Code generated!**\n\n![QR](${url})\n\n[Download](${url})`;
}

// CALCULATOR
function toolCalc(query: string): string {
  const expr = query.replace(/calculate|calc|compute|kitna|kitne/gi, '').trim();
  try {
    const result = new Function('"use strict"; return (' + expr + ')')();
    return `🧮 **${expr} = ${result}**`;
  } catch { return `❌ "${expr}" calculate nahi ho saka`; }
}

// ISS LOCATION
async function toolISS(): Promise<string> {
  const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal: AbortSignal.timeout(4000) });
  const d = await r.json();
  return `🛸 **ISS Location**\n\nLatitude: ${d.latitude?.toFixed(2)}°\nLongitude: ${d.longitude?.toFixed(2)}°\nAltitude: ${d.altitude?.toFixed(1)} km\nSpeed: ${d.velocity?.toFixed(1)} km/h`;
}

// NASA APOD
async function toolNASA(): Promise<string> {
  const key = typeof process !== 'undefined' ? process.env.NASA_API_KEY || 'DEMO_KEY' : 'DEMO_KEY';
  const cacheKey = `search_nasa_${new Date().toDateString()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${key}`, { signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  const result = `🚀 **NASA: ${d.title}**\n\n${d.explanation?.slice(0, 300)}…\n\n📸 [View Image](${d.url})`;
  cacheSet(cacheKey, result);
  return result;
}

// PINCODE LOOKUP
async function toolPincode(query: string): Promise<string> {
  const pin = query.match(/\d{6}/)?.[0];
  if (!pin) return 'PIN code nahi mila query mein';
  const cacheKey = `india_pin_${pin}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(5000) });
  const d = await r.json();
  if (d[0]?.Status === 'Success') {
    const p = d[0].PostOffice?.[0];
    const result = `📮 **PIN ${pin}**\n\nCity: ${p?.Division}\nDistrict: ${p?.District}\nState: ${p?.State}\nCircle: ${p?.Circle}`;
    cacheSet(cacheKey, result);
    return result;
  }
  return `PIN ${pin} ka data nahi mila`;
}

// SOCIAL POST GENERATOR (uses AI via Puter/stream)
async function toolSocialPost(query: string): Promise<string> {
  const topic = query.replace(/post|caption|instagram|social|generate|banao/gi, '').trim();
  // Returns instruction — AI will handle generation
  return `__SOCIAL_POST_REQUEST__:${topic}`;
}

// DATETIME
function toolDateTime(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata', hour12: true };
  return `🕐 **Abhi ka Samay (IST)**\n\n📅 ${now.toLocaleDateString('hi-IN', options)}\n⏰ ${now.toLocaleTimeString('hi-IN', timeOpts)}\n🗓️ Week ${Math.ceil(now.getDate() / 7)} of the month`;
}

// MSP PRICES (static, always works)
function toolMSP(query: string): string {
  const MSP: Record<string, [number, string]> = {
    wheat: [2275, 'गेहूं'], rice: [2300, 'धान/चावल'], maize: [2090, 'मक्का'],
    soybean: [4892, 'सोयाबीन'], mustard: [5950, 'सरसों'], cotton: [7521, 'कपास'],
    sugarcane: [340, 'गन्ना'], gram: [5440, 'चना'], groundnut: [6783, 'मूंगफली'],
    masoor: [6425, 'मसूर'], tur: [7550, 'अरहर/तूर'],
  };
  const q = query.toLowerCase();
  for (const [crop, [price, hindiName]] of Object.entries(MSP)) {
    if (q.includes(crop) || q.includes(hindiName)) {
      return `🌾 **MSP 2024-25: ${hindiName} (${crop})**\n\n₹${price} प्रति क्विंटल\n₹${(price/100).toFixed(2)} प्रति किलो\n\n*Source: Agriculture Ministry, GoI*`;
    }
  }
  // Show all
  return `**🌾 MSP 2024-25 (सभी फसलें)**\n\n` + Object.entries(MSP).map(([c, [p, h]]) => `${h}: ₹${p}/क्विंटल`).join('\n');
}

// URL SHORTENER — TinyURL (no key)
async function toolShorten(query: string): Promise<string> {
  const url = query.match(/https?:\/\/\S+/)?.[0];
  if (!url) return 'URL nahi mili query mein';
  const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
  const short = await r.text();
  return `🔗 **Short URL**\n\n${short}`;
}

// ── Category → Tool loader ────────────────────────────────────
const CATEGORY_TOOLS: Record<ToolCategory, Array<{ name: string; keywords: string[]; fn: (q: string) => Promise<string> | string; noKey: boolean; priority: number }>> = {
  weather: [
    { name: 'open_meteo', keywords: ['mausam', 'weather', 'temperature', 'rain', 'barish', 'aaj', 'kal'], fn: toolWeather, noKey: true, priority: 1 },
  ],
  finance: [
    { name: 'crypto', keywords: ['bitcoin', 'btc', 'eth', 'crypto', 'coin'], fn: toolCrypto, noKey: true, priority: 1 },
    { name: 'exchange', keywords: ['dollar', 'usd', 'inr', 'rupee', 'exchange', 'rate'], fn: toolExchange, noKey: true, priority: 2 },
  ],
  news: [
    { name: 'india_news', keywords: ['news', 'khabar', 'headline', 'today', 'latest'], fn: toolNews, noKey: true, priority: 1 },
  ],
  india: [
    { name: 'holidays', keywords: ['holiday', 'festival', 'छुट्टी', 'tyohar'], fn: () => toolHolidays(), noKey: true, priority: 1 },
    { name: 'msp', keywords: ['msp', 'gehu', 'wheat', 'fasal', 'crop', 'kisan'], fn: toolMSP, noKey: true, priority: 2 },
    { name: 'pincode', keywords: ['pin', 'pincode', 'postal', 'area'], fn: toolPincode, noKey: true, priority: 3 },
  ],
  entertainment: [
    { name: 'joke', keywords: ['joke', 'funny', 'mazak', 'hasao', 'laugh'], fn: () => toolJoke(), noKey: true, priority: 1 },
    { name: 'quote', keywords: ['quote', 'motivation', 'inspire', 'suvichar'], fn: () => toolQuote(), noKey: true, priority: 2 },
  ],
  education: [
    { name: 'wikipedia', keywords: ['what is', 'who is', 'kya hai', 'explain', 'tell about', 'wiki'], fn: toolWiki, noKey: true, priority: 1 },
    { name: 'dictionary', keywords: ['meaning', 'define', 'matlab', 'word'], fn: toolMeaning, noKey: true, priority: 2 },
  ],
  utilities: [
    { name: 'calculator', keywords: ['calculate', 'calc', 'kitna', '+', '-', '*', '/'], fn: q => toolCalc(q), noKey: true, priority: 1 },
    { name: 'qr_code', keywords: ['qr', 'qrcode', 'barcode'], fn: toolQR, noKey: true, priority: 2 },
    { name: 'shorten_url', keywords: ['shorten', 'short url', 'link'], fn: toolShorten, noKey: true, priority: 3 },
    { name: 'datetime', keywords: ['time', 'date', 'kitne baje', 'samay'], fn: () => toolDateTime(), noKey: true, priority: 4 },
    { name: 'iss', keywords: ['iss', 'space station', 'satellite'], fn: () => toolISS(), noKey: true, priority: 5 },
    { name: 'nasa', keywords: ['nasa', 'space', 'apod'], fn: () => toolNASA(), noKey: false, priority: 6 },
  ],
  health: [
    { name: 'bmi_calc', keywords: ['bmi', 'weight', 'height', 'fat'], fn: q => {
      const nums = q.match(/\d+\.?\d*/g)?.map(Number);
      if (nums && nums.length >= 2) {
        const [h, w] = nums[0] > 100 ? [nums[0], nums[1]] : [nums[1], nums[0]];
        const bmi = w / ((h / 100) ** 2);
        const cat = bmi < 18.5 ? '🔵 Underweight' : bmi < 25 ? '🟢 Normal ✅' : bmi < 30 ? '🟡 Overweight' : '🔴 Obese';
        return `⚖️ **BMI: ${bmi.toFixed(1)}** — ${cat}`;
      }
      return '⚖️ BMI ke liye height (cm) aur weight (kg) batao';
    }, noKey: true, priority: 1 },
  ],
  productivity: [
    { name: 'datetime', keywords: ['time', 'date', 'schedule'], fn: () => toolDateTime(), noKey: true, priority: 1 },
  ],
  social: [
    { name: 'social_post', keywords: ['post', 'caption', 'instagram', 'generate post'], fn: toolSocialPost, noKey: true, priority: 1 },
  ],
  search: [
    { name: 'wikipedia', keywords: [], fn: toolWiki, noKey: true, priority: 1 },
  ],
  datetime: [
    { name: 'datetime', keywords: [], fn: () => toolDateTime(), noKey: true, priority: 1 },
    { name: 'holidays', keywords: ['holiday', 'festival'], fn: () => toolHolidays(), noKey: true, priority: 2 },
  ],
};

// ══════════════════════════════════════════════════════════════
// MAIN: Autonomous tool execution
// Returns max 2 tool results
// ══════════════════════════════════════════════════════════════
export async function runAutonomousTools(
  query: string,
  maxTools = 2
): Promise<ToolResult[]> {
  const cats = detectCategories(query);
  const results: ToolResult[] = [];
  const executedTools = new Set<string>();

  // Collect candidate tools sorted by priority + noKey preference
  const candidates: Array<{ cat: ToolCategory; tool: (typeof CATEGORY_TOOLS)[ToolCategory][0] }> = [];

  for (const cat of cats) {
    const tools = CATEGORY_TOOLS[cat] || [];
    for (const tool of tools) {
      // Check keyword relevance within category
      const q = query.toLowerCase();
      const relevant = tool.keywords.length === 0 || tool.keywords.some(kw => q.includes(kw));
      if (relevant && !executedTools.has(tool.name)) {
        candidates.push({ cat, tool });
      }
    }
  }

  // Sort: noKey first, then by priority
  candidates.sort((a, b) => {
    if (a.tool.noKey !== b.tool.noKey) return a.tool.noKey ? -1 : 1;
    return a.tool.priority - b.tool.priority;
  });

  // Execute top candidates
  for (const { tool } of candidates) {
    if (results.length >= maxTools) break;
    if (executedTools.has(tool.name)) continue;
    executedTools.add(tool.name);

    // Check cache first
    const cacheKey = `${tool.name}_${query.slice(0, 30).replace(/\W/g, '_')}`;
    const cached = cacheGet(cacheKey);
    if (cached && CACHE_TTL[candidates[0].cat] > 0) {
      results.push({ tool: tool.name, data: cached, cached: true });
      continue;
    }

    // Execute with fallback
    try {
      const data = await (tool.fn as (q: string) => Promise<string>)(query);
      if (data && !data.startsWith('__')) {
        if (CACHE_TTL[candidates[0].cat] > 0) cacheSet(cacheKey, data);
        results.push({ tool: tool.name, data, cached: false });
      } else if (data?.startsWith('__SOCIAL_POST_REQUEST__')) {
        results.push({ tool: tool.name, data, cached: false });
      }
    } catch (e) {
      console.warn(`[Tool ${tool.name}] failed:`, e);
      // Try next candidate automatically
    }
  }

  return results;
}

// ── Morning briefing (auto on app load) ───────────────────────
export async function getMorningBriefing(): Promise<string> {
  const cacheKey = `briefing_${new Date().toDateString()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Subah' : hour < 17 ? 'Dopahar' : hour < 21 ? 'Shaam' : 'Raat';
  const parts: string[] = [`**🌅 ${greeting} mubarak, Jons Bhai!**\n`];

  // Parallel fetch weather + holiday + quote + joke
  const [weatherRes, holidayRes, quoteRes, jokeRes] = await Promise.allSettled([
    toolWeather(''),
    toolHolidays(),
    toolQuote(),
    toolJoke(),
  ]);

  if (weatherRes.status === 'fulfilled') parts.push(weatherRes.value);
  if (holidayRes.status === 'fulfilled') {
    // Show only next holiday
    const lines = (holidayRes.value as string).split('\n').slice(0, 3);
    parts.push(lines.join('\n'));
  }
  if (quoteRes.status === 'fulfilled') parts.push(quoteRes.value);
  if (jokeRes.status === 'fulfilled') parts.push(jokeRes.value);

  const briefing = parts.join('\n\n---\n\n');
  cacheSet(cacheKey, briefing);
  return briefing;
}

// ── Check if query needs tools ─────────────────────────────────
export function queryNeedsTools(query: string): boolean {
  const q = query.toLowerCase();
  // Questions that benefit from real-time data
  const livePatterns = [
    /weather|mausam|temperature/i, /crypto|bitcoin|price/i,
    /news|khabar/i, /holiday|festival/i, /joke|funny/i,
    /quote|motivation/i, /calculate|calc/i, /qr|qrcode/i,
    /wiki|explain|what is|who is|kya hai/i, /msp|gehu|wheat/i,
    /pincode|postal/i, /time|date|samay/i, /iss|space station/i,
    /nasa|apod/i, /shorten|short url/i, /exchange|dollar/i,
    /meaning|define/i,
  ];
  return livePatterns.some(p => p.test(q));
}
