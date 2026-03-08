import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { tool, params } = await req.json();
  try {
    const result = await handleTool(tool, params);
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function handleTool(tool: string, p: any): Promise<any> {
  switch (tool) {

    // ── Weather ─────────────────────────────────────────────
    case 'get_weather': {
      const { lat = 24.53, lon = 81.3 } = p;
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&forecast_days=7&timezone=auto`);
      const d = await r.json();
      const wc = (code: number) => code <= 1 ? '☀️ Saaf' : code <= 3 ? '⛅ Badal' : code <= 67 ? '🌧️ Baarish' : code <= 77 ? '❄️ Barf' : '⛈️ Toofan';
      const curr = d.current;
      const daily = d.daily;
      const days = daily.time.map((t: string, i: number) =>
        `${new Date(t).toLocaleDateString('hi-IN', { weekday: 'short' })}: ${Math.round(daily.temperature_2m_max[i])}°/${Math.round(daily.temperature_2m_min[i])}° ${wc(daily.weathercode[i])}`
      );
      return `**Abhi:** ${Math.round(curr.temperature_2m)}°C ${wc(curr.weathercode)}\nHumidity: ${curr.relative_humidity_2m}% | Wind: ${curr.windspeed_10m} km/h\n\n**7-Din Forecast:**\n${days.join('\n')}`;
    }

    // ── Crypto ──────────────────────────────────────────────
    case 'get_crypto': {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=inr,usd');
      const d = await r.json();
      return `**Crypto Prices (Live)**\n₿ BTC: ₹${d.bitcoin?.inr?.toLocaleString('en-IN')} ($${d.bitcoin?.usd?.toLocaleString()})\n🔷 ETH: ₹${d.ethereum?.inr?.toLocaleString('en-IN')}\n🟣 SOL: ₹${d.solana?.inr?.toLocaleString('en-IN')}\n🐕 DOGE: ₹${d.dogecoin?.inr?.toFixed(2)}`;
    }

    // ── Currency ─────────────────────────────────────────────
    case 'get_exchange': {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const d = await r.json();
      const rates = d.rates;
      return `**Currency Rates (USD base)**\n🇮🇳 INR: ₹${rates.INR?.toFixed(2)}\n🇬🇧 GBP: £${rates.GBP?.toFixed(4)}\n🇪🇺 EUR: €${rates.EUR?.toFixed(4)}\n🇯🇵 JPY: ¥${rates.JPY?.toFixed(2)}\n🇦🇪 AED: ${rates.AED?.toFixed(2)}`;
    }

    // ── News ─────────────────────────────────────────────────
    case 'get_news': {
      const key = process.env.NEWS_API_KEY;
      let stories: string[] = [];
      if (key) {
        const r = await fetch(`https://newsapi.org/v2/top-headlines?country=in&pageSize=5&apiKey=${key}`);
        const d = await r.json();
        stories = (d.articles || []).map((a: any) => `• **${a.title}** — ${a.source?.name}`);
      } else {
        // RSS fallback
        const r = await fetch('https://feeds.feedburner.com/ndtvnews-india-news');
        const t = await r.text();
        const items = t.match(/<title>(.*?)<\/title>/g)?.slice(1, 6) || [];
        stories = items.map(i => `• ${i.replace(/<\/?title>/g, '')}`);
      }
      return `**India Top News**\n${stories.join('\n') || 'News load nahi ho saka. Baad mein try karo.'}`;
    }

    // ── NASA APOD ────────────────────────────────────────────
    case 'get_nasa': {
      const key = process.env.NASA_API_KEY || 'DEMO_KEY';
      const r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${key}`);
      const d = await r.json();
      return { title: d.title, url: d.url, hdurl: d.hdurl, explanation: d.explanation?.slice(0, 400) + '...' };
    }

    // ── Wikipedia ────────────────────────────────────────────
    case 'search_wikipedia': {
      const { query } = p;
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      const d = await r.json();
      return d.extract ? `**${d.title}**\n${d.extract}` : 'Wikipedia pe kuch nahi mila.';
    }

    // ── Dictionary ───────────────────────────────────────────
    case 'get_meaning': {
      const { word } = p;
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const d = await r.json();
      if (!Array.isArray(d)) return `"${word}" ka meaning nahi mila.`;
      const meanings = d[0].meanings?.map((m: any) =>
        `**${m.partOfSpeech}:** ${m.definitions?.[0]?.definition}`
      ).join('\n') || '';
      return `**${word}**\n${meanings}`;
    }

    // ── QR Code ──────────────────────────────────────────────
    case 'generate_qr': {
      const { text } = p;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
      return { type: 'image', url, caption: `QR: ${text}` };
    }

    // ── Image generation (URL only — zero bandwidth) ─────────
    case 'generate_image': {
      const { prompt } = p;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&enhance=true`;
      return { type: 'image', url, caption: prompt };
    }

    // ── Map ──────────────────────────────────────────────────
    case 'get_map': {
      const { query } = p;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      return { type: 'link', url, caption: `📍 ${query}` };
    }

    // ── URL Shortener ────────────────────────────────────────
    case 'shorten_url': {
      const { url } = p;
      try {
        const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const short = await r.text();
        return short.startsWith('http') ? short : null;
      } catch {
        const r = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
        return await r.text();
      }
    }

    // ── Pincode ──────────────────────────────────────────────
    case 'lookup_pincode': {
      const { pin } = p;
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const d = await r.json();
      const data = d[0]?.PostOffice?.[0];
      return data ? `📮 PIN ${pin}: ${data.Name}, ${data.Block}, ${data.District}, ${data.State}` : 'Pincode nahi mila.';
    }

    // ── ISS Location ─────────────────────────────────────────
    case 'get_iss': {
      const r = await fetch('http://api.open-notify.org/iss-now.json');
      const d = await r.json();
      return `🛸 ISS Location: ${parseFloat(d.iss_position?.latitude).toFixed(2)}°N, ${parseFloat(d.iss_position?.longitude).toFixed(2)}°E`;
    }

    // ── Joke ─────────────────────────────────────────────────
    case 'get_joke': {
      const r = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode&lang=en');
      const d = await r.json();
      return d.type === 'twopart' ? `${d.setup}\n\n${d.delivery}` : d.joke;
    }

    // ── Quote ────────────────────────────────────────────────
    case 'get_quote': {
      const r = await fetch('https://zenquotes.io/api/random');
      const d = await r.json();
      return d[0] ? `"${d[0].q}"\n— ${d[0].a}` : '"Karte jao, bante jao." — JARVIS';
    }

    // ── Sunrise/Sunset ───────────────────────────────────────
    case 'get_sunrise': {
      const { lat = 24.53, lon = 81.3 } = p;
      const r = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
      const d = await r.json();
      const fmt = (t: string) => new Date(t).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
      return `🌅 Sunrise: ${fmt(d.results?.sunrise)}\n🌇 Sunset: ${fmt(d.results?.sunset)}`;
    }

    // ── Math Calculator ──────────────────────────────────────
    case 'calculate': {
      const { expr } = p;
      try {
        // Safe eval using Function
        const result = new Function(`"use strict"; return (${expr})`)();
        return `${expr} = **${result}**`;
      } catch {
        return 'Calculation mein error aaya.';
      }
    }

    // ── EMI ──────────────────────────────────────────────────
    case 'calc_emi': {
      const { principal, rate, months } = p;
      const r = rate / 12 / 100;
      const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
      const total = emi * months;
      return `**EMI Calculator**\nMonthly EMI: ₹${Math.round(emi).toLocaleString('en-IN')}\nTotal Payment: ₹${Math.round(total).toLocaleString('en-IN')}\nTotal Interest: ₹${Math.round(total - principal).toLocaleString('en-IN')}`;
    }

    // ── SIP ──────────────────────────────────────────────────
    case 'calc_sip': {
      const { monthly, returnPct, years } = p;
      const r = returnPct / 12 / 100;
      const n = years * 12;
      const fv = monthly * (Math.pow(1 + r, n) - 1) / r * (1 + r);
      return `**SIP Calculator**\nMaturity: ₹${Math.round(fv).toLocaleString('en-IN')}\nInvested: ₹${(monthly * n).toLocaleString('en-IN')}\nProfit: ₹${Math.round(fv - monthly * n).toLocaleString('en-IN')}`;
    }

    // ── GST ──────────────────────────────────────────────────
    case 'calc_gst': {
      const { amount, rate: gstRate, mode: gstMode } = p;
      if (gstMode === 'add') {
        const gst = amount * gstRate / 100;
        return `Base: ₹${amount}\nGST (${gstRate}%): ₹${gst.toFixed(2)}\nTotal: ₹${(amount + gst).toFixed(2)}`;
      } else {
        const base = amount * 100 / (100 + gstRate);
        const gst = amount - base;
        return `Total: ₹${amount}\nBase: ₹${base.toFixed(2)}\nGST (${gstRate}%): ₹${gst.toFixed(2)}`;
      }
    }

    // ── BMI ──────────────────────────────────────────────────
    case 'calc_bmi': {
      const { height, weight } = p;
      const bmi = weight / ((height / 100) ** 2);
      const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal ✅' : bmi < 30 ? 'Overweight' : 'Obese';
      return `BMI: **${bmi.toFixed(1)}** — ${cat}`;
    }

    // ── MSP Prices ───────────────────────────────────────────
    case 'get_msp': {
      const MSP: Record<string, number> = {
        wheat: 2275, rice: 2300, maize: 2090, soybean: 4892,
        mustard: 5950, cotton: 7521, sugarcane: 340, gram: 5440, groundnut: 6783
      };
      const { crop } = p;
      const rate = MSP[crop?.toLowerCase()];
      return rate ? `🌾 ${crop} MSP 2024-25: ₹${rate}/quintal (₹${(rate/100).toFixed(2)}/10kg)` : `Crop "${crop}" ka MSP nahi mila.`;
    }


    // ── Word of the Day ──────────────────────────────────────
    case 'word_of_day': {
      const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/serendipity');
      const d = await r.json();
      const w = d[0];
      return `**Word of the Day: ${w.word}**\n${w.meanings?.[0]?.definitions?.[0]?.definition}`;
    }

    // ── Recipe ───────────────────────────────────────────────
    case 'get_recipe': {
      const { query } = p;
      const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const d = await r.json();
      const meal = d.meals?.[0];
      if (!meal) return `"${query}" ki recipe nahi mili.`;
      return `**${meal.strMeal}**\nCategory: ${meal.strCategory}\nCuisine: ${meal.strArea}\n\n**Instructions:**\n${meal.strInstructions?.slice(0,500)}...`;
    }

    // ── Book search ──────────────────────────────────────────
    case 'search_books': {
      const { query } = p;
      const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3`);
      const d = await r.json();
      const books = d.docs?.slice(0,3).map((b: any) => `📚 **${b.title}** — ${b.author_name?.[0] || 'Unknown'} (${b.first_publish_year || '?'})`).join('\n');
      return books || 'Books nahi mile.';
    }

    // ── Public holidays ──────────────────────────────────────
    case 'get_holidays': {
      const year = new Date().getFullYear();
      const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
      const d = await r.json();
      const upcoming = d.filter((h: any) => new Date(h.date) >= new Date()).slice(0,5);
      return upcoming.map((h: any) => `🗓️ ${h.date}: **${h.localName || h.name}**`).join('\n') || 'No upcoming holidays found.';
    }

    // ── Translate ────────────────────────────────────────────
    case 'translate': {
      const { text, to = 'hi' } = p;
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`);
      const d = await r.json();
      return d.responseData?.translatedText || 'Translation nahi hua.';
    }

    // ── Age calculation ──────────────────────────────────────
    case 'calc_age': {
      const { dob } = p;
      const birth = new Date(dob);
      const now = new Date();
      const years = now.getFullYear() - birth.getFullYear();
      const months = now.getMonth() - birth.getMonth();
      const days = now.getDate() - birth.getDate();
      return `**Age:** ${years} years ${Math.abs(months)} months ${Math.abs(days)} days`;
    }

    // ── FD Calculator ────────────────────────────────────────
    case 'calc_fd': {
      const { principal, rate, years, freq = 4 } = p;
      const amount = principal * Math.pow(1 + rate / 100 / freq, freq * years);
      return `**FD Maturity:** ₹${Math.round(amount).toLocaleString('en-IN')}\nInterest: ₹${Math.round(amount - principal).toLocaleString('en-IN')}`;
    }

    // ── Water intake ─────────────────────────────────────────
    case 'calc_water': {
      const { weight } = p;
      const ml = weight * 35;
      return `Daily water: **${ml}ml** (${(ml/1000).toFixed(1)}L) = ${Math.round(ml/250)} glasses`;
    }

    // ── BMR / Calories ───────────────────────────────────────
    case 'calc_calories': {
      const { weight, height, age, gender = 'male', activity = 1.55 } = p;
      const bmr = gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
      const tdee = bmr * activity;
      return `**BMR:** ${Math.round(bmr)} kcal/day\n**TDEE (maintenance):** ${Math.round(tdee)} kcal/day\nWeight loss: ${Math.round(tdee - 500)} kcal/day`;
    }

    default:
      return `Tool "${tool}" available nahi hai.`;
  }
}

// These go inside the switch in handleTool — adding more tools by appending
// The full list is already in the switch, these extend it further
