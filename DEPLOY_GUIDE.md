# 門市店務管理系統 - Cloudflare Pages 部署保姆級教學

本指南將手把手教您如何將本專案（React + Vite 前端 SPA）免費部署至 **Cloudflare Pages** 平台，並與您的 Google 試算表 (GAS) 進行雲端連動。

---

## 🛠️ 事前準備
在開始部署之前，請確保您已擁有以下帳號：
1. **GitHub 帳號**：用於託管與同步您的程式碼。[點此註冊 GitHub](https://github.com/)。
2. **Cloudflare 帳號**：用於部署網頁與提供全球 CDN 加速。[點此註冊 Cloudflare](https://dash.cloudflare.com/sign-up)。
3. **本機安裝 Git**：若您未安裝，請下載並安裝 [Git](https://git-scm.com/)。

---

## 📂 第一階段：將專案程式碼上傳至 GitHub 私人倉庫

為了保護門市系統的內部程式碼與預設帳密，**強烈建議將 GitHub 倉庫設定為「Private (私人)」**。

### 步驟 1：在 GitHub 建立新倉庫 (Repository)
1. 登入 GitHub，點擊右上角的 **「+」** 號，選擇 **「New repository」**。
2. 設定項目：
   * **Repository name**：輸入您的專案名稱（例如 `store-management-system`）。
   * **Public/Private**：務必選取 **「Private」**（私人，僅您自己與授權人員可見）。
   * **Initialize this repository with**：下方的 Readme、gitignore 等選項**全部保持「不勾選」**。
3. 點擊最下方的 **「Create repository」**。
4. 建立後，畫面會顯示該倉庫的 Git 連接網址，請複製它（格式如：`https://github.com/您的帳號/專案名稱.git`）。

### 步驟 2：在本機專案資料夾初始化並推送 Git
請在 Windows 開啟 **PowerShell** 或 **Command Prompt (CMD)**，並切換至您的專案根目錄 `C:\Users\serap\Downloads\門市管理任務`（或在該資料夾空白處點擊右鍵選擇「在終端機中開啟」），依序執行以下指令：

```bash
# 1. 初始化 Git 儲存庫
git init

# 2. 將所有檔案加入暫存區
git add .

# 3. 提交至本機版本庫
git commit -m "Initialize store management system with CF configuration"

# 4. 強制將預設分支更名為 main
git branch -M main

# 5. 連接本機 Git 與您剛建立的 GitHub 遠端倉庫 (請替換為您在步驟 1 複製的網址)
git remote add origin https://github.com/您的帳號/專案名稱.git

# 6. 將程式碼推送到 GitHub
git push -u origin main
```
*(推送時若瀏覽器跳出 GitHub 登入驗證，請依提示點擊同意授權即可。)*

---

## ☁️ 第二階段：在 Cloudflare Pages 進行連結與部署

當您的程式碼安全地上傳至 GitHub 後，就可以讓 Cloudflare Pages 抓取並自動建置。

### 步驟 1：進入 Cloudflare Pages 頁面
1. 登入 [Cloudflare 儀表板](https://dash.cloudflare.com/)。
2. 點擊左側導航列的 **「Workers & Pages」**。
3. 點選頁面中的 **「Create a project」** (建立專案)，然後切換到 **「Pages」** 標籤頁。
4. 點選 **「Connect to Git」** (連接到 Git) 按鈕。

### 步驟 2：連接 GitHub 與選擇專案
1. 點擊 **「Connect GitHub」**，在彈出的授權視窗中點擊同意授權，讓 Cloudflare 讀取您的 GitHub 倉庫。
2. 在倉庫列表中，選取您剛才上傳的 **私人儲存庫**（如：`store-management-system`）。
3. 點擊 **「Begin setup」** (開始設定)。

### 步驟 3：設定建置與編譯參數
在設定設定畫面中，請進行以下欄位的確認與設定：
* **Project name**：Cloudflare 預設會帶入您的 GitHub 專案名。此名稱會決定您免費網址的開頭（例如：`https://[project-name].pages.dev`）。
* **Production branch**：確認為 `main`。
* **Framework preset (框架預設值)**：請在下拉選單中選擇 **`Vite`**。
* **Build command (建置指令)**：確認為 **`npm run build`**。
* **Build output directory (輸出目錄)**：確認為 **`dist`**。
* **Environment variables (環境變數)**：保持空白，不需要新增。

### 步驟 4：儲存並開始部署
1. 確認無誤後，點選最下方的 **「Save and Deploy」** (儲存並部署)。
2. Cloudflare 會開始在雲端下載專案、安裝依賴套件（npm install）並進行編譯打包。這個過程大約需要 1~2 分鐘。
3. 建置成功後，您會看到綠色的成功勾勾，以及 Cloudflare 分配給您的專屬免費 HTTPS 網址（例如：`https://store-management.pages.dev`）。
4. 點擊網址，即可在手機或電腦瀏覽器中開啟您的門市店務管理系統！

---

## 🔗 第三階段：連動 Google 試算表 API

由於本系統的同步網址是在前端的「設定」中彈性管理的，因此部署後您不需在 Cloudflare Pages 後台做任何設定：

1. 開啟 Cloudflare 部署完成的網頁連結。
2. 點選網頁右下角（或右上角）的 **「設定」** 按鈕。
3. 登入您的超級管理員帳號（如預設的 `文和`）。
4. 在 **「Google 試算表資料同步」** 區塊中：
   * 貼上您之前部署好的 **Google Apps Script Web App URL**（格式為 `https://script.google.com/macros/s/.../exec`）。
   * 點選 **「儲存 API 設定」**。
5. 點選 **「一鍵同步至 Google」**，本機的測試訂單與任務資料就會立刻寫入您的雲端 Google 試算表中！

---

## 🌐 第四階段 (選用)：綁定自訂網域

如果您有自己的專屬網域（例如 `store.mycompany.com`），可以在 Cloudflare Pages 中進行對接：
1. 在專案的 Page 儀表板中，點選 **「Custom domains」** (自訂網域) 標籤。
2. 點選 **「Set up a custom domain」**。
3. 輸入您的網域（例如 `store.mycompany.com`），點選繼續。
4. 如果您的網域託管在 Cloudflare，系統會自動為您新增 DNS 紀錄；若在其他平台（如 Godaddy），請依提示前往該平台新增一筆 CNAME 紀錄指向您的 `xxx.pages.dev`。
5. 綁定成功後，Cloudflare 會自動為您的自訂網域核發 SSL 安全憑證，即可用您自己的網域安全瀏覽！

---

## 🔄 日後如何更新網頁？
* 未來您若對程式碼做了修改（例如微調了界面文字、新增了金句等）：
  1. 在本機專案資料夾執行 `git add .`、`git commit -m "微調內容"`。
  2. 執行 `git push` 推送至 GitHub。
  3. Cloudflare Pages 偵測到 GitHub 有新提交，就會在**背景自動啟動編譯與重新部署**，約 1 分鐘後，所有門市人員的網頁就會無痛自動更新為最新版！
