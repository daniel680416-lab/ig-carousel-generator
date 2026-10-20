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

    // 僅在點擊「測試」按鈕時才查詢模型清單，避免每次生成都多花一次網路請求時間
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

    // 僅使用反應快速的 Flash 模型，避免因切換至慢速 Pro 模型而觸發 Vercel 超時
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash'];

    let lastError: any = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const modelController = new AbortController();
      // 給予單一模型充足的 48 秒生成時間，避免在 25 秒時被提早切斷並重試導致總時間超過 55 秒
      const modelTimeout = setTimeout(() => modelController.abort(), 48000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: modelController.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
        });
        clearTimeout(modelTimeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          lastError = new Error(`[${model}] ${errMsg}`);
          // 若為 404 (模型不存在) 才嘗試下一個候選模型；若是其他錯誤則直接跳出回報
          if (response.status === 404) {
            continue;
          }
          break;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error(`[${model}] 未回傳內容`);
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        // 成功取得結果並回傳給前端
        res.status(200).json(parsed);
        return;
      } catch (err: any) {
        clearTimeout(modelTimeout);
        if (err.name === 'AbortError') {
          lastError = new Error(`[${model}] AI 運算超過 48 秒未回應，請再試一次。`);
          // 已經耗時 48 秒，不可再進入下一個迴圈，否則必超過 Vercel 60 秒限制
          break;
        }
        lastError = err;
        break;
      }
    }

    res.status(502).json({
      error: lastError?.message || 'AI 伺服器忙碌中，請稍候重試。',
    });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
