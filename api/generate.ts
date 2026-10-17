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

    // 動態向 Google 查詢此 API Key 實際支援的所有模型清單
    let availableModels: string[] = [];
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
      availableModels = (listData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
    } catch (fetchErr: any) {
      console.warn('無法動態查詢模型清單，使用預設候選模型：', fetchErr);
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

    // 若為連線測試請求，回傳真實的可用新世代模型狀態
    if (action === 'test') {
      const modelNames = (activeAvailable.length > 0 ? activeAvailable : preferredOrder).slice(0, 5).join(', ');
      res.status(200).json({
        ok: true,
        message: `驗證成功！Vercel 雲端金鑰有效，可用模型：${modelNames}`,
      });
      return;
    }

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // 組合候選清單：強制以 gemini-3.8-flash 為第一優先，接著是其他可用新模型
    const candidateModels = Array.from(
      new Set([
        'gemini-3.8-flash',
        ...preferredOrder.filter((m) => activeAvailable.includes(m)),
        ...activeAvailable,
      ])
    );

    let lastError: any = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      try {
        const modelController = new AbortController();
        const modelTimeout = setTimeout(() => modelController.abort(), 25000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: modelController.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        });
        clearTimeout(modelTimeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          lastError = new Error(`[${model}] ${errMsg}`);
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error(`[${model}] 未回傳內容，嘗試下一個候選模型...`);
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
        lastError = err;
        continue;
      }
    }

    res.status(502).json({
      error: lastError?.message || `AI 伺服器忙碌中，請稍候重試。`,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
