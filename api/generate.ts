import type { VercelRequest, VercelResponse } from '@vercel/node';

function parseJsonContent(text: string) {
  let parsed: any;
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

  // 格式正規化：若受眾或重點為陣列，自動轉為頓號分隔的字串
  if (Array.isArray(parsed.analyzedAudience)) {
    parsed.analyzedAudience = parsed.analyzedAudience.join('、');
  }
  if (Array.isArray(parsed.analyzedKeyTakeaways)) {
    parsed.analyzedKeyTakeaways = parsed.analyzedKeyTakeaways.join('、');
  }
  return parsed;
}

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
    const { prompt, accessCode, action, provider = 'groq', model: requestedModel } = req.body || {};

    // 檢查自訂通行密碼（若環境變數有設置 ACCESS_CODE 且未直接帶入金鑰，則進行核對）
    const serverAccessCode = process.env.ACCESS_CODE;
    if (serverAccessCode && serverAccessCode.trim() !== '') {
      const code = typeof accessCode === 'string' ? accessCode.trim() : '';
      const isDirectKey = code.startsWith('gsk_') || code.startsWith('AIzaSy');
      if (!isDirectKey && code !== serverAccessCode.trim()) {
        res.status(401).json({ error: '通行密碼錯誤，請確認輸入正確的通行密碼。', fatal: true });
        return;
      }
    }

    // 1. Groq 金鑰解析（優先讀取 Vercel 環境變數 GROQ_API_KEY，或使用者在前台欄位填寫的 gsk_ 金鑰）
    const groqKey = (
      process.env.GROQ_API_KEY ||
      (typeof accessCode === 'string' && accessCode.startsWith('gsk_') ? accessCode.trim() : '')
    ).trim();

    // 2. Google Gemini 金鑰解析
    const geminiKey = (
      process.env.GEMINI_API_KEY ||
      (typeof accessCode === 'string' && accessCode.startsWith('AIzaSy') ? accessCode.trim() : '')
    ).trim();

    // 若為連線測試請求
    if (action === 'test') {
      const testResults: string[] = [];

      // 測試 Groq
      if (groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${groqKey}` },
          });
          if (groqRes.ok) {
            testResults.push('⚡ Groq 極速晶片引擎（qwen/qwen3.8-27b，約 1 秒生成、零塞車）已就緒');
          }
        } catch {
          /* ignore */
        }
      }

      // 測試 Google Gemini
      if (geminiKey) {
        try {
          const listRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
          );
          if (listRes.ok) {
            testResults.push('🪐 Google Gemini 備援引擎已就緒');
          }
        } catch {
          /* ignore */
        }
      }

      if (testResults.length > 0) {
        res.status(200).json({
          ok: true,
          message: `檢測成功！已啟用雙引擎加速模式：\n${testResults.join('\n')}`,
        });
        return;
      }

      res.status(400).json({
        error: '未檢測到有效的 Groq 或 Gemini API Key，請檢查環境變數設置。',
      });
      return;
    }

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required', fatal: true });
      return;
    }

    // ==========================================
    // 引擎 A: Groq 極速晶片通道 (預設優先，1~2 秒產出且不塞車)
    // ==========================================
    if (provider === 'groq' && groqKey) {
      const model = requestedModel || 'qwen/qwen3.8-27b';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 秒安全超時

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  '你是一位頂級的 Instagram 社群內容總監與視覺文案專家。嚴格只輸出繁體中文標準 JSON，不要包含任何開頭或結尾的解釋文字。',
              },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          res.status(response.status).json({
            error: `[Groq ${model}] ${errMsg}`,
            provider: 'groq',
          });
          return;
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          res.status(502).json({ error: '[Groq] 模型未回傳文字內容', provider: 'groq' });
          return;
        }

        const parsed = parseJsonContent(text);
        res.status(200).json(parsed);
        return;
      } catch (err: any) {
        clearTimeout(timeoutId);
        res.status(502).json({
          error: `[Groq ${model}] ${err.name === 'AbortError' ? '請求超時' : err.message || '連線異常'}`,
          provider: 'groq',
        });
        return;
      }
    }

    // ==========================================
    // 引擎 B: Google Gemini 官方通道 (備援通道)
    // ==========================================
    if (!geminiKey) {
      res.status(500).json({
        error: 'Groq 請求未完成且尚未配置 GEMINI_API_KEY 作為備援。',
        fatal: true,
      });
      return;
    }

    const model = requestedModel || 'gemini-3.8-flash';
    const jsonMode = !model.startsWith('gemma');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const modelController = new AbortController();
    const modelTimeout = setTimeout(() => modelController.abort(), 45000);

    try {
      const generationConfig: Record<string, any> = { temperature: 0.7 };
      if (jsonMode) generationConfig.responseMimeType = 'application/json';

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
        res.status(response.status).json({
          error: `[Gemini ${model}] ${errMsg}`,
          provider: 'gemini',
        });
        return;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        res.status(502).json({ error: `[Gemini ${model}] 模型未回傳文字內容`, provider: 'gemini' });
        return;
      }

      const parsed = parseJsonContent(text);
      res.status(200).json(parsed);
      return;
    } catch (err: any) {
      clearTimeout(modelTimeout);
      res.status(502).json({
        error: `[Gemini ${model}] ${err.name === 'AbortError' ? '請求超時' : err.message || '連線異常'}`,
        provider: 'gemini',
      });
      return;
    }
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
