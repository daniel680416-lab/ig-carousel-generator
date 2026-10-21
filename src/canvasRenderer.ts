import type {
  BrandInfo,
  CardTheme,
  CropFocus,
  FontStyle,
  LayoutMode,
  SlideData,
} from './types';

/* ============================================================
   常數與設定
============================================================ */
const SIZE = 1080; // 輸出邊長（IG 標準）
const SS = 2; // 內部超採樣倍率：先以 2160 繪製再縮小到 1080

const FONT_FALLBACK =
  '"PingFang TC", "Microsoft JhengHei", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export const FONT_STYLES: Record<
  FontStyle,
  {
    name: string;
    desc: string;
    cssFamily: string; // 供介面預覽
    heading: string;
    body: string;
    headingWeight: number;
    bodyWeight: number;
    /** 標題額外描邊（用於只有單一字重的字體，模擬粗體） */
    headingStroke: number;
  }
> = {
  modern: {
    name: '現代俐落',
    desc: '黑體 · 清晰有力',
    cssFamily: '"Noto Sans TC", sans-serif',
    heading: '"Noto Sans TC"',
    body: '"Noto Sans TC"',
    headingWeight: 900,
    bodyWeight: 500,
    headingStroke: 0,
  },
  warm: {
    name: '溫柔手感',
    desc: '粉圓體 · 親切柔和',
    cssFamily: '"Huninn", sans-serif',
    heading: '"Huninn"',
    body: '"Huninn"',
    headingWeight: 400,
    bodyWeight: 400,
    headingStroke: 1.6,
  },
  elegant: {
    name: '質感文青',
    desc: '宋體標題 · 雜誌感',
    cssFamily: '"Noto Serif TC", serif',
    heading: '"Noto Serif TC"',
    body: '"Noto Sans TC"',
    headingWeight: 900,
    bodyWeight: 500,
    headingStroke: 0,
  },
};

interface Palette {
  cardFill: string;
  cardStroke: string;
  title: string;
  sub: string;
  bullet: string;
  tagBg: string;
  tagText: string;
  accent: string;
  accentText: string;
  muted: string;
  gradientCta: boolean;
  textShadow: boolean;
}

interface ThemeConfig {
  name: string;
  swatch: [string, string];
  card: Palette; // 用於卡片版型
  photo: Palette; // 直接壓在照片（漸層條 / 角落）時使用
}

function photoPalette(accent: string, accentText: string, gradientCta = false): Palette {
  return {
    cardFill: 'transparent',
    cardStroke: 'transparent',
    title: '#ffffff',
    sub: 'rgba(255,255,255,0.88)',
    bullet: '#f8fafc',
    tagBg: 'rgba(255,255,255,0.16)',
    tagText: accent,
    accent,
    accentText,
    muted: 'rgba(255,255,255,0.72)',
    gradientCta,
    textShadow: true,
  };
}

export const THEME_CONFIGS: Record<CardTheme, ThemeConfig> = {
  'dark-glass': {
    name: '深色玻璃',
    swatch: ['#0f172a', '#7dd3fc'],
    card: {
      cardFill: 'rgba(12, 18, 34, 0.62)',
      cardStroke: 'rgba(255,255,255,0.28)',
      title: '#ffffff',
      sub: 'rgba(226,232,240,0.92)',
      bullet: '#f1f5f9',
      tagBg: 'rgba(125,211,252,0.18)',
      tagText: '#7dd3fc',
      accent: '#38bdf8',
      accentText: '#06223a',
      muted: 'rgba(203,213,225,0.8)',
      gradientCta: false,
      textShadow: false,
    },
    photo: photoPalette('#7dd3fc', '#06223a'),
  },
  'light-glass': {
    name: '白色玻璃',
    swatch: ['#ffffff', '#0ea5e9'],
    card: {
      cardFill: 'rgba(255, 255, 255, 0.72)',
      cardStroke: 'rgba(255,255,255,0.9)',
      title: '#0b1220',
      sub: '#334155',
      bullet: '#1e293b',
      tagBg: 'rgba(14,165,233,0.14)',
      tagText: '#0369a1',
      accent: '#0284c7',
      accentText: '#ffffff',
      muted: '#64748b',
      gradientCta: false,
      textShadow: false,
    },
    photo: photoPalette('#7dd3fc', '#06223a'),
  },
  'amber-warm': {
    name: '暖陽琥珀',
    swatch: ['#fff4e0', '#f59e0b'],
    card: {
      cardFill: 'rgba(255, 246, 230, 0.76)',
      cardStroke: 'rgba(245,158,11,0.45)',
      title: '#3f1d06',
      sub: '#7c3a0c',
      bullet: '#4a2208',
      tagBg: 'rgba(245,158,11,0.2)',
      tagText: '#9a4a06',
      accent: '#d97706',
      accentText: '#ffffff',
      muted: '#9a6a3a',
      gradientCta: false,
      textShadow: false,
    },
    photo: photoPalette('#fbbf24', '#3f1d06'),
  },
  'cyber-neon': {
    name: '霓虹紫夜',
    swatch: ['#12081f', '#c084fc'],
    card: {
      cardFill: 'rgba(14, 8, 28, 0.66)',
      cardStroke: 'rgba(192,132,252,0.55)',
      title: '#faf5ff',
      sub: 'rgba(233,213,255,0.92)',
      bullet: '#f5f3ff',
      tagBg: 'rgba(192,132,252,0.22)',
      tagText: '#d8b4fe',
      accent: '#a855f7',
      accentText: '#ffffff',
      muted: 'rgba(216,180,254,0.8)',
      gradientCta: true,
      textShadow: false,
    },
    photo: photoPalette('#d8b4fe', '#2e1065', true),
  },
};

