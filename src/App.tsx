import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Loader2,
  Move,
  Palette,
  RotateCcw,
  Sparkles,
  Type,
  Upload,
  User,
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CTA_GOALS } from './types';
import type {
  BrandInfo,
  CardTheme,
  CropFocus,
  CtaGoal,
  ExportFormat,

  FontStyle,
  GeneratedContent,
  LayoutMode,
  SlideData,
} from './types';
import {
  FONT_STYLES,
  THEME_CONFIGS,
  loadImage,
  renderSlideToCanvas,
} from './canvasRenderer';
import { DEFAULT_DEMO_CONTENT, generateCarouselContent } from './geminiService';

const DEFAULT_PREVIEW_IMAGES = [
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=1400&q=80',
];

const LAYOUT_OPTIONS: { id: LayoutMode; label: string; desc: string }[] = [
  { id: 'bottom-banner', label: '底部沉浸條', desc: '照片露出最多' },
  { id: 'corner-tag', label: '左下角落', desc: '極簡不擋主體' },
  { id: 'compact-card', label: '下浮毛玻璃卡', desc: '低高度卡片' },
  { id: 'center-card', label: '置中毛玻璃卡', desc: '資訊量較大' },
];

const BRAND_STORAGE_KEY = 'ig_brand_info';

function loadStoredBrand(): BrandInfo {
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY);
    if (raw) return { name: '', handle: '', logo: '', ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { name: '', handle: '', logo: '' };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- 小元件 ---------- */

function LayoutThumb({ mode }: { mode: LayoutMode }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800">
      <div className="absolute left-[22%] top-[14%] h-[34%] w-[26%] rounded-full bg-white/25" />
      {mode === 'bottom-banner' && (
        <div className="absolute inset-x-0 bottom-0 flex h-[46%] flex-col justify-end gap-[3px] bg-gradient-to-t from-black/85 to-transparent p-[7px]">
          <span className="h-[4px] w-3/5 rounded bg-white/90" />
          <span className="h-[3px] w-4/5 rounded bg-white/50" />
        </div>
      )}
      {mode === 'corner-tag' && (
        <div className="absolute bottom-[8px] left-[8px] flex gap-[4px]">
          <span className="h-[26px] w-[3px] rounded bg-sky-300" />
          <span className="flex flex-col justify-center gap-[3px]">
            <span className="h-[4px] w-9 rounded bg-white/90" />
            <span className="h-[3px] w-7 rounded bg-white/50" />
          </span>
        </div>
      )}
      {mode === 'compact-card' && (
        <div className="absolute inset-x-[6px] bottom-[6px] flex h-[36%] flex-col justify-center gap-[3px] rounded-md border border-white/40 bg-white/25 px-[7px] backdrop-blur-sm">
          <span className="h-[4px] w-3/5 rounded bg-white/90" />
          <span className="h-[3px] w-4/5 rounded bg-white/55" />
        </div>
      )}
      {mode === 'center-card' && (
        <div className="absolute inset-x-[6px] bottom-[18%] top-[42%] flex flex-col justify-center gap-[3px] rounded-md border border-white/40 bg-white/25 px-[7px] backdrop-blur-sm">
          <span className="h-[4px] w-3/5 rounded bg-white/90" />
          <span className="h-[3px] w-4/5 rounded bg-white/55" />
          <span className="h-[3px] w-2/3 rounded bg-white/55" />
        </div>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  icon,
  hint,
  children,
}: {
  n: number;
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20">
          {n}
        </span>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
          {icon}
          {title}
        </h2>
        {hint && <span className="ml-auto text-[11px] text-slate-400">{hint}</span>}
      </header>
      {children}
    </section>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-fuchsia-400/70 focus:ring-2 focus:ring-fuchsia-500/20';

/* ---------- 主程式 ---------- */

export function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [topic, setTopic] = useState('零基礎空中瑜伽體態雕塑入門');
  const [audience, setAudience] = useState('久坐上班族、初次接觸空瑜的學員、運動新手');
  const [keyTakeaways, setKeyTakeaways] = useState('克服懸空恐懼、核心借力不手酸、優雅舒展肩頸');
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>('keyword');
  const [ctaDetail, setCtaDetail] = useState('');

  const [images, setImages] = useState<string[]>(DEFAULT_PREVIEW_IMAGES);
  const [focuses, setFocuses] = useState<CropFocus[]>(() =>
    Array.from({ length: 4 }, () => ({ x: 0.5, y: 0.5 }))
  );
  const [imgRatios, setImgRatios] = useState<number[]>([1, 1, 1, 1]);

  const [content, setContent] = useState<GeneratedContent>(DEFAULT_DEMO_CONTENT);
  const [theme, setTheme] = useState<CardTheme>('dark-glass');
  const [layout, setLayout] = useState<LayoutMode>('bottom-banner');
  const [fontStyle, setFontStyle] = useState<FontStyle>('modern');
  const [brand, setBrand] = useState<BrandInfo>(loadStoredBrand);

  const [activeSlide, setActiveSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [thumbs, setThumbs] = useState<string[]>(['', '', '', '']);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null]);
  const renderToken = useRef(0);
  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);

  /* 持久化 */
  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);
  useEffect(() => {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
  }, [brand]);

  /* 讀取圖片比例（供拖曳構圖計算） */
  useEffect(() => {
    let cancelled = false;
    Promise.all(images.map((src) => loadImage(src).then((i) => i.width / i.height)))
      .then((r) => {
        if (!cancelled) setImgRatios(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [images]);

  /* 重新渲染 4 張圖（防抖 + 取消過期任務） */
  const redraw = useCallback(async () => {
    const token = ++renderToken.current;
    setIsRendering(true);
    const small = document.createElement('canvas');
    small.width = 260;
    small.height = 260;
    const sctx = small.getContext('2d');
    const nextThumbs: string[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        const canvas = canvasRefs.current[i];
        if (!canvas) {
          nextThumbs.push('');
          continue;
        }
        await renderSlideToCanvas(canvas, images[i], content.slides[i], {
          theme,
          layout,
          fontStyle,
          pageIndex: i,
          totalPages: 4,
          focus: focuses[i],
          brand,
        });
        if (token !== renderToken.current) return;
        if (sctx) {
          sctx.clearRect(0, 0, 260, 260);
          sctx.drawImage(canvas, 0, 0, 260, 260);
          nextThumbs.push(small.toDataURL('image/jpeg', 0.82));
        } else {
          nextThumbs.push('');
        }
      }
      if (token === renderToken.current) setThumbs(nextThumbs);
    } catch (err) {
      console.error('渲染失敗', err);
    } finally {
      if (token === renderToken.current) setIsRendering(false);
    }
  }, [images, content, theme, layout, fontStyle, focuses, brand]);

  useEffect(() => {
    const t = setTimeout(redraw, 120);
    return () => clearTimeout(t);
  }, [redraw]);

  /* 圖片上傳 */
  const readFile = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

  const handleReplaceImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFile(file);
    setImages((prev) => prev.map((v, i) => (i === index ? url : v)));
    setFocuses((prev) => prev.map((v, i) => (i === index ? { x: 0.5, y: 0.5 } : v)));
    e.target.value = '';
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (files.length === 0) return;
    const urls = await Promise.all(files.map(readFile));
    setImages((prev) => prev.map((v, i) => (urls[i] ? urls[i] : v)));
    setFocuses((prev) => prev.map((v, i) => (urls[i] ? { x: 0.5, y: 0.5 } : v)));
    e.target.value = '';
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFile(file);
    setBrand((b) => ({ ...b, logo: url }));
    e.target.value = '';
  };

  /* 拖曳調整構圖 */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = focuses[activeSlide];
    dragRef.current = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = imgRatios[activeSlide] || 1;
    let nx = d.fx;
    let ny = d.fy;
    if (ratio > 1) nx = clamp01(d.fx - (e.clientX - d.x) / (rect.width * (ratio - 1)));
    else if (ratio < 1) ny = clamp01(d.fy - (e.clientY - d.y) / (rect.height * (1 / ratio - 1)));
    setFocuses((prev) => prev.map((v, i) => (i === activeSlide ? { x: nx, y: ny } : v)));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const canDrag = Math.abs((imgRatios[activeSlide] || 1) - 1) > 0.01;

  /* AI 產生 */
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMsg('請輸入課程主題');
      return;
    }
    if (!apiKey.trim()) {
      setErrorMsg('請先填寫 Google Gemini API Key，或直接使用預設範例內容進行排版。');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const result = await generateCarouselContent(
        apiKey,
        topic,
        audience,
        keyTakeaways,
        ctaGoal,
        ctaDetail
      );
      setContent(result);
      setActiveSlide(0);

    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : '生成失敗，請檢查 API Key 或網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestKey = async () => {
    setErrorMsg(null);
    if (!apiKey.trim()) {
      setErrorMsg('請先輸入 API Key');
      return;
    }
    setStatusMsg('正在檢測 API Key…');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
      );
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(null);
        setErrorMsg(`檢測失敗：${data.error?.message || res.statusText}`);
      } else {
        const names = (data.models || [])
          .map((m: { name: string }) => m.name.replace('models/', ''))
          .slice(0, 5)
          .join(', ');
        setStatusMsg(`檢測成功！可用模型：${names}`);
      }
    } catch (err) {
      setStatusMsg(null);
      setErrorMsg(`連線錯誤：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  /* 文案複製 / 匯出 */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) =>
      canvas.toBlob(
        (b) => resolve(b),
        format === 'png' ? 'image/png' : 'image/jpeg',
        0.95
      )
    );

  const handleDownloadAll = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < 4; i++) {
        const canvas = canvasRefs.current[i];
        if (!canvas) continue;
        const blob = await canvasToBlob(canvas);
        if (blob) zip.file(`IG-Carousel-0${i + 1}.${format}`, blob);
      }
      zip.file('IG-Caption.txt', content.caption);
      const out = await zip.generateAsync({ type: 'blob' });
      saveAs(out, `IG-Carousel-${Date.now()}.zip`);
    } catch (err) {
      console.error(err);
      alert('下載失敗，請稍後再試');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSingle = async () => {
    const canvas = canvasRefs.current[activeSlide];
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (blob) saveAs(blob, `IG-Slide-0${activeSlide + 1}.${format}`);
  };

  /* 文字微調 */
  const updateSlide = (index: number, patch: Partial<SlideData>) => {
    setContent((prev) => {
      const slides = prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, slides: slides as GeneratedContent['slides'] };
    });
  };

  const slide = content.slides[activeSlide];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080a12] text-slate-100">
      {/* 背景光暈 */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="absolute -right-32 top-1/3 h-[480px] w-[480px] rounded-full bg-indigo-600/20 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[130px]" />
      </div>

      {/* 頂部列 */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080a12]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-rose-500/25">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white">IG 圖文輪播產生器</h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                1:1 自動裁切 · 1080×1080 高解析 · AI 文案一次完成
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 p-1 sm:flex">
              {(['png', 'jpg'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                    format === f ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={handleDownloadAll}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-600/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? '打包中…' : '下載 4 張圖 + 文案'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 gap-7 px-5 py-7 lg:grid-cols-12">
        {/* ============ 左側：設定 ============ */}
        <div className="space-y-5 lg:col-span-5">
          {/* 1 照片 */}
          <Step n={1} title="上傳 4 張課程照片" icon={<ImageIcon className="h-4 w-4 text-emerald-300" />} hint="自動裁切成 1:1">
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <label
                  key={idx}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/40 ring-offset-2 ring-offset-[#080a12] transition hover:ring-2 hover:ring-fuchsia-400/60"
                >
                  <img src={img} alt={`第 ${idx + 1} 張`} className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                    0{idx + 1}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    點擊換圖
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReplaceImage(idx, e)} />
                </label>
              ))}
            </div>
            <label className="mt-3.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400/40 bg-emerald-400/5 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/10">
              <Upload className="h-4 w-4" />
              一次選取 4 張照片
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleBatchUpload} />
            </label>
          </Step>

          {/* 2 課程資訊 + AI */}
          <Step n={2} title="課程資訊與 AI 文案" icon={<Sparkles className="h-4 w-4 text-fuchsia-300" />}>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  課程主題 <span className="text-rose-400">*</span>
                </label>
                <input className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如：零基礎空中瑜伽入門" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">目標學員</label>
                <input className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="例如：久坐上班族、運動新手" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">重點亮點 / 痛點（選填）</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={keyTakeaways} onChange={(e) => setKeyTakeaways(e.target.value)} />
              </div>

              {/* CTA 行動呼籲目標 */}
              <div>
                <label className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                    CTA 行動呼籲目標
                  </span>
                  <span className="text-[11px] font-normal text-fuchsia-300">決定第 4 張圖與貼文結尾</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CTA_GOALS.map((g) => {
                    const isSelected = ctaGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setCtaGoal(g.id)}
                        className={`rounded-xl border p-2 text-center transition ${
                          isSelected
                            ? 'border-fuchsia-400 bg-fuchsia-400/15 shadow-md shadow-fuchsia-500/10'
                            : 'border-white/10 bg-black/20 hover:border-white/25'
                        }`}
                      >
                        <p className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {g.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{g.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5">
                  <input
                    className={`${inputCls} text-xs`}
                    value={ctaDetail}
                    onChange={(e) => setCtaDetail(e.target.value)}
                    placeholder={
                      CTA_GOALS.find((g) => g.id === ctaGoal)?.detailPlaceholder ||
                      '補充細節（例如關鍵字、限額、優惠）'
                    }
                  />
                </div>
              </div>


              <details className="group rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-300">
                  <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                  通行密碼 / API Key 設定
                  <span className="ml-auto text-[11px] font-normal text-slate-500">
                    {apiKey ? '已輸入' : 'Vercel 託管免填 Key'}
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      className={`${inputCls} font-mono`}
                      placeholder="輸入自訂通行密碼，或貼上個人 API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value.trim())}
                    />
                    <button
                      type="button"
                      onClick={handleTestKey}
                      className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
                    >
                      測試
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    💡 <strong>Vercel 部署模式</strong>：在後台設定好 <code className="text-amber-300">GEMINI_API_KEY</code> 後，手機或電腦打開<strong>完全免輸入 Key</strong>！若有設定通行密碼，請於上方輸入通行密碼。
                  </p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-fuchsia-300 hover:text-fuchsia-200"
                  >
                    或免費取得個人 Key (AI Studio) <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </details>


              {statusMsg && (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{statusMsg}</div>
              )}
              {errorMsg && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">{errorMsg}</div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? 'AI 構思中…' : 'AI 一鍵產生圖文與貼文'}
              </button>
            </div>
          </Step>

          {/* 3 風格 */}
          <Step n={3} title="版面與字體風格" icon={<Palette className="h-4 w-4 text-sky-300" />}>
            <div className="space-y-5">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers className="h-3.5 w-3.5 text-sky-300" />
                  排版（皆不遮擋主體）
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {LAYOUT_OPTIONS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id)}
                      className={`rounded-xl border p-1.5 text-left transition ${
                        layout === l.id
                          ? 'border-fuchsia-400 bg-fuchsia-400/10 shadow-lg shadow-fuchsia-500/10'
                          : 'border-white/10 bg-black/20 hover:border-white/25'
                      }`}
                    >
                      <LayoutThumb mode={l.id} />
                      <p className="mt-1.5 px-0.5 text-[11px] font-bold leading-tight text-slate-100">{l.label}</p>
                      <p className="px-0.5 text-[10px] leading-tight text-slate-500">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Type className="h-3.5 w-3.5 text-sky-300" />
                  字體
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(FONT_STYLES) as FontStyle[]).map((k) => {
                    const f = FONT_STYLES[k];
                    return (
                      <button
                        key={k}
                        onClick={() => setFontStyle(k)}
                        className={`rounded-xl border px-2 py-3 text-center transition ${
                          fontStyle === k
                            ? 'border-fuchsia-400 bg-fuchsia-400/10'
                            : 'border-white/10 bg-black/20 hover:border-white/25'
                        }`}
                      >
                        <p className="text-2xl font-black leading-none text-white" style={{ fontFamily: f.cssFamily }}>
                          空瑜
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-slate-100">{f.name}</p>
                        <p className="text-[10px] text-slate-500">{f.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Palette className="h-3.5 w-3.5 text-sky-300" />
                  配色
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(THEME_CONFIGS) as CardTheme[]).map((k) => {
                    const t = THEME_CONFIGS[k];
                    return (
                      <button
                        key={k}
                        onClick={() => setTheme(k)}
                        className={`rounded-xl border px-2 py-2.5 transition ${
                          theme === k
                            ? 'border-fuchsia-400 bg-fuchsia-400/10'
                            : 'border-white/10 bg-black/20 hover:border-white/25'
                        }`}
                      >
                        <div className="mx-auto flex h-7 w-12 overflow-hidden rounded-full border border-white/20">
                          <span className="h-full w-1/2" style={{ background: t.swatch[0] }} />
                          <span className="h-full w-1/2" style={{ background: t.swatch[1] }} />
                        </div>
                        <p className="mt-1.5 text-center text-[11px] font-semibold text-slate-200">{t.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Step>

          {/* 4 品牌 */}
          <Step n={4} title="品牌資訊（選填）" icon={<User className="h-4 w-4 text-amber-300" />} hint="顯示於圖片左上角">
            <div className="flex items-start gap-3">
              <label className="relative flex h-[84px] w-[84px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black/30 text-center text-[11px] text-slate-400 transition hover:border-amber-300/60">
                {brand.logo ? (
                  <img src={brand.logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-1 leading-tight">上傳<br />Logo</span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              <div className="min-w-0 flex-1 space-y-2.5">
                <input className={inputCls} placeholder="講師 / 品牌名稱" value={brand.name} onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))} />
                <input className={inputCls} placeholder="@instagram_id" value={brand.handle} onChange={(e) => setBrand((b) => ({ ...b, handle: e.target.value }))} />
              </div>
            </div>
            {(brand.logo || brand.name || brand.handle) && (
              <button
                onClick={() => setBrand({ name: '', handle: '', logo: '' })}
                className="mt-3 flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-rose-300"
              >
                <RotateCcw className="h-3 w-3" />
                清除品牌資訊
              </button>
            )}
          </Step>

          {/* 5 微調文字 */}
          <Step n={5} title={`微調第 ${activeSlide + 1} 張文字`} icon={<FileText className="h-4 w-4 text-indigo-300" />}>
            <div className="mb-3 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                    activeSlide === i ? 'bg-white text-slate-900' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="space-y-2.5">
              <input className={inputCls} placeholder="標籤" value={slide.tag} onChange={(e) => updateSlide(activeSlide, { tag: e.target.value })} />
              <textarea rows={2} className={`${inputCls} resize-none`} placeholder="主標題（可換行）" value={slide.title} onChange={(e) => updateSlide(activeSlide, { title: e.target.value })} />
              <input className={inputCls} placeholder="副標題" value={slide.subtitle ?? ''} onChange={(e) => updateSlide(activeSlide, { subtitle: e.target.value })} />
              {slide.bulletPoints && (
                <textarea
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="重點（每行一點）"
                  value={slide.bulletPoints.join('\n')}
                  onChange={(e) => updateSlide(activeSlide, { bulletPoints: e.target.value.split('\n').filter((l) => l.trim() !== '') })}
                />
              )}
              {activeSlide === 3 && (
                <input className={inputCls} placeholder="行動按鈕文字" value={slide.ctaButton ?? ''} onChange={(e) => updateSlide(activeSlide, { ctaButton: e.target.value })} />
              )}
              <input className={inputCls} placeholder="註腳（沒有按鈕時顯示）" value={slide.footnote ?? ''} onChange={(e) => updateSlide(activeSlide, { footnote: e.target.value })} />
            </div>
          </Step>
        </div>

        {/* ============ 右側：預覽 ============ */}
        <div className="space-y-5 lg:col-span-7">
          <div className="lg:sticky lg:top-[88px]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-white">第 0{activeSlide + 1} 張預覽</h2>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">1080 × 1080</span>
                  {isRendering && <Loader2 className="h-3.5 w-3.5 animate-spin text-fuchsia-300" />}
                </div>
                <button
                  onClick={handleDownloadSingle}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
                >
                  <Download className="h-3.5 w-3.5" />
                  下載此張
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`relative aspect-square w-full max-w-[580px] touch-none select-none overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl shadow-black/60 ${
                    canDrag ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <canvas
                      key={i}
                      ref={(el) => {
                        canvasRefs.current[i] = el;
                      }}
                      width={1080}
                      height={1080}
                      className={`h-full w-full ${i === activeSlide ? 'block' : 'hidden'}`}
                    />
                  ))}
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setActiveSlide((p) => (p + 3) % 4)}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                    aria-label="上一張"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setActiveSlide((p) => (p + 1) % 4)}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                    aria-label="下一張"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-3 flex h-6 items-center gap-3 text-[11px] text-slate-400">
                  {canDrag ? (
                    <>
                      <span className="flex items-center gap-1">
                        <Move className="h-3.5 w-3.5" />
                        拖曳預覽圖可調整構圖
                      </span>
                      <button
                        onClick={() => setFocuses((prev) => prev.map((v, i) => (i === activeSlide ? { x: 0.5, y: 0.5 } : v)))}
                        className="flex items-center gap-1 text-slate-300 transition hover:text-white"
                      >
                        <RotateCcw className="h-3 w-3" />
                        置中
                      </button>
                    </>
                  ) : (
                    <span>此照片已是正方形，無需調整構圖</span>
                  )}
                </div>

                {/* 輪播縮圖 */}
                <div className="mt-2 grid w-full max-w-[580px] grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`relative aspect-square overflow-hidden rounded-2xl border-2 bg-black/40 transition ${
                        activeSlide === i
                          ? 'border-fuchsia-400 shadow-lg shadow-fuchsia-500/25'
                          : 'border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {thumbs[i] ? (
                        <img src={thumbs[i]} alt={`第 ${i + 1} 張縮圖`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 貼文文案 */}
            <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                  <FileText className="h-4 w-4 text-indigo-300" />
                  Instagram 貼文文案
                </h2>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    copied
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                      : 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已複製' : '一鍵複製'}
                </button>
              </div>
              <textarea
                rows={10}
                value={content.caption}
                onChange={(e) => setContent((prev) => ({ ...prev, caption: e.target.value }))}
                className="w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-slate-200 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
