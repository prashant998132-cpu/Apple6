'use client';
import { useState } from 'react';

const MSP_DATA: Record<string, number> = {
  'Wheat / Gehu': 2275, 'Rice (Common)': 2300, 'Maize / Makka': 2090,
  'Soybean': 4892, 'Mustard / Sarson': 5950, 'Cotton': 7521,
  'Sugarcane / Ganna': 340, 'Gram / Chana': 5440, 'Groundnut': 6783, 'Masoor Dal': 6425,
};

export default function IndiaPage() {
  const [tab, setTab] = useState('mausam');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [mspCrop, setMspCrop] = useState('');
  const [trainQuery, setTrainQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const loadWeather = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'get_weather', params: {} }) });
      const d = await r.json();
      setResult(d.result);
    } catch { setResult('Mausam load nahi ho saka.'); }
    setLoading(false);
  };

  const loadCrypto = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'get_crypto', params: {} }) });
      const d = await r.json();
      setResult(d.result);
    } catch { setResult('Crypto prices load nahi ho saka.'); }
    setLoading(false);
  };

  const loadNews = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'get_news', params: {} }) });
      const d = await r.json();
      setResult(d.result);
    } catch { setResult('News load nahi ho saka.'); }
    setLoading(false);
  };

  const TABS = [
    { id: 'mausam', label: '🌤️ Mausam' },
    { id: 'kisan', label: '🌾 Kisan' },
    { id: 'news', label: '📰 News' },
    { id: 'finance', label: '💰 Finance' },
    { id: 'govt', label: '🏛️ Govt' },
  ];

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <h1 className="text-xl font-bold mb-4">🇮🇳 India Hub</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mausam */}
      {tab === 'mausam' && (
        <div className="space-y-3">
          <button onClick={loadWeather} disabled={loading} className="w-full py-3 bg-blue-600 disabled:bg-gray-700 rounded-xl text-sm font-medium">
            {loading ? 'Loading...' : '🌤️ GPS se Mausam Lo'}
          </button>
          {result && <pre className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 text-sm text-gray-200 whitespace-pre-wrap">{result}</pre>}
        </div>
      )}

      {/* Kisan */}
      {tab === 'kisan' && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-xs text-green-400">
            🌾 MSP 2024-25 — Government Minimum Support Prices
          </div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(MSP_DATA).map(([crop, rate]) => (
              <div key={crop} className="flex justify-between items-center bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                <div className="text-sm">{crop}</div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-400">₹{rate}/quintal</div>
                  <div className="text-xs text-gray-500">₹{(rate / 100).toFixed(2)}/10kg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      {tab === 'news' && (
        <div className="space-y-3">
          <button onClick={loadNews} disabled={loading} className="w-full py-3 bg-blue-600 disabled:bg-gray-700 rounded-xl text-sm font-medium">
            {loading ? 'Loading...' : '📰 India News Lo'}
          </button>
          {result && <pre className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 text-sm text-gray-200 whitespace-pre-wrap">{result}</pre>}
        </div>
      )}

      {/* Finance */}
      {tab === 'finance' && (
        <div className="space-y-3">
          <button onClick={loadCrypto} disabled={loading} className="w-full py-3 bg-blue-600 disabled:bg-gray-700 rounded-xl text-sm font-medium">
            {loading ? 'Loading...' : '₿ Crypto Prices'}
          </button>
          {result && <pre className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 text-sm text-gray-200 whitespace-pre-wrap">{result}</pre>}
          <div className="grid grid-cols-1 gap-2 mt-2">
            {[['EMI Calculator', 'EMI nikalo loan ka', '/'], ['SIP Returns', 'Investment growth', '/'], ['Gold Price', 'Aaj ki rate', '/']].map(([title, desc, href]) => (
              <a key={title} href={href} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 flex justify-between items-center">
                <div><div className="text-sm font-medium">{title}</div><div className="text-xs text-gray-400">{desc}</div></div>
                <span className="text-gray-400">→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Govt */}
      {tab === 'govt' && (
        <div className="space-y-2">
          {[
            ['🪪 Aadhaar Services', 'uidai.gov.in', 'https://uidai.gov.in'],
            ['📋 PAN Card', 'incometax.gov.in', 'https://www.incometax.gov.in'],
            ['🗳️ Voter ID', 'voters.eci.gov.in', 'https://voters.eci.gov.in'],
            ['🚗 Driving License', 'parivahan.gov.in', 'https://parivahan.gov.in'],
            ['🏥 Ayushman Bharat', 'pmjay.gov.in', 'https://pmjay.gov.in'],
            ['👨‍🌾 PM Kisan', 'pmkisan.gov.in', 'https://pmkisan.gov.in'],
            ['🎓 DigiLocker', 'digilocker.gov.in', 'https://digilocker.gov.in'],
            ['📮 Post Tracker', 'indiapost.gov.in', 'https://www.indiapost.gov.in'],
          ].map(([title, desc, url]) => (
            <a key={title} href={url} target="_blank" rel="noopener" className="flex justify-between items-center bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
              <div><div className="text-sm font-medium">{title}</div><div className="text-xs text-gray-400">{desc}</div></div>
              <span className="text-blue-400 text-xs">↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