export interface RenderOptions {
  theme: CardTheme;
  layout: LayoutMode;
  fontStyle: FontStyle;
  pageIndex: number;
  totalPages: number;
  focus?: CropFocus;
  brand?: BrandInfo;
}

/* ============================================================
   影像與字體載入
============================================================ */
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(src);
        reject(new Error('圖片載入失敗'));
      };
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

function fontString(weight: number, size: number, family: string): string {
  return `${weight} ${size}px ${family}, ${FONT_FALLBACK}`;
}

/** 確保繪圖所需字體（含實際用到的中文字）已載入，避免輸出變成預設字體 */
async function ensureFonts(fontStyle: FontStyle, text: string): Promise<void> {
  const f = FONT_STYLES[fontStyle];
  try {
    const loads = [
      document.fonts.load(fontString(f.headingWeight, 40, f.heading), text),
      document.fonts.load(fontString(f.bodyWeight, 28, f.body), text),
      document.fonts.load(fontString(700, 28, f.body), text),
    ];
    await Promise.race([
      Promise.all(loads),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    /* 字體載入失敗時退回備用字體 */
  }
}

/* ============================================================
   文字工具
============================================================ */
const NO_LINE_START = '，。、；：！？）」』】》〉,.!?:;)]}…~—';
const NO_LINE_END = '（「『【《〈([{';

function tokenize(text: string): string[] {
  return Array.from(text.matchAll(/[A-Za-z0-9@._'\-]+|[\s\S]/gu), (m) => m[0]);
}

/** 自動斷行（英文單字不拆、標點不落行首） */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (para === '') {
      lines.push('');
      continue;
    }
    let current = '';
    for (const token of tokenize(para)) {
      const test = current + token;
      if (current !== '' && ctx.measureText(test).width > maxWidth) {
        if (token.length === 1 && NO_LINE_START.includes(token)) {
          current = test; // 標點允許微幅溢出，避免落在行首
          continue;
        }
        const last = current[current.length - 1];
        if (last && NO_LINE_END.includes(last)) {
          lines.push(current.slice(0, -1));
          current = last + token;
        } else {
          lines.push(current);
          current = token.trimStart();
        }
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** 在最大行數內自動縮小字級；仍超過時加上刪節號 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  font: (size: number) => string
): { size: number; lines: string[] } {
  for (let s = startSize; s >= minSize; s -= 2) {
    ctx.font = font(s);
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size: s, lines };
  }
  ctx.font = font(minSize);
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  if (lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = last + '…';
  }
  return { size: minSize, lines };
}

/* ============================================================
   繪圖元件
============================================================ */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  focus: CropFocus,
  size: number
) {
  const ratio = img.width / img.height;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ratio > 1) {
    sw = img.height;
    sx = (img.width - sw) * clamp01(focus.x);
  } else if (ratio < 1) {
    sh = img.width;
    sy = (img.height - sh) * clamp01(focus.y);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** 毛玻璃卡片：裁切區域內重繪模糊底圖，再疊半透明色與細邊框 */
function drawFrostedCard(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  focus: CropFocus,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  p: Palette
) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.32)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  if ('filter' in ctx) {
    ctx.filter = 'blur(26px) saturate(1.25)';
    ctx.save();
    ctx.translate(0, 0);
    drawCover(ctx, img, focus, SIZE);
    ctx.restore();
    ctx.filter = 'none';
  }
  ctx.fillStyle = p.cardFill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = p.cardStroke;
  ctx.stroke();
  ctx.restore();
}

interface ContentStyle {
  fontStyle: FontStyle;
  palette: Palette;
  scale: number;
  showSubtitleWithBullets: boolean;
}

/**
 * 繪製（或僅量測）文字內容區塊。
 * draw=false 時只回傳高度，用於讓卡片 / 漸層條自動貼合內容。
 */
function drawContent(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  x: number,
  top: number,
  w: number,
  st: ContentStyle,
  draw: boolean
): number {
  const f = FONT_STYLES[st.fontStyle];
  const p = st.palette;
  const s = st.scale;
  let y = top;

  const shadowOn = () => {
    if (draw && p.textShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 2;
    }
  };
  const shadowOff = () => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  };

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // 1. 標籤
  if (slide.tag) {
    const th = Math.round(42 * s);
    ctx.font = fontString(700, Math.round(22 * s), f.body);
    const tw = ctx.measureText(slide.tag).width + 32 * s;
    if (draw) {
      ctx.beginPath();
      ctx.roundRect(x, y, tw, th, th / 2);
      ctx.fillStyle = p.tagBg;
      ctx.fill();
      ctx.fillStyle = p.tagText;
      ctx.fillText(slide.tag, x + 16 * s, y + th / 2 + 1);
    }
    y += th + 24 * s;
  }

  // 2. 主標題
  {
    const fit = fitText(
      ctx,
      slide.title,
      w,
      3,
      Math.round(66 * s),
      Math.round(42 * s),
      (size) => fontString(f.headingWeight, size, f.heading)
    );
    const lh = fit.size * 1.26;
    ctx.font = fontString(f.headingWeight, fit.size, f.heading);
    ctx.textBaseline = 'alphabetic';
    for (const line of fit.lines) {
      if (draw) {
        shadowOn();
        ctx.fillStyle = p.title;
        if (f.headingStroke > 0) {
          ctx.lineJoin = 'round';
          ctx.lineWidth = f.headingStroke;
          ctx.strokeStyle = p.title;
          ctx.strokeText(line, x, y + fit.size);
        }
        ctx.fillText(line, x, y + fit.size);
        shadowOff();
      }
      y += lh;
    }
    ctx.textBaseline = 'middle';
    y += 10 * s;
  }

  const hasBullets = !!slide.bulletPoints && slide.bulletPoints.length > 0;

  // 3. 副標題
  if (slide.subtitle && (!hasBullets || st.showSubtitleWithBullets)) {
    const fit = fitText(
      ctx,
      slide.subtitle,
      w,
      2,
      Math.round(30 * s),
      Math.round(22 * s),
      (size) => fontString(f.bodyWeight, size, f.body)
    );
    const lh = fit.size * 1.5;
    ctx.font = fontString(f.bodyWeight, fit.size, f.body);
    for (const line of fit.lines) {
      if (draw) {
        shadowOn();
        ctx.fillStyle = p.sub;
        ctx.fillText(line, x, y + lh / 2);
        shadowOff();
      }
      y += lh;
    }
    y += 12 * s;
  }

  // 4. 條列要點（編號圓點）
  if (hasBullets) {
    const d = Math.round(40 * s);
    const gap = Math.round(18 * s);
    const textX = x + d + gap;
    const bw = w - d - gap;
    slide.bulletPoints!.slice(0, 4).forEach((point, i) => {
      const fit = fitText(
        ctx,
        point,
        bw,
        2,
        Math.round(30 * s),
        Math.round(24 * s),
        (size) => fontString(700, size, f.body)
      );
      const lh = fit.size * 1.4;
      const rowH = Math.max(d, fit.lines.length * lh);
      if (draw) {
        ctx.beginPath();
        ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.accent;
        ctx.fill();
        ctx.font = fontString(900, Math.round(22 * s), f.body);
        ctx.textAlign = 'center';
        ctx.fillStyle = p.accentText;
        ctx.fillText(String(i + 1), x + d / 2, y + d / 2 + 1);
        ctx.textAlign = 'left';
        ctx.font = fontString(700, fit.size, f.body);
        shadowOn();
        ctx.fillStyle = p.bullet;
        const startY = y + (rowH - fit.lines.length * lh) / 2;
        fit.lines.forEach((line, li) => {
          ctx.fillText(line, textX, startY + li * lh + lh / 2);
        });
        shadowOff();
      }
      y += rowH + 16 * s;
    });
  }

  // 5. CTA 按鈕
  if (slide.ctaButton) {
    const bh = Math.round(72 * s);
    y += 6 * s;
    if (draw) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, bh, bh / 2);
      if (p.gradientCta) {
        const g = ctx.createLinearGradient(x, y, x + w, y);
        g.addColorStop(0, '#9333ea');
        g.addColorStop(1, '#3b82f6');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = p.accent;
      }
      ctx.fill();
      const fit = fitText(
        ctx,
        slide.ctaButton,
        w - 56 * s,
        1,
        Math.round(30 * s),
        Math.round(22 * s),
        (size) => fontString(700, size, f.body)
      );
      ctx.font = fontString(700, fit.size, f.body);
      ctx.textAlign = 'center';
      ctx.fillStyle = p.gradientCta ? '#ffffff' : p.accentText;
      ctx.fillText(fit.lines[0] ?? '', x + w / 2, y + bh / 2 + 1);
      ctx.textAlign = 'left';
    }
    y += bh + 8 * s;
  } else if (slide.footnote) {
    // 6. 註腳（無 CTA 時才顯示）
    const text = slide.footnote.replace(/👉/g, '→').trim();
    ctx.font = fontString(500, Math.round(22 * s), f.body);
    if (draw) {
      shadowOn();
      ctx.fillStyle = p.muted;
      ctx.fillText(text, x, y + 14 * s);
      shadowOff();
    }
    y += 34 * s;
  }

  return y - top;
}

