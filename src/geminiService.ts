import { CTA_GOALS } from './types';
import type { CtaGoal, GeneratedContent } from './types';

/**
 * 預設展示文案（當使用者尚未輸入 API Key 時，提供現成專業範本立即預覽體驗）
 */
export const DEFAULT_DEMO_CONTENT: GeneratedContent = {
  slides: [
    {
      tag: '✨ 零基礎新手',
      title: '新手也能上手的\n空中瑜珈入門',
      subtitle: '克服懸空恐懼，找回輕盈體態',
      footnote: '滑動看技巧 👉',
    },
    {
      tag: '❌ 3大常見盲點',
      title: '為什麼你總覺得\n自己不適合空瑜？',
      subtitle: '不是沒有運動天份，而是用錯方法：',
      bulletPoints: [
        '誤以為手力大才能爬上布',
        '害怕倒立懸空眩暈',
        '死抓掛布導致肩頸代償',
      ],
      footnote: '往右看突破解方 👉',
    },
    {
      tag: '💡 核心解法',
      title: '用骨盆核心借力\n優雅展翅的關鍵',
      subtitle: '3 步驟輕鬆掌握身體重心：',
      bulletPoints: [
        '鎖定腹部核心而非手臂死抓',
        '視線固定水平線克服眩暈',
        '配合深呼吸放鬆筋膜',
      ],
      footnote: '專屬福利 👉',
    },
    {
      tag: '🎁 限時體驗',
      title: '解鎖初學空中瑜珈\n新手體驗私教講義',
      subtitle: '包含基礎 6 大安全懸掛動作指南',
      ctaButton: '👉 留言【空瑜】私訊領取講義',
      footnote: '名額有限，立即收藏！',
    },
  ],

  caption: `🚀【為什麼你的 IG 圖文總是沒人看？4 招教你打造高爆發輪播圖！】

每次花了好幾小時做圖，結果點擊率還是慘不忍睹？
很有可能不是你的內容不好，而是「視覺傳達」出了問題！

很多人在做社群圖文時常陷入這 3 個地雷：
❌ 資訊塞得太滿，讀者 3 秒內抓不到重點
❌ 背景顏色太花，文字辨識度超低
❌ 沒有明確的行動呼籲（CTA），大家看完就滑走了

其實，只要掌握這套「半透明卡片排版法」：
1️⃣ 鎖定 1:1 標準正方形尺寸
2️⃣ 建立視覺安全邊界，把文字裝進半透明卡片
3️⃣ 鉤子標題 ➔ 痛點共鳴 ➔ 核心解方 ➔ 明確行動

👉 想領取這套「社群輪播排版指南＋20款精選配色」嗎？
現在只要在下方留言【模板】，系統就會自動私訊領取連結給你！

記得【收藏】這篇，下次做圖隨時拿出來對照！✨

#社群經營 #IG經營 #自媒體行銷 #圖文排版 #個人品牌`,
};

/**
 * 呼叫 Google Gemini API 生成 4 張輪播圖文字與社群貼文
 */
