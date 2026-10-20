import type { VercelRequest, VercelResponse } from '@vercel/node';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 處理 CORS（允許跨網域存取與 Preflight 請求）
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { prompt, accessCode, action } = req.body || {};

    // 檢查通行密碼（若環境變數有設置 ACCESS_CODE，則進行核對）
    const serverAccessCode = process.env.ACCESS_CODE;
    if (serverAccessCode && serverAccessCode.trim() !== '') {
      if (!accessCode || accessCode.trim() !== serverAccessCode.trim()) {
        res.status(401).json({ error: '通行密碼錯誤，請確認輸入正確的通行密碼。' });
        return;
      }
    }

    // 取得伺服器環境變數中的 GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: '伺服器未設定 GEMINI_API_KEY 環境變數，請在 Vercel 後台完成設置。',
      });
      return;
    }

    const cleanKey = apiKey.trim();

    // 僅在點擊「測試」按鈕時才查詢模型清單
    if (action === 'test') {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
        );
        const listData = await listRes.json();
        if (!listRes.ok) {
          res.status(400).json({
            error: `Google API 金鑰驗證失敗：${listData.error?.message || listRes.statusText}`,
          });
          return;
        }
        const availableModels = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''))
          .filter((m: string) => !m.includes('1.5') && !m.includes('2.0') && !m.includes('2.5'));

        const modelNames = (availableModels.length > 0 ? availableModels : ['gemini-3.8-flash'])
          .slice(0, 5)
          .join(', ');
        res.status(200).json({
          ok: true,
          message: `驗證成功！Vercel 雲端金鑰有效，可用模型：${modelNames}`,
        });
        return;
      } catch (fetchErr: any) {
        res.status(500).json({
          error: `連線測試失敗：${fetchErr.message || '無法連線至 Google API'}`,
        });
        return;
      }
    }

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // 定義重試與備援順序：
    // 1. gemini-3.8-flash (主力極速模型)
    // 2. 若遇 503 High Demand 尖峰壅塞，等待 1.2 秒後自動重試一次 gemini-3.8-flash
    // 3. 自動切換備援模型：gemini-3.1-pro-preview ➔ gemma-4-26b-a4b-it
    const attempts = [
      { model: 'gemini-3.8-flash', delayMs: 0, jsonMode: true },
      { model: 'gemini-3.8-flash', delayMs: 1200, jsonMode: true },
      { model: 'gemini-3.1-pro-preview', delayMs: 0, jsonMode: true },
      { model: 'gemma-4-26b-a4b-it', delayMs: 0, jsonMode: false },
    ];

    const startTime = Date.now();
    const TOTAL_BUDGET_MS = 52000; // 控制總時間在 52 秒內（小於 Vercel 60s 與前端 65s）
    let lastError: any = null;

    for (const attempt of attempts) {
      const elapsed = Date.now() - startTime;
      const remainingMs = TOTAL_BUDGET_MS - elapsed;
      if (remainingMs < 6000) {
        break; // 剩餘時間不足時不再發起新請求，直接回報最後錯誤
      }

      if (attempt.delayMs > 0) {
        await sleep(attempt.delayMs);
      }

      const { model, jsonMode } = attempt;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const modelController = new AbortController();
      // 單次請求最多等待 32 秒（且不超過總剩餘時間）
      const perAttemptTimeout = Math.min(32000, remainingMs - 500);
      const modelTimeout = setTimeout(() => modelController.abort(), perAttemptTimeout);

      try {
        const generationConfig: Record<string, any> = {
          temperature: 0.7,
        };
        if (jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: modelController.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        });
        clearTimeout(modelTimeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          lastError = new Error(`[${model}] ${errMsg}`);

          // 若是金鑰無效 (400 API key not valid / 403)，無須重試其他模型，直接跳出
          if (
            response.status === 403 ||
            (response.status === 400 && errMsg.toLowerCase().includes('api key'))
          ) {
            break;
          }
          // 若是 503 (High demand 尖峰壅塞)、429 (頻率限制)、404 (模型未開通) 或 500，繼續自動嘗試下一個備援！
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error(`[${model}] 未回傳內容，嘗試下一個備援模型...`);
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          // 清理可能包裹的 Markdown ```json 標籤或前後雜訊
          const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          const jsonSlice =
            firstBrace !== -1 && lastBrace !== -1
              ? cleaned.slice(firstBrace, lastBrace + 1)
              : cleaned;
          parsed = JSON.parse(jsonSlice);
        }

        // 成功取得結果並回傳給前端
        res.status(200).json(parsed);
        return;
      } catch (err: any) {
        clearTimeout(modelTimeout);
        if (err.name === 'AbortError') {
          lastError = new Error(`[${model}] 單次請求超時，正嘗試備援通道...`);
          continue;
        }
        lastError = err;
        continue;
      }
    }

    res.status(502).json({
      error:
        lastError?.message ||
        'Google AI 伺服器目前處於流量尖峰（High Demand），請稍候幾秒再重試一次。',
    });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
