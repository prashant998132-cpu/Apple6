'use client';
import { useState, useEffect, useRef } from 'react';
import { uploadMedia, getLocalMediaMeta, deleteMedia, readMedia, searchMedia, getStorageStats, UploadedMedia } from '@/lib/storage';
import { puterVision } from '@/lib/puter';

type Tab = 'all' | 'image' | 'video' | 'audio' | 'generated';

export default function VaultPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [items, setItems] = useState<UploadedMedia[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [selected, setSelected] = useState<UploadedMedia | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({});
  const [tagging, setTagging] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'all', icon: '🗂️', label: 'All' },
    { id: 'image', icon: '🖼️', label: 'Photos' },
    { id: 'video', icon: '🎬', label: 'Videos' },
    { id: 'audio', icon: '🎵', label: 'Audio' },
    { id: 'generated', icon: '🎨', label: 'AI Gen' },
  ];

  const reload = () => {
    const meta = getLocalMediaMeta(tab === 'all' ? undefined : tab);
    const filtered = search ? searchMedia(search) : meta;
    setItems(filtered.reverse());
    setStats(getStorageStats());
  };

  useEffect(() => { reload(); }, [tab, search]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'doc';
    setUploading(true); setUploadPct(0);

    const result = await uploadMedia(file as any, type as any, (stage, pct) => {
      setUploadStage(stage); setUploadPct(pct);
    });

    if (result) {
      // Auto AI tag for images
      if (type === 'image') {
        setTagging(result.id);
        try {
          const blob = file;
          const tags = await puterVision(blob, 'List 5 comma-separated tags describing this image. Only tags, no other text.');
          if (tags) {
            const { addAITags } = await import('@/lib/storage');
            const tagList = tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5);
            await addAITags(result.id, tagList);
          }
        } catch {}
        setTagging(null);
      }
      reload();
    }
    setUploading(false); setUploadStage(''); setUploadPct(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const openPreview = async (item: UploadedMedia) => {
    setSelected(item);
    const url = await readMedia(item);
    setPreviewUrl(url);
  };

  const handleDelete = async (id: string) => {
    await deleteMedia(id);
    setSelected(null); setPreviewUrl(null);
    reload();
  };

  const formatSize = (b: number) => b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)}MB` : `${Math.round(b / 1000)}KB`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">🗄️ Media Vault</h1>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {stats.total || 0} files · {stats.totalSize ? formatSize(stats.totalSize) : '0KB'} · Puter Cloud
            </div>
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 rounded-xl text-sm font-medium">
            <span>+</span> Upload
          </button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name or AI tags…"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none mb-3" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {t.icon} {t.label}
              <span className="text-[10px] opacity-60">{stats.byType?.[t.id] || ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mx-4 mb-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <div className="flex justify-between text-xs text-blue-300 mb-2">
            <span>{uploadStage}</span><span>{uploadPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-5xl mb-3">📭</div>
            <div className="text-sm">{search ? 'Koi result nahi' : 'Koi file nahi — Upload karo!'}</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map(item => (
              <div key={item.id} onClick={() => openPreview(item)}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700/50 cursor-pointer hover:border-blue-500/50 transition-colors group">
                {item.thumb ? (
                  <img src={item.thumb} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {item.type === 'video' ? '🎬' : item.type === 'audio' ? '🎵' : item.type === 'generated' ? '🎨' : '📄'}
                  </div>
                )}
                {tagging === item.id && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-xs text-white text-center">🤖 AI tagging…</div>
                  </div>
                )}
                {item.aiTags?.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <div className="text-[8px] text-gray-300 truncate">{item.aiTags.slice(0, 3).join(', ')}</div>
                  </div>
                )}
                {item.puterPath && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px]">☁</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => { setSelected(null); setPreviewUrl(null); }}>
          <div className="flex items-center justify-between p-3 border-b border-gray-800" onClick={e => e.stopPropagation()}>
            <div>
              <div className="text-sm font-medium truncate max-w-[220px]">{selected.name}</div>
              <div className="text-[10px] text-gray-400">{formatSize(selected.size)} · {new Date(selected.ts).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              {previewUrl && (
                <a href={previewUrl} download={selected.name} className="px-3 py-1.5 bg-blue-600 rounded-xl text-xs" onClick={e => e.stopPropagation()}>↓ Save</a>
              )}
              <button onClick={e => { e.stopPropagation(); handleDelete(selected.id); }}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs">🗑️ Delete</button>
              <button onClick={() => { setSelected(null); setPreviewUrl(null); }} className="text-gray-400 px-2">✕</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {!previewUrl ? (
              <div className="text-gray-400 text-sm">Loading from cloud…</div>
            ) : selected.type === 'image' || selected.type === 'generated' ? (
              <img src={previewUrl} alt={selected.name} className="max-w-full max-h-full object-contain rounded-xl" />
            ) : selected.type === 'video' ? (
              <video src={previewUrl} controls className="max-w-full max-h-full rounded-xl" />
            ) : selected.type === 'audio' ? (
              <div className="text-center"><div className="text-6xl mb-4">🎵</div><audio src={previewUrl} controls /></div>
            ) : (
              <div className="text-center text-gray-400"><div className="text-6xl mb-4">📄</div><div className="text-sm">{selected.name}</div></div>
            )}
          </div>
          {selected.aiTags?.length > 0 && (
            <div className="px-4 pb-4 flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
              {selected.aiTags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf"
        onChange={e => handleUpload(e.target.files)} />
    </div>
  );
}
