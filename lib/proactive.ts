'use client';

// ══════════════════════════════════════════════════════════════
// PROACTIVE ENGINE — Auto briefing + contextual nudges
// ══════════════════════════════════════════════════════════════

export function startProactiveEngine(onMessage: (msg: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const run = async () => {
    const hour = new Date().getHours();
    const min  = new Date().getMinutes();
    const key  = `proactive_${new Date().toDateString()}`;
    const done: string[] = JSON.parse(localStorage.getItem(key) || '[]');

    const trigger = (id: string, msg: string) => {
      if (done.includes(id)) return;
      onMessage(msg);
      done.push(id);
      localStorage.setItem(key, JSON.stringify(done));
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    };

    if (hour === 8  && min < 10) trigger('morning', '🌅 **Good Morning Jons Bhai!** Aaj ka din badhiya rahega! `/weather` type karo ya Goals tab dekho 💪');
    if (hour === 13 && min < 10) trigger('lunch', '🍽️ **Lunch time ho gaya!** Kha lo Bhai — aur 2 glass paani bhi piyo 💧');
    if (hour === 20 && min < 10) trigger('evening', '🌙 **Shaam ho gayi Bhai.** Aaj ka kaam kaisa raha? Goals tab mein progress update karo! 🎯');
    if (hour >= 0  && hour < 4 && min < 10) trigger('midnight', `🦉 **Raat ke ${hour} baj gaye!** So jao Bhai — neend se hi brain recharge hota hai 😴`);
    if (min < 5 && hour % 2 === 0 && hour >= 8) trigger(`eye_${hour}`, '👁️ **20-20-20 Rule!** 2 ghante screen dekha — 20 seconds ke liye 20 feet door dekho');

    // Battery
    if ('getBattery' in navigator) {
      try {
        const bat: any = await (navigator as any).getBattery();
        if (bat.level < 0.2 && !bat.charging) trigger('batt', `🔋 **Battery ${Math.round(bat.level * 100)}%** — Charger lagao Bhai!`);
        bat.addEventListener('levelchange', () => {
          if (bat.level < 0.12 && !bat.charging) onMessage('⚡ **CRITICAL! Battery almost dead — abhi charger lagao!**');
        });
      } catch {}
    }

    // Streak celebration
    try {
      const prof = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      if (prof.streak >= 7 && hour === 9 && min < 10) trigger('streak', `🔥 **${prof.streak} day streak Bhai!** Consistency is 🔑`);
    } catch {}
  };

  run();
  const iv = setInterval(run, 5 * 60 * 1000);
  return () => clearInterval(iv);
}

// ── TTS speak helper ───────────────────────────────────────────
export function speakText(text: string, lang = 'hi-IN') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*`>\[\]()]/g, '').replace(/\n/g, '. ').slice(0, 300);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = lang; utt.rate = 0.95; utt.pitch = 1.05;
  // Try to find a Hindi voice
  const voices = window.speechSynthesis.getVoices();
  const hiVoice = voices.find(v => v.lang.includes('hi')) || voices.find(v => v.lang.includes('en-IN'));
  if (hiVoice) utt.voice = hiVoice;
  window.speechSynthesis.speak(utt);
}
