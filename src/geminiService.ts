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

#社群經營 #IG經營 #自媒體行銷 #圖文排版 #視覺設計 #行銷乾貨 #Canva教學 #個人品牌`,
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
  ctaDetail?: string
): Promise<GeneratedContent> {
  const goal = CTA_GOALS.find((g) => g.id === ctaGoal) ?? CTA_GOALS[0];

  const prompt = `
你是一位頂級的 Instagram 社群內容總監與視覺文案專家。
請根據以下課程/主題資訊，為 Instagram 設計「4 張 1:1 輪播圖（Carousel）」的精準卡片文案，以及一篇「發在 Instagram 的高轉化爆款發文文案（Caption）」。

【課程主題】：${topic}
【目標受眾】：${audience || '一般對此主題有興趣的社群學員/大眾'}
【核心價值/想傳達重點】：${keyTakeaways || '實戰乾貨、解決核心痛點、吸引報名或互動'}

【行動呼籲（CTA）目標】：${goal.label}
- 方向說明：${goal.prompt}
- 使用者補充細節：${ctaDetail?.trim() || '（未提供，請依主題自行合理設計，不要編造具體價格、日期或名額）'}
- 第 4 張圖的 ctaButton、footnote，以及貼文結尾的 CTA，都必須圍繞此目標，三者保持一致。

【極致精簡原則（重要！不可遮擋背景照片）】：
- 標題（title）：12 字以內短語，可加換行符號 \\n。
- 副標題（subtitle）：15 字以內短句。
- 條列要點（bulletPoints）：每點必須極致精簡在 6~12 字以內（短語即可，例如「手臂過度用力代償」、「骨盆未正導致晃動」），嚴禁長篇大論！
- CTA 按鈕（ctaButton）：12 字以內短語。

【4 張輪播圖結構要求】：
- Slide 1 (封面 Hook)：爆款吸睛大標題（10~14字）、好奇副標、亮點標籤。
- Slide 2 (痛點共鳴)：點出學員目前常犯的 3 個盲點，條列 3 點極短 bulletPoints。
- Slide 3 (核心解法)：介紹 3 大關鍵技巧/價值，條列 3 點極短 bulletPoints。
- Slide 4 (行動呼籲 CTA)：依上述 CTA 目標，提供極簡 ctaButton 文字。


【IG 發文貼文 (caption) 要求】：
- 具有吸引人的前 2~3 行鉤子標題（防止被截斷）
- 豐富的 Emoji 與清晰換行分段
- 條列式整理貼文重點
- 結尾使用上述 CTA 目標的引導方式，並搭配收藏或留言的互動提醒
- 8~12 個精準繁體中文與熱門社群 Hashtags。

【輸出格式】：
你必須「只」回傳標準的 JSON 格式字串，不要包含額外的 Markdown 標籤或解釋，格式如下：
{
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

  // 優先嘗試使用 Vercel 後端安全代理端點 /api/generate
  // 這樣前端完全不需要持有 API Key，且跨裝置通用！
  try {
    const proxyRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        accessCode: apiKey.trim(), // 可以當作自訂通行密碼
      }),
    });

    if (proxyRes.ok) {
      const parsed = (await proxyRes.json()) as GeneratedContent;
      return parsed;
    } else if (proxyRes.status !== 404 && proxyRes.status !== 500) {
      // 若後端有回應（如密碼錯誤 401 或參數錯誤），直接回報訊息
      const errData = await proxyRes.json().catch(() => ({}));
      if (errData.error && !errData.error.includes('GEMINI_API_KEY')) {
        throw new Error(errData.error);
      }
    }
  } catch (err: any) {
    // 若不是 404 / 服務未佈署，而是特定業務錯誤，直接拋出
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // 若後端未設定環境變數或本地開發環境，則使用前端直接連線（需提供 API Key）
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      '請輸入 Google Gemini API Key 或通行密碼。若是透過 Vercel 部署，請確認已在 Vercel 後台設定 GEMINI_API_KEY 環境變數。'
    );
  }

  const cleanKey = apiKey.trim();

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

  // 依序嘗試的模型清單（移除已失效的 gemini-2.5-pro，加入最新可用模型）
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview',
    'gemini-2.0-flash',
    'gemma-4-26b-a4b-it',
  ].filter((m) => availableModels.includes(m) || m === 'gemini-3.8-flash');

  const modelsToTry = candidateModels.length > 0 ? candidateModels : availableModels;

  let lastError: any = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
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
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as GeneratedContent;
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('所有可用模型均嘗試完畢，請稍候重試。');
}

