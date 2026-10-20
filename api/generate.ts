import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { prompt, accessCode, action, model: requestedModel } = req.body || {};

    // 檢查通行密碼（若環境變數有設置 ACCESS_CODE，則進行核對）
    const serverAccessCode = process.env.ACCESS_CODE;
    if (serverAccessCode && serverAccessCode.trim() !== '') {
      if (!accessCode || accessCode.trim() !== serverAccessCode.trim()) {
        res.status(401).json({ error: '通行密碼錯誤，請確認輸入正確的通行密碼。', fatal: true });
        return;
      }
    }

    // 取得伺服器環境變數中的 GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: '伺服器未設定 GEMINI_API_KEY 環境變數，請在 Vercel 後台完成設置。',
        fatal: true,
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
          .slice(0, 8)
          .join(', ');
        res.status(200).json({
          ok: true,
          models: availableModels,
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
      res.status(400).json({ error: 'Prompt is required', fatal: true });
      return;
    }

    // 每次請求專注執行單一指定模型，享有完整 48 秒獨立執行時間，不被前序失敗模型瓜分時間
    const model = typeof requestedModel === 'string' && requestedModel.trim()
      ? requestedModel.trim()
      : 'gemini-3.8-flash';
    const jsonMode = !model.startsWith('gemma');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
    const modelController = new AbortController();
    const modelTimeout = setTimeout(() => modelController.abort(), 48000);

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
        const isAuthError =
          response.status === 403 ||
          (response.status === 400 && errMsg.toLowerCase().includes('api key'));

        res.status(response.status).json({
          error: `[${model}] ${errMsg}`,
          status: response.status,
          fatal: isAuthError,
        });
        return;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        res.status(502).json({
          error: `[${model}] 模型未回傳文字內容`,
        });
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const jsonSlice =
          firstBrace !== -1 && lastBrace !== -1
            ? cleaned.slice(firstBrace, lastBrace + 1)
            : cleaned;
        parsed = JSON.parse(jsonSlice);
      }

      res.status(200).json(parsed);
      return;
    } catch (err: any) {
      clearTimeout(modelTimeout);
      if (err.name === 'AbortError') {
        res.status(504).json({
          error: `[${model}] 回應超過 48 秒超時`,
        });
        return;
      }
      res.status(502).json({
        error: `[${model}] ${err.message || '網路請求異常'}`,
      });
      return;
    }
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