/** 品牌角落（左上）：Logo + 名稱 / 帳號 */
async function drawBrand(ctx: CanvasRenderingContext2D, brand: BrandInfo, fontStyle: FontStyle) {
  const name = brand.name.trim();
  const handle = brand.handle.trim();
  if (!name && !handle && !brand.logo) return;

  const f = FONT_STYLES[fontStyle];
  const h = 64;
  const x = 40;
  const y = 40;
  let logoImg: HTMLImageElement | null = null;
  if (brand.logo) {
    try {
      logoImg = await loadImage(brand.logo);
    } catch {
      logoImg = null;
    }
  }

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = fontString(700, 24, f.body);
  const nameW = name ? ctx.measureText(name).width : 0;
  ctx.font = fontString(500, 19, f.body);
  const handleW = handle ? ctx.measureText(handle).width : 0;
  const textW = Math.max(nameW, handleW);
  const logoW = logoImg ? h - 12 : 0;
  const pad = 14;
  const total = pad + (logoImg ? logoW + 12 : 0) + textW + pad + (textW > 0 ? 4 : 0);

  ctx.beginPath();
  ctx.roundRect(x, y, total, h, h / 2);
  ctx.fillStyle = 'rgba(10,14,26,0.55)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.stroke();

  let cx = x + pad;
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + logoW / 2, y + h / 2, logoW / 2, 0, Math.PI * 2);
    ctx.clip();
    const r = logoImg.width / logoImg.height;
    const lw = r >= 1 ? logoW * r : logoW;
    const lh = r >= 1 ? logoW : logoW / r;
    ctx.drawImage(logoImg, cx + (logoW - lw) / 2, y + (h - lh) / 2, lw, lh);
    ctx.restore();
    cx += logoW + 12;
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  if (name && handle) {
    ctx.font = fontString(700, 24, f.body);
    ctx.fillText(name, cx, y + h / 2 - 11);
    ctx.font = fontString(500, 19, f.body);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText(handle, cx, y + h / 2 + 13);
  } else if (name || handle) {
    ctx.font = fontString(700, 24, f.body);
    ctx.fillText(name || handle, cx, y + h / 2 + 1);
  }
  ctx.restore();
}

