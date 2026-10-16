# IG 圖文輪播模板產生器 - Vercel 部署指南

本專案已完整支援 **Vercel Serverless Architecture**：
- 您的 `GEMINI_API_KEY` 永遠保存在 Vercel 雲端後台，前端瀏覽器看不到金鑰。
- 手機、平板或電腦打開專屬網址**完全免輸入 API Key**！
- 支援選填自訂「通行密碼（Access Code）」，防止他人未經授權使用您的額度。

---

## 3 步驟完成 Vercel 部署（完全免費）

### 步驟 1：推送到 GitHub
1. 在 [GitHub](https://github.com/new) 建立一個新的專案儲存庫（Repository，例如 `ig-carousel-generator`）。
2. 在本機專案目錄下執行以下指令推送到 GitHub：
```bash
git init
git add .
git commit -m "feat: complete ig carousel generator with vercel serverless"
git branch -M main
git remote add origin https://github.com/<您的GitHub帳號>/<專案名稱>.git
git push -u origin main
```

---

### 步驟 2：在 Vercel 匯入專案
1. 前往 [Vercel 官網](https://vercel.com/)，使用您的 GitHub 帳號登入（若無帳號可免費註冊）。
2. 點擊右上角 **「Add New...」 ➔ 「Project」**。
3. 找到剛才建立的 GitHub Repository，點擊 **「Import」**。

---

### 步驟 3：設定環境變數（藏 Key 的關鍵！）
在 Deploy 畫面中，展開 **「Environment Variables」** 區塊，加入以下環境變數：

| 變數名稱 (Key) | 變數值 (Value) | 說明 |
| :--- | :--- | :--- |
| **`GEMINI_API_KEY`** | `AIzaSy...`（您的 Google Key） | **必填**。後端安全呼叫用，絕不外洩。 |
| **`ACCESS_CODE`** | 例如 `8888` 或自訂密碼 | **選填**。若填寫，則在網頁端需輸入此密碼才能生成，防止他人盜用。 |

設定完成後，點擊 **「Deploy」**！大約 1 分鐘內就會部署完成，並獲得一個官方提供的專屬網址（例如 `https://your-project.vercel.app`）。

---

## 跨裝置使用方式
- 在手機或電腦瀏覽器打開您的 Vercel 網址。
- 如果有設定 `ACCESS_CODE`，只需在「通行密碼」欄位輸入一次該密碼即可（系統會自動記在該裝置）。
- 現在就可以直接上傳照片、選擇 CTA 目標，點擊「一鍵產生」，高畫質輪播圖與文案即時出爐！