export async function generateCarouselContent(
  apiKey: string,
  topic: string,
  audience?: string,
  keyTakeaways?: string,
  ctaGoal: CtaGoal = 'keyword',
  ctaDetail?: string,
  onStatus?: (msg: string) => void
): Promise<GeneratedContent> {
  const goal = CTA_GOALS.find((g) => g.id === ctaGoal) ?? CTA_GOALS[0];

  const prompt = `
你是一位頂級的 Instagram 社群內容總監與視覺文案專家。
請根據以下課程/主題資訊，快速完成受眾與痛點設定，並為 Instagram 設計「4 張 1:1 輪播圖（Carousel）」的精準卡片文案與「IG 發文文案（Caption）」。請無需冗長推論，直接輸出最終 JSON 結果。

【課程主題】：${topic}

【1. 受眾與痛點設定】：
${
  !audience?.trim()
    ? '- 目標受眾（未指定）：請直接設定最適合此主題的受眾畫像（15~25字），填入 "analyzedAudience"（例：「久坐上班族、運動新手、想改善體態的初學者」）。'
    : `- 目標受眾：「${audience.trim()}」，請填入 "analyzedAudience"。`
}
${
  !keyTakeaways?.trim()
    ? '- 重點痛點（未指定）：請直接列出該主題學員最常見的 3 大盲點與突破解法（20~35字），填入 "analyzedKeyTakeaways"（例：「克服懸空恐懼、核心借力不手酸、優雅舒展肩頸」）。'
    : `- 重點痛點：「${keyTakeaways.trim()}」，請填入 "analyzedKeyTakeaways"。`
}

【2. 行動呼籲（CTA）目標】：${goal.label}
- 方向說明：${goal.prompt}
- 使用者補充細節：${ctaDetail?.trim() || '（未提供，請依主題自行合理設計，不要編造具體價格、日期或名額）'}
- 第 4 張圖的 ctaButton、footnote，以及貼文結尾的 CTA，都必須圍繞此目標，三者保持一致。

【3. 極致精簡原則（重要！不可遮擋背景照片）】：
- 標題（title）：12 字以內短語，可加換行符號 \\n。
- 副標題（subtitle）：15 字以內短句。
- 條列要點（bulletPoints）：每點必須極致精簡在 6~12 字以內（短語即可，例如「手臂過度用力代償」、「骨盆未正導致晃動」），嚴禁長篇大論！
- CTA 按鈕（ctaButton）：12 字以內短語。

【4 張輪播圖結構要求（需緊扣上述受眾與痛點）】：
- Slide 1 (封面 Hook)：爆款吸睛大標題（10~14字）、好奇副標、亮點標籤。
- Slide 2 (痛點共鳴)：直接點出學員常犯的 3 個盲點/困擾，條列 3 點極短 bulletPoints。
- Slide 3 (核心解法)：介紹 3 大關鍵技巧/價值突破，條列 3 點極短 bulletPoints。
- Slide 4 (行動呼籲 CTA)：依上述 CTA 目標，提供極簡 ctaButton 文字。

【IG 發文貼文 (caption) 要求】：
- 具有吸引人的前 2~3 行鉤子標題（防止被截斷）
- 豐富的 Emoji 與清晰換行分段
- 條列式整理貼文重點（呼應受眾痛點與解法）
- 結尾使用上述 CTA 目標的引導方式，並搭配收藏或留言的互動提醒
- Hashtags 標籤「嚴格限制剛好 5 個精準度最高、與主題最密切相關」的繁體中文標籤（不多不少，僅保留最關鍵的 5 個核心 Hashtag）。

【輸出格式】：
你必須「只」回傳標準的 JSON 格式字串，不要包含額外的 Markdown 標籤或解釋，格式如下：
{
  "analyzedAudience": "推演出的目標受眾（15~25字）",
  "analyzedKeyTakeaways": "推演出的亮點與痛點（20~35字）",
  "slides": [
    {
      "tag": "頂部標籤 (如 🔥 2026 必學)",
      "title": "大標題（可用 \\n 斷行）",
      "subtitle": "副標題說明",
      "footnote": "滑動看更多 👉"
    },
    {
      "tag": "痛點標籤",
      "title": "痛點大標題",
      "subtitle": "痛點說明短句",
      "bulletPoints": ["痛點1", "痛點2", "痛點3"],
      "footnote": "往右看突破解方 👉"
    },
    {
      "tag": "解法標籤",
      "title": "核心解法大標題",
      "subtitle": "解法說明短句",
      "bulletPoints": ["關鍵重點1", "關鍵重點2", "關鍵重點3"],
      "footnote": "專屬福利看下一頁 👉"
    },
    {
      "tag": "福利/行動標籤",
      "title": "行動呼籲大標題",
      "subtitle": "課程/福利說明短句",
      "ctaButton": "👉 留言【關鍵字】領取好禮",
      "footnote": "收藏這篇，隨時複習！"
    }
  ],
  "caption": "完整的 IG 發文貼文內容"
}
`;

  // 1. 優先嘗試使用 Vercel 後端安全代理端點 /api/generate
  // 由前端分次發起獨立請求，讓每個備援模型都享有完整的 48 秒伺服器執行時間，並即時更新進度文字！
  const trimmedKey = apiKey.trim();
  const isDirectApiKey = trimmedKey.startsWith('AIzaSy'); // 只有真正的 Google API Key 是 AIzaSy 開頭

  const proxyAttempts = [
    {
      model: 'gemini-3.8-flash',
      statusText: '✨ AI 正在分析受眾並撰寫文案中 (主力通道 gemini-3.8-flash)…',
    },
    {
      model: 'gemma-4-26b-a4b-it',
      statusText: '🔄 主力模型處於流量尖峰，已自動切換至高速備援通道 (gemma-4-26b-a4b-it)，請稍候…',
    },
    {
      model: 'gemini-3.8-flash',
      statusText: '⏳ 正在進行最終重試 (gemini-3.8-flash)，請保持畫面開啟…',
    },
  ];

  let lastProxyError = '';

  for (let i = 0; i < proxyAttempts.length; i++) {
    const attempt = proxyAttempts[i];
    onStatus?.(attempt.statusText);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 52000);

      const proxyRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          accessCode: trimmedKey,
          model: attempt.model,
        }),
      });
      clearTimeout(timeoutId);

      if (proxyRes.ok) {
        const parsed = (await proxyRes.json()) as GeneratedContent;
        return parsed;
      }

      const errData = await proxyRes.json().catch(() => ({}));
      const errMsg = errData.error || `HTTP ${proxyRes.status}`;
      lastProxyError = errMsg;

      // 若是通行密碼錯誤 (401) 或伺服器未設定環境變數 (fatal)，立即停止重試並回報
      if (proxyRes.status === 401 || errData.fatal) {
        throw new Error(errMsg);
      }

      // 若是本地開發環境 (404 找不到 /api/generate) 且使用者有輸入 AIzaSy 金鑰，跳出進入前端直連
      if (proxyRes.status === 404 && isDirectApiKey) {
        break;
      }
      // 否則（例如 503 High Demand、504 超時），自動進入迴圈下一棒備援模型！
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastProxyError = `[${attempt.model}] 伺服器回應超時`;
        continue;
      }
      // 若為明確致命錯誤（如通行密碼錯誤），直接向外拋出停止
      if (err.message?.includes('通行密碼') || err.message?.includes('環境變數')) {
        throw err;
      }
      lastProxyError = err.message || '連線異常';
      if (isDirectApiKey) {
        break;
      }
    }
  }

  if (!isDirectApiKey) {
    throw new Error(
      `生成未完成（${lastProxyError || 'Google AI 伺服器目前處於流量尖峰'}）。目前已停止等待，請點擊下方按鈕再試一次！`
    );
  }

  const cleanKey = trimmedKey;


  // 嘗試向 Google 查詢該 API Key 實際擁有的模型清單
  let availableModels: string[] = [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
    );
    const listData = await listRes.json();
    if (!listRes.ok) {
      throw new Error(
        `API Key 驗證失敗: ${listData.error?.message || listRes.statusText}`
      );
    }
    availableModels = (listData.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));
  } catch (err: any) {
    throw new Error(`無法連接 Google API: ${err.message}`);
  }

  if (availableModels.length === 0) {
    throw new Error('此 API Key 找不到任何支援 generateContent 的模型，請確認是否為 Google AI Studio 產生的金鑰。');
  }

  // 優先使用最新世代模型（排除已對新用戶停用的 1.5 / 2.0 / 2.5 舊模型）
  const preferredOrder = [
    'gemini-3.8-flash',
    'gemini-3.8-pro',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemma-4-26b-a4b-it',
  ];

  const activeAvailable = availableModels.filter(
    (m) => !m.includes('1.5') && !m.includes('2.0') && !m.includes('2.5')
  );

  const modelsToTry = Array.from(
    new Set([
      'gemini-3.8-flash',
      ...preferredOrder.filter((m) => activeAvailable.includes(m)),
      ...activeAvailable,
    ])
  );

  let lastError: any = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
    try {
      const generationConfig: Record<string, any> = { temperature: 0.7 };
      if (!model.startsWith('gemma')) {
        generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`[${model}] ${errMsg}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`[${model}] 未回傳內容，嘗試下一個模型...`);
        continue;
      }

      try {
        const parsed = JSON.parse(text) as GeneratedContent;
        return parsed;
      } catch {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const jsonSlice =
          firstBrace !== -1 && lastBrace !== -1
            ? cleaned.slice(firstBrace, lastBrace + 1)
            : cleaned;
        return JSON.parse(jsonSlice) as GeneratedContent;
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('所有可用模型均嘗試完畢，請稍候重試。');
}