/* ============================================================
   版型 5：雜誌上下分欄 (Magazine Split)
   頂部大字報頭 + 底部膠囊橫條，完全釋放中央人像與動作主體！
============================================================ */
function drawMagazineSplit(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  fontStyle: FontStyle,
  p: Palette,
  hasBrand: boolean
) {
  const f = FONT_STYLES[fontStyle];
  const marginX = 64;
  const contentW = SIZE - marginX * 2;

  // 1. 頂部深色漸層（確保標題在任何高光背景下皆清晰無比）
  const topGrad = ctx.createLinearGradient(0, 0, 0, 380);
  topGrad.addColorStop(0, 'rgba(8,12,24,0.88)');
  topGrad.addColorStop(0.55, 'rgba(8,12,24,0.5)');
  topGrad.addColorStop(1, 'rgba(8,12,24,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, SIZE, 380);

  // 2. 頂部文字排版（若有品牌標籤則稍微下移避免重疊）
  let topY = hasBrand ? 128 : 64;

  if (slide.tag) {
    const th = 38;
    ctx.font = fontString(700, 20, f.body);
    const tw = ctx.measureText(slide.tag).width + 28;
    ctx.beginPath();
    ctx.roundRect(marginX, topY, tw, th, th / 2);
    ctx.fillStyle = p.tagBg;
    ctx.fill();
    ctx.fillStyle = p.tagText;
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.tag, marginX + 14, topY + th / 2 + 1);
    topY += th + 18;
  }

  // 大標題
  const fitTitle = fitText(
    ctx,
    slide.title,
    contentW,
    2,
    58,
    40,
    (size) => fontString(f.headingWeight, size, f.heading)
  );
  const titleLh = fitTitle.size * 1.25;
  ctx.font = fontString(f.headingWeight, fitTitle.size, f.heading);
  ctx.textBaseline = 'alphabetic';
  for (const line of fitTitle.lines) {
    ctx.fillStyle = p.title;
    if (f.headingStroke > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = f.headingStroke;
      ctx.strokeStyle = p.title;
      ctx.strokeText(line, marginX, topY + fitTitle.size);
    }
    ctx.fillText(line, marginX, topY + fitTitle.size);
    topY += titleLh;
  }

  // 3. 底部深色漸層（為底部要點/CTA打底）
  const bottomGrad = ctx.createLinearGradient(0, 560, 0, SIZE);
  bottomGrad.addColorStop(0, 'rgba(8,12,24,0)');
  bottomGrad.addColorStop(0.35, 'rgba(8,12,24,0.68)');
  bottomGrad.addColorStop(1, 'rgba(8,12,24,0.92)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 560, SIZE, SIZE - 560);

  const hasBullets = !!slide.bulletPoints && slide.bulletPoints.length > 0;

  if (hasBullets) {
    // 每個要點排成「獨立毛玻璃膠囊橫條 (Pill Bar)」
    const bullets = slide.bulletPoints!.slice(0, 3);
    const cardH = 62;
    const gap = 14;
    const totalH = bullets.length * cardH + (bullets.length - 1) * gap;
    const startY = SIZE - 68 - totalH;

    bullets.forEach((point, i) => {
      const by = startY + i * (cardH + gap);

      // 膠囊卡片底色與邊框
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(marginX, by, contentW, cardH, 20);
      ctx.fillStyle = p.cardFill !== 'transparent' ? p.cardFill : 'rgba(12,18,34,0.65)';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = p.cardStroke !== 'transparent' ? p.cardStroke : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.restore();

      // 序號標記：01 │, 02 │, 03 │
      const numStr = `0${i + 1}`;
      ctx.font = fontString(900, 23, f.body);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.accent;
      ctx.fillText(numStr, marginX + 20, by + cardH / 2 + 1);

      // 垂直細分隔線
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      ctx.fillRect(marginX + 62, by + 16, 1.5, cardH - 32);

      // 要點文字
      ctx.font = fontString(700, 24, f.body);
      ctx.fillStyle = p.bullet;
      const textFit = fitText(
        ctx,
        point,
        contentW - 90,
        1,
        24,
        20,
        (s) => fontString(700, s, f.body)
      );
      ctx.fillText(textFit.lines[0] || point, marginX + 78, by + cardH / 2 + 1);
    });
  } else {
    // 無要點頁面（封面或 CTA 頁）：副標題 + 按鈕 / 註腳
    let bottomY = SIZE - 180;
    if (slide.subtitle) {
      const subFit = fitText(
        ctx,
        slide.subtitle,
        contentW,
        2,
        28,
        22,
        (s) => fontString(f.bodyWeight, s, f.body)
      );
      const subLh = subFit.size * 1.4;
      ctx.font = fontString(f.bodyWeight, subFit.size, f.body);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.sub;
      for (const line of subFit.lines) {
        ctx.fillText(line, marginX, bottomY);
        bottomY += subLh;
      }
    }

    if (slide.ctaButton) {
      const bh = 70;
      ctx.beginPath();
      ctx.roundRect(marginX, SIZE - 114, contentW, bh, bh / 2);
      ctx.fillStyle = p.accent;
      ctx.fill();
      ctx.font = fontString(700, 28, f.body);
      ctx.textAlign = 'center';
      ctx.fillStyle = p.accentText;
      ctx.fillText(slide.ctaButton, marginX + contentW / 2, SIZE - 114 + bh / 2 + 1);
      ctx.textAlign = 'left';
    } else if (slide.footnote) {
      ctx.font = fontString(500, 22, f.body);
      ctx.fillStyle = p.muted;
      ctx.textBaseline = 'middle';
      ctx.fillText(slide.footnote.replace(/👉/g, '→'), marginX, SIZE - 68);
    }
  }
}

/* ============================================================
   版型 6：精品置中海報 (Poster Frame)
   內縮雙框線海報畫框 + 全置中對稱排版 + ✦ 星芒宣言條列
============================================================ */
function drawPosterFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slide: SlideData,
  fontStyle: FontStyle,
  p: Palette,
  focus: CropFocus
) {
  const f = FONT_STYLES[fontStyle];
  const frameInset = 36;
  const frameW = SIZE - frameInset * 2;
  const frameH = SIZE - frameInset * 2;

  // 1. 海報細外框
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = p.cardStroke !== 'transparent' ? p.cardStroke : 'rgba(255,255,255,0.32)';
  ctx.strokeRect(frameInset, frameInset, frameW, frameH);

  // 四個角落強調標記 (Corner Accent Ticks)
  const tick = 14;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = p.accent;
  ctx.beginPath();
  // 左上
  ctx.moveTo(frameInset - 2, frameInset + tick);
  ctx.lineTo(frameInset - 2, frameInset - 2);
  ctx.lineTo(frameInset + tick, frameInset - 2);
  // 右上
  ctx.moveTo(frameInset + frameW + 2 - tick, frameInset - 2);
  ctx.lineTo(frameInset + frameW + 2, frameInset - 2);
  ctx.lineTo(frameInset + frameW + 2, frameInset + tick);
  // 右下
  ctx.moveTo(frameInset + frameW + 2, frameInset + frameH + 2 - tick);
  ctx.lineTo(frameInset + frameW + 2, frameInset + frameH + 2);
  ctx.lineTo(frameInset + frameW + 2 - tick, frameInset + frameH + 2);
  // 左下
  ctx.moveTo(frameInset + tick, frameInset + frameH + 2);
  ctx.lineTo(frameInset - 2, frameInset + frameH + 2);
  ctx.lineTo(frameInset - 2, frameInset + frameH + 2 - tick);
  ctx.stroke();
  ctx.restore();

  // 2. 底部中心半透明毛玻璃卡片（置中對稱）
  const cardW = SIZE - 120;
  const cardX = 60;
  const pad = 44;
  const innerW = cardW - pad * 2;

  // 量測置中內容高度
  const hasBullets = !!slide.bulletPoints && slide.bulletPoints.length > 0;
  const fitTitle = fitText(
    ctx,
    slide.title,
    innerW,
    2,
    54,
    38,
    (s) => fontString(f.headingWeight, s, f.heading)
  );
  const titleLh = fitTitle.size * 1.25;

  let contentH = fitTitle.lines.length * titleLh + 24; // 標題 + 分隔線
  if (slide.tag) contentH += 48;
  if (slide.subtitle) {
    const subFit = fitText(
      ctx,
      slide.subtitle,
      innerW,
      2,
      26,
      20,
      (s) => fontString(f.bodyWeight, s, f.body)
    );
    contentH += subFit.lines.length * (subFit.size * 1.4) + 14;
  }
  if (hasBullets) {
    contentH += slide.bulletPoints!.slice(0, 3).length * 48 + 12;
  }
  if (slide.ctaButton) contentH += 74;
  else if (slide.footnote) contentH += 36;

  const cardH = contentH + pad * 2;
  const cardY = SIZE - 56 - cardH;

  // 繪製毛玻璃卡片
  drawFrostedCard(ctx, img, focus, cardX, cardY, cardW, cardH, 32, p);

  // 3. 繪製全置中文字
  let curY = cardY + pad;
  const centerX = SIZE / 2;
  ctx.textAlign = 'center';

  // 標籤
  if (slide.tag) {
    const th = 36;
    ctx.font = fontString(700, 20, f.body);
    const tw = ctx.measureText(slide.tag).width + 28;
    ctx.beginPath();
    ctx.roundRect(centerX - tw / 2, curY, tw, th, th / 2);
    ctx.fillStyle = p.tagBg;
    ctx.fill();
    ctx.fillStyle = p.tagText;
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.tag, centerX, curY + th / 2 + 1);
    curY += th + 16;
  }

  // 大標題
  ctx.font = fontString(f.headingWeight, fitTitle.size, f.heading);
  ctx.textBaseline = 'alphabetic';
  for (const line of fitTitle.lines) {
    ctx.fillStyle = p.title;
    if (f.headingStroke > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = f.headingStroke;
      ctx.strokeStyle = p.title;
      ctx.strokeText(line, centerX, curY + fitTitle.size);
    }
    ctx.fillText(line, centerX, curY + fitTitle.size);
    curY += titleLh;
  }

  // 分隔短橫線
  curY += 8;
  ctx.beginPath();
  ctx.roundRect(centerX - 24, curY, 48, 3, 1.5);
  ctx.fillStyle = p.accent;
  ctx.fill();
  curY += 18;

  // 副標題
  if (slide.subtitle) {
    const subFit = fitText(
      ctx,
      slide.subtitle,
      innerW,
      2,
      26,
      20,
      (s) => fontString(f.bodyWeight, s, f.body)
    );
    const subLh = subFit.size * 1.4;
    ctx.font = fontString(f.bodyWeight, subFit.size, f.body);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.sub;
    for (const line of subFit.lines) {
      ctx.fillText(line, centerX, curY + subFit.size / 2);
      curY += subLh;
    }
    curY += 14;
  }

  // 條列要點：✦ 星芒置中標籤
  if (hasBullets) {
    slide.bulletPoints!.slice(0, 3).forEach((point) => {
      const bh = 42;
      const fitPoint = fitText(
        ctx,
        point,
        innerW - 60,
        1,
        24,
        19,
        (s) => fontString(700, s, f.body)
      );
      const fullText = `✦  ${fitPoint.lines[0] || point}`;
      ctx.font = fontString(700, fitPoint.size, f.body);
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.bullet;
      ctx.fillText(fullText, centerX, curY + bh / 2);
      curY += bh + 6;
    });
  }

  // CTA 按鈕
  if (slide.ctaButton) {
    const bh = 64;
    const btnW = Math.min(520, innerW);
    ctx.beginPath();
    ctx.roundRect(centerX - btnW / 2, curY + 6, btnW, bh, bh / 2);
    ctx.fillStyle = p.accent;
    ctx.fill();
    ctx.font = fontString(700, 26, f.body);
    ctx.fillStyle = p.accentText;
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.ctaButton, centerX, curY + 6 + bh / 2 + 1);
  } else if (slide.footnote) {
    ctx.font = fontString(500, 21, f.body);
    ctx.fillStyle = p.muted;
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.footnote.replace(/👉/g, '→'), centerX, curY + 14);
  }

  ctx.textAlign = 'left';
}

