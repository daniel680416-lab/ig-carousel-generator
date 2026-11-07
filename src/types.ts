export type CardTheme = 'light-glass' | 'dark-glass' | 'amber-warm' | 'cyber-neon';
export type LayoutMode =
  | 'bottom-banner'
  | 'compact-card'
  | 'center-card'
  | 'corner-tag'
  | 'magazine-split'
  | 'poster-frame';
export type FontStyle = 'modern' | 'warm' | 'elegant';
export type ExportFormat = 'png' | 'jpg';
export type CtaGoal = 'keyword' | 'signup' | 'save' | 'engage' | 'urgency';
export type CopyStyle = 'xiaohongshu' | 'professional' | 'storytelling';

export const COPY_STYLES: {
  id: CopyStyle;
  label: string;
  badge: string;
  desc: string;
  promptGuidance: string;
}[] = [
  {
    id: 'xiaohongshu',
    label: '小紅書爆款風',
    badge: '🔥 推薦',
    desc: '強烈情緒鉤子 · 閨蜜親測語氣 · 高互動率',
    promptGuidance: `【風格要求：正宗小紅書種草爆款體（強烈推薦）】：
- 標題與封面：使用小紅書爆款情緒鉤子標題，多用反差感、懸念或好物推薦（例如：「聽勸！新手千萬別…」、「被問爆的私藏秘訣」、「後悔沒有早點知道」），直擊人心！
- 語氣特徵：像私藏乾貨給好閨蜜／同好的親切語氣，帶點真誠分享感，絕對不要教科書或死板的官方公關腔。
- 內文節奏：短句節奏輕快、適量使用精準生活感 Emoji（✨、😭、👀、📌、⚠️），段落分明。
- 痛點與解法：將盲點寫得極具共鳴（「是不是每次都…」），解法寫得像「偷跑秘技」。
- 結尾與互動：引導「先碼住/收藏防走丟」、「評論區蹲一個課友/同好」，營造極佳的社群互動氛圍。`,
  },
  {
    id: 'professional',
    label: '專業講師風',
    badge: '💼 權威',
    desc: '清晰乾貨 · 系統架構 · 品牌信任感',
    promptGuidance: `【風格要求：專業導師與知識型創作者體】：
- 標題與封面：清晰有力、定位精確，強調實戰方法論與系統化學習價值。
- 語氣特徵：專業、自信、值得信賴的導師口吻，條理清晰。
- 內文節奏：結構嚴謹、條列分明，重點突出，適合注重學習成果與專業深度的讀者。`,
  },
  {
    id: 'storytelling',
    label: '學員故事風',
    badge: '💬 共鳴',
    desc: '真實心路歷程 · 前後對比 · 情感共振',
    promptGuidance: `【風格要求：真實蛻變故事與情感共鳴體】：
- 標題與封面：以「真實學員轉變／從0到1」的視角切入，引發同理心。
- 語氣特徵：真實、真誠、富有情感溫度，強調從「卡關/自我懷疑」到「突破/找回自信」的心路歷程。
- 內文節奏：故事化鋪陳，適合引發強烈情感共鳴與深度轉化。`,
  },
];

export const CTA_GOALS: {
  id: CtaGoal;
  label: string;
  desc: string;
  /** 提供給 AI 的行動目標說明 */
  prompt: string;
  /** 「CTA 細節」欄位的提示文字 */
  detailPlaceholder: string;
}[] = [
  {
    id: 'keyword',
    label: '領取資料',
    desc: '留言關鍵字',
    prompt:
      '引導讀者「留言指定關鍵字」以領取資料（講義、懶人包、清單）。按鈕文字範例：「👉 留言【關鍵字】領講義」。貼文結尾說明留言後會私訊寄送，並鼓勵留言。',
    detailPlaceholder: '關鍵字與贈品，例如：關鍵字「空瑜」、新手動作圖解',
  },
  {
    id: 'signup',
    label: '引導報名',
    desc: '點主頁連結',
    prompt:
      '引導讀者「點擊個人檔案連結」預約或報名課程。按鈕文字範例：「👉 點主頁連結預約體驗」。貼文結尾強調名額、時間或報名方式，並提醒連結在個人檔案（Link in bio）。',
    detailPlaceholder: '報名資訊，例如：每班限 6 人、週六 10:00 體驗課',
  },
  {
    id: 'save',
    label: '教學收藏',
    desc: '收藏隨時複習',
    prompt:
      '引導讀者「收藏這篇貼文」，並分享給朋友。按鈕文字範例：「📌 先收藏，練習時回來看」。貼文結尾說明內容值得反覆複習，鼓勵收藏與轉發。',
    detailPlaceholder: '想強調的收藏理由（選填）',
  },
  {
    id: 'engage',
    label: '互動討論',
    desc: '提問留言投票',
    prompt:
      '引導讀者「在留言區回答問題或投票」。按鈕文字範例：「💬 你卡在哪一關？留言告訴我」。貼文結尾拋出一個二選一或三選一的問題，讓讀者輕鬆回覆。',
    detailPlaceholder: '想問的問題或選項（選填）',
  },
  {
    id: 'urgency',
    label: '限時促購',
    desc: '早鳥倒數',
    prompt:
      '營造「限時、限量」的急迫感，促使讀者立刻行動。按鈕文字範例：「🔥 早鳥倒數，前 10 名加贈」。貼文結尾清楚寫出期限、名額與優惠內容，語氣積極但不誇大。',
    detailPlaceholder: '優惠內容，例如：早鳥 8 折、10/31 截止、前 10 名贈評估',
  },
];

export interface SlideData {
  tag: string;
  title: string;
  subtitle?: string;
  bulletPoints?: string[];
  ctaButton?: string;
  footnote?: string;

  // 單頁專屬版型覆寫與位置微調
  customLayout?: LayoutMode;
  customPosition?: 'top' | 'center' | 'bottom';
  customAlign?: 'left' | 'center' | 'right';
}

export interface GeneratedContent {
  /** AI 自動深度推演出的目標受眾 */
  analyzedAudience?: string;
  /** AI 自動深度推演出的亮點與痛點 */
  analyzedKeyTakeaways?: string;
  slides: [SlideData, SlideData, SlideData, SlideData];
  caption: string;
}

/** 照片裁切焦點（0~1），0.5 代表置中 */
export interface CropFocus {
  x: number;
  y: number;
}

/** 品牌資訊（顯示在圖片左上角） */
export interface BrandInfo {
  name: string;
  handle: string;
  logo: string; // data URL，可為空字串
}