/* ============================================================
   主渲染函式（回傳前所有 await 已完成，繪製過程為同步，不會互相干擾）
============================================================ */

export async function renderSlideToCanvas(
  target: HTMLCanvasElement,
  imgSrc: string,
  slide: SlideData,
  options: RenderOptions
): Promise<void> {
  const focus = options.focus ?? { x: 0.5, y: 0.5 };
  const fontStyle = options.fontStyle;
  const textForFonts = [
    slide.tag,
    slide.title,
    slide.subtitle,
    slide.ctaButton,
    slide.footnote,
    ...(slide.bulletPoints ?? []),
    options.brand?.name,
    options.brand?.handle,
    '0123456789→',
  ]
    .filter(Boolean)
    .join('');

  const [img] = await Promise.all([loadImage(imgSrc), ensureFonts(fontStyle, textForFonts)]);

  // 先把品牌 Logo 預載，確保 drawBrand 內不再產生長時間等待
  const brand = options.brand;
  if (brand?.logo) {
    try {
      await loadImage(brand.logo);
    } catch {
      /* ignore */
    }
  }

  const work = document.createElement('canvas');
  work.width = SIZE * SS;
  work.height = SIZE * SS;
  const ctx = work.getContext('2d');
  if (!ctx) return;
  ctx.scale(SS, SS);
  ctx.imageSmoothingQuality = 'high';

  const theme = THEME_CONFIGS[options.theme] ?? THEME_CONFIGS['dark-glass'];
  const layout = options.layout;
  const isCard =
    layout === 'compact-card' ||
    layout === 'center-card' ||
    layout === 'poster-frame' ||
    layout === 'magazine-split';
  const palette = isCard ? theme.card : theme.photo;

  // 1. 底圖（1:1 裁切）
  drawCover(ctx, img, focus, SIZE);

  // 2. 依版型排版
  const marginX = 72;
  const hasBrand = !!(brand && (brand.name.trim() || brand.handle.trim() || brand.logo));

  if (layout === 'bottom-banner') {
    const style: ContentStyle = {
      fontStyle,
      palette,
      scale: 1,
      showSubtitleWithBullets: false,
    };
    const w = SIZE - marginX * 2;
    const h = drawContent(ctx, slide, 0, 0, w, style, false);
    const bottomPad = 64;
    const top = SIZE - bottomPad - h;
    const g = ctx.createLinearGradient(0, top - 190, 0, SIZE);
    g.addColorStop(0, 'rgba(8,12,24,0)');
    g.addColorStop(0.4, 'rgba(8,12,24,0.55)');
    g.addColorStop(0.75, 'rgba(8,12,24,0.82)');
    g.addColorStop(1, 'rgba(8,12,24,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top - 190, SIZE, SIZE - top + 190);
    drawContent(ctx, slide, marginX, top, w, style, true);
  } else if (layout === 'corner-tag') {
    const style: ContentStyle = {
      fontStyle,
      palette,
      scale: 0.88,
      showSubtitleWithBullets: false,
    };
    const w = 640;
    const barW = 7;
    const textX = marginX + barW + 22;
    const h = drawContent(ctx, slide, 0, 0, w, style, false);
    const top = SIZE - 72 - h;
    const rg = ctx.createRadialGradient(0, SIZE, 40, 0, SIZE, 980);
    rg.addColorStop(0, 'rgba(6,10,20,0.88)');
    rg.addColorStop(0.55, 'rgba(6,10,20,0.5)');
    rg.addColorStop(1, 'rgba(6,10,20,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.beginPath();
    ctx.roundRect(marginX, top + 4, barW, h - 8, barW / 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    drawContent(ctx, slide, textX, top, w, style, true);
  } else if (layout === 'compact-card') {
    const style: ContentStyle = {
      fontStyle,
      palette,
      scale: 0.92,
      showSubtitleWithBullets: false,
    };
    const cardX = 48;
    const cardW = SIZE - cardX * 2;
    const pad = 48;
    const innerW = cardW - pad * 2;
    const h = drawContent(ctx, slide, 0, 0, innerW, style, false);
    const cardH = h + pad * 2 - 8;
    const cardY = SIZE - 48 - cardH;
    drawFrostedCard(ctx, img, focus, cardX, cardY, cardW, cardH, 40, palette);
    drawContent(ctx, slide, cardX + pad, cardY + pad - 4, innerW, style, true);
  } else if (layout === 'center-card') {
    const style: ContentStyle = {
      fontStyle,
      palette,
      scale: 1,
      showSubtitleWithBullets: true,
    };
    const cardX = 64;
    const cardW = SIZE - cardX * 2;
    const pad = 56;
    const innerW = cardW - pad * 2;
    const h = drawContent(ctx, slide, 0, 0, innerW, style, false);
    const cardH = Math.min(h + pad * 2 - 8, SIZE - 220);
    const cardY = options.pageIndex === 0 ? SIZE - cardH - 96 : (SIZE - cardH) / 2 + 24;
    drawFrostedCard(ctx, img, focus, cardX, cardY, cardW, cardH, 44, palette);
    drawContent(ctx, slide, cardX + pad, cardY + pad - 4, innerW, style, true);
  } else if (layout === 'magazine-split') {
    drawMagazineSplit(ctx, slide, fontStyle, palette, hasBrand);
  } else if (layout === 'poster-frame') {
    drawPosterFrame(ctx, img, slide, fontStyle, palette, focus);
  }

  // 3. 品牌（若有設定才繪製）
  if (brand) await drawBrand(ctx, brand, fontStyle);


  // 6. 縮放輸出到 1080×1080（高品質下採樣）
  target.width = SIZE;
  target.height = SIZE;
  const out = target.getContext('2d');
  if (!out) return;
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.clearRect(0, 0, SIZE, SIZE);
  out.drawImage(work, 0, 0, SIZE, SIZE);
}
