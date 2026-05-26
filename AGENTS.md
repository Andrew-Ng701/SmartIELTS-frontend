# SmartIELTS Frontend API Workspace Agents Guide

本文件是 `C:\SmartIELTS-frontend(api)` 的前端 API 對接工作區規則。`C:\SmartIELTS-frontend` 保留作備份與參考來源；後續 API 對接、package 拆分與正式 integration 工作預設只在 `C:\SmartIELTS-frontend(api)` 進行。處理任何任務前，優先閱讀本文件；若本文件與全局偏好衝突，以本文件為準。

## 專案定位

- 這是 SmartIELTS 的 React single-page frontend，使用 Vite 7、React 19、TypeScript 5.8、Tailwind CSS v4。
- 目前前端仍以既有 UI prototype 為 baseline，主要畫面仍保留在 `src/App.tsx` 與 `src/styles.css`，但新工作區已開始建立 API 對接骨架。
- 已新增 `src/api`、`src/contracts`、`src/app`、`src/features`、`src/components`、`src/hooks`、`src/lib`、`src/types` 的分層目錄；現有 UI 行為暫時不因骨架建立而改變。
- 目前尚未接入正式 router、form library 或 test runner。
- 目前 UI 是英文 showcase prototype，使用本地 state 模擬頁面切換、登入狀態、role preview、profile avatar preview、IELTS target bands、records actions、admin authoring flows、AI Agent drawer 與 Speaking D-ID iframe 狀態。
- 此 API workspace 已明確進入逐步對接 backend 階段。除非使用者要求維持 UI-only，涉及 auth、console、records、profile、module flows、upload 或 dashboard-agent 的新需求可使用 `src/api` 與 `src/contracts` 的 typed API layer 實作。
- 現有 `src/App.tsx` prototype 尚未全面改為真實 API data flow；拆分時必須逐步搬移，避免一次重寫全部頁面。
- 用戶端 UI 與管理端 UI 必須完全分開：USER-facing pages 只呈現學生練習、個人資料、記錄與學習 console；ADMIN-facing pages 只呈現管理台、用戶管理、內容管理、records 管理與營運 overview。不要把 admin 操作入口混入一般用戶流程，也不要把 user practice flow 放進 admin console。
- 前端概覽文件位於 `docs/frontend/frontend-overview.md`。若改動會影響未來開發者快速理解專案，必須同步更新該文件。
- 目前 Speaking D-ID examiner 使用 Vite public 靜態頁 `public/did-speaking-frame.html`，由 React iframe 載入 `/did-speaking-frame.html`；不要改回 `srcdoc`、`blob:`、`data:`、`file:` 或 React-rendered frame，避免 D-ID allowed domain 出現 `origin null` 或受 React StrictMode 影響。

## 預設查閱順序

1. 先讀本文件，確認專案規則與安全限制。
2. 讀根目錄 `api-contract.md - 快捷方式.lnk` 指向的 API contract。此文件與 `AGENTS.md` 同為重點文件；規劃修改、找 bug、判斷前後端責任或實作 API 對接前，都必須提前觀看。此 contract 屬於後端權威文件，前端工作區只能瀏覽與引用，不得直接修改；若發現內容錯誤、過期或與實際 API 行為不一致，必須提醒使用者並重點說明。
3. 讀 `docs/frontend/frontend-overview.md`，確認目前架構、UI 狀態、API 邊界與已知缺口。
4. 讀任務直接相關檔案，例如 `src/App.tsx`、`src/styles.css`、`vite.config.ts`、`package.json`。
5. 只有在資訊缺失、可能過期、風險較高或查源碼更有效率時，才擴大搜尋範圍。

## 語言與協作

- 除非使用者明確要求其他語言，回覆、文件、說明與註解優先使用繁體中文。
- 技術名詞、API field、TypeScript symbol、套件名、命令、檔案路徑與錯誤訊息可以保留英文。
- UI visible copy 目前以英文為主；不要因為協作語言是中文就把產品介面文案改回中文。
- 回覆要直接說明做了什麼、驗證了什麼、還有什麼風險；避免空泛描述。

## 工作原則

- Think Before Coding：不要默默假設需求。若有不確定之處，必須明確說出假設、列出可能解讀，必要時先詢問；若較簡單的做法已足夠，應主動說明取捨；若資訊不足到無法可靠前進，應停止並指出不清楚之處。
- Simplicity First：使用能解決問題的最小程式碼。不要加入未被要求的功能、單次使用的抽象、 speculative flexibility/configurability，或處理不可能情境的 error handling；若 200 行可合理縮成 50 行，應優先簡化。
- Surgical Changes：只改必要範圍。不要順手改善相鄰程式碼、註解或格式；不要重構未壞掉的部分；維持既有風格。若本次變更造成 unused import、variable 或 function，應清理自己造成的 orphan；既有 unrelated dead code 只需提及，不要刪除。
- Goal-Driven Execution：把任務轉成可驗證目標。修 bug 時先定義可重現或可驗證的檢查；新增 validation 時以 invalid input 測試或等效檢查作為成功標準；多步驟任務需簡短列出每步與驗證方式，並持續執行到驗證完成。

## 命名規則

- React component 使用 `UpperCamelCase`，例如 `LoginPage`、`ReadingSessionPanel`。
- TypeScript type、interface、enum 使用 `UpperCamelCase`。
- function、parameter、local variable、object field、React props、state value 使用 `lowerCamelCase`。
- React hook 使用 `useXxx`。
- 共用字串常量使用 `UPPER_SNAKE_CASE`，特別是 literal key、status、route path、storage key、request name、cache key、API label。
- 環境變數使用 `VITE_UPPER_SNAKE_CASE`。
- 不要只為了前端命名風格而修改後端 DTO/VO 欄位、request parameter、response field 或 status value。
- 除非任務明確包含 mapping 或 migration，外部 API contract 必須保持後端原始欄位。

## 前後端職責

- 前端負責顯示、輸入收集、本地互動狀態、表單體驗、上傳體驗、路由、使用者回饋與 request orchestration。
- 後端負責驗證輸入、權限規則、評分、持久化、transaction consistency、跨 entity 推導與 server-owned value。
- 前端只應傳送後端完成動作所需的關鍵資料。
- 不要為了少打一個 API、修補後端缺口或加快 demo，把核心業務規則搬到 client。
- `id`、`userId`、timestamp、ownership、score、status transition、AI result、`tokenVersion` 預設視為 backend-owned。
- 前端可以做輕量 UX validation，但最終驗證、權限與狀態轉移仍以後端為準。

## 架構與檔案組織

- 優先跟隨現有 pattern、helper、component style、feature boundary 與 API response shape。
- 修改範圍要貼近需求，避免大範圍 rename、無關格式化或順手重構。
- 新增共用抽象前，先確認至少兩個以上實際使用點，或能明確降低複雜度。
- 目前 `src/App.tsx` 是單檔 prototype；在正式功能擴張時，優先逐步拆成 feature-owned modules。
- 建議未來結構：
  - `src/app`: app bootstrap、route constants、navigation constants、global shell
  - `src/api`: API client、endpoint wrappers、shared request/response helpers
  - `src/contracts`: backend DTO/query/VO contracts，保留 backend 原始欄位名稱
  - `src/features/auth`: login、register、logout、password change、auth session state
  - `src/features/user`: USER-facing console、profile、records 與四科 practice flows
  - `src/features/admin`: ADMIN-facing console、users、records 與四科 management flows
  - `src/features/dashboard-agent`: `/api/smartielts/dashboard/**` AI ask、preload 與 SSE
  - `src/components`: 非 feature-owned 的共用 UI
  - `src/hooks`: shared React hooks
  - `src/lib`: small framework-agnostic helpers
  - `src/types`: 多個 feature 共用的 TypeScript contracts
- feature-owned component、hook、type 應先留在 feature folder；只有真的跨兩個以上 feature 使用時才提升為共用。
- USER / ADMIN page-level flow 必須留在各自 feature tree；只有小型視覺元件、純工具或明確共用 contract 才能提升到 `components`、`lib`、`types` 或 `contracts`。

## React 與 TypeScript

- 優先使用 function components 與 hooks。
- component props 應保持明確型別；避免用 `any` 掩蓋資料形狀不清。
- server contract type 與 view model 要分開；需要 UI 專用 shape 時，用 mapper 明確轉換。
- local state 應貼近使用位置；不要過早引入 global state。
- 表單、drawer、dropdown、modal、upload preview 等 UI state 可以先用 component state 管理。
- 有副作用的邏輯要集中在 hook 或 feature service，避免散落在多個 component handler。
- 不要在 render path 做昂貴計算或造成不穩定 reference；必要時使用 `useMemo` / `useCallback`，但不要過度使用。

## UI 與樣式

- 目前 UI 是明亮教育平台風格的英文 prototype，參考 `WorldCourse` 模板節奏。
- 此 API workspace 已進入分階段真實 API 對接；新增或修正 auth、profile、console、records、admin content、module practice、upload 或 dashboard-agent 時，優先使用 `src/api` 與 `src/contracts`。仍未接入的 prototype flow 才維持 local state/mock preview。
- 用戶端與管理端頁面在 navigation、layout、copy、mock data 與 action 表現上都要清楚分離。User Console 與 Admin Console 可以共用小型視覺元件，但不能共用會模糊身份邊界的 page-level flow。
- 保持現有視覺方向：暖白 header、橘色 hover/active accents、module showcase、exam/dashboard-oriented stats、admin introduction、footer、floating AI Agent drawer。
- Home 只做品牌與功能展示，不放實際 Dashboard、Records、FAQ sections 或 user testimonials；Header 維持網站式導覽，ADMIN 登入後進入獨立 Admin Console header，不顯示學生端導覽。
- Dashboard 是 API-backed User Console，使用 `/api/user/console` 顯示 profile snapshot、active/deleted records、overall average、四科 target bands、module stats、score radar、score trend、module activity 與 insights；不得加入 admin 入口。
- Auth 在 API workspace 採用 API-first hybrid flow：一般 email/password 會呼叫 `/api/auth/login` 或 `/api/auth/register`，成功後保存 JWT session；email 輸入 `user` 或 `admin` 仍保留本地 preview fallback，方便後端未啟動時檢視 User Dashboard 或 Admin Console。這仍不是正式 router guard。
- Records 是 user-facing records hub，使用 unified `/api/user/records` 支援 active/deleted view、module、status、time/score sort filters、detail、delete 與 restore。
- Profile 由 avatar dropdown 進入，透過 `/api/user/profile` 管理 account details、display name 與 Reading/Listening/Writing/Speaking target bands；profile picture 使用 multipart `/api/user/profile-picture`。Settings Change password 呼叫 `PUT /api/auth/password`，成功後清除 session。
- Admin Console 是 API-backed admin-facing prototype，包含 Overview、Users、Records、Reading、Listening、Writing、Speaking 七個內部分頁；Overview、Users、Records、Reading/Listening full save、Writing CRUD、Admin Speaking CRUD 已呼叫 `/api/admin/**`，editor preview、draft、image/audio local preview 與部分 toast 仍屬本地 UI 輔助。
- Reading/Listening admin editor 目前有 task sidebar、document-style material editor、question insertion modal、question-block image attachments、student preview 與 deleted tests page；Listening 額外有 mp3 local preview、full-test audio 或 Task 1-3 audio 互斥模式、tape position lock preview。
- Reading/Listening multiple choice selection mode：`Single scored question` 代表整題只計 1 分，但正確答案可以是一個或多個選項，必須全中才得分；`Multiple scored questions` 代表每個正確選項各計 1 分，例如 6 個選項中有 3 個正確選項時總分為 3 分。
- Writing/Speaking admin flow 使用全屏新增/編輯與獨立 deleted items page；Writing draft 需要 expected words、總考試時間與預備時間，Speaking 管理 Topic 1 與 Topic 2/3。
- User Reading/Listening/Writing module 使用 row-based selection 與全屏本地 exam workspace；Reading/Listening 沒有 resume/pause persistence，退出會清空本地答案，Submit 確認後才標記本地 Completed。
- Speaking 開始頁進入固定全屏同源 D-ID iframe workspace，左側保留 exam panel/status/reload/back controls，右側顯示 `/did-speaking-frame.html` examiner frame。
- 全站可拖動 `AI Agent` floating button 使用 `src/assets/ai-agent-icon.png`，右側 drawer 登入後呼叫 `/api/smartielts/dashboard/{user|admin}/ask`；Speaking examiner preview 另使用 `src/assets/ai-agent-icon.jfif`。
- 不要引入 shop、cart、checkout、price plan 等不符合 SmartIELTS 後端的流程。
- 不要把面向使用者的 backend/API/implementation planning 說明放進 UI。
- 所有 visible UI 預設視為可上線版本，不要加入無意義或不屬於產品流程的顯示區塊，例如突然出現 API payload、backend implementation note、測試說明、開發備忘或與當前頁面任務無關的一句話。只有在該 UI 區塊本身是明確保留給未來建設、且以產品語言對使用者有意義時，才可保留 placeholder 或 preview。
- Tailwind v4 透過 `@tailwindcss/vite` 載入；不要新增 legacy Tailwind v3 `tailwind.config.js` 或 PostCSS flow，除非任務明確要求遷移。
- `src/styles.css` 存放 global base style 與 prototype interaction utilities；新增全局樣式前確認是否真的跨頁共用。
- 優先使用 accessible native controls；自訂 dropdown、drawer、tab、modal 要注意 keyboard、focus、aria 與 pointer states。
- 頁面 section 應保持清晰、可掃描；不要用多層 card 包 card。
- 固定格式 UI 元素應有穩定尺寸，避免 hover、載入文字或動態內容造成 layout shift。

## API Client 規則

- API base path 是 `/api`；本地後端預設 base URL 是 `http://localhost:8080/api`。
- Vite dev server proxy `/api` 到 `http://localhost:8080`，開發時 browser code 可 request `/api/...`。
- `.env.example` 記錄 `VITE_API_BASE_URL=http://localhost:8080/api`。
- API client 已建立於 `src/api/client.ts`，endpoint wrappers 依 backend module 放在 `src/api/*Api.ts`。
- Backend contracts 已建立於 `src/contracts`；新增 endpoint 前先補或修正 contract type。
- 前端 API client 必須統一解析 `Result<T>`：

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

- `code === 1` 視為業務成功。
- `code === 0` 視為業務失敗，應顯示或傳遞 `msg`。
- 不要只依賴 HTTP status 判斷業務成功。
- HTTP 401 必須清除 token 並導向登入頁。
- multipart endpoint 不手動設定 `Content-Type`，由 browser 自動帶 boundary。
- 後端 `LocalDateTime` 使用 ISO 字串，例如 `2026-05-06T13:30:00`。
- `consoleApi` 專門對接 deterministic console：`GET /api/user/console`、`GET /api/admin/console`。
- `dashboardApi` 專門對接 `/api/smartielts/dashboard/**` AI ask、preload、overview visual、executive summary 與 SSE；不要和 console payload 混用。
- `recordsApi` 優先使用 unified user records API；module-specific record endpoint 只作必要 fallback。

## Auth 與測試 Token

- 此專案使用 stateless JWT，不使用 session。
- 登入入口是 `POST /api/auth/login`。
- 登入 request body：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- 登入成功 response 外層是 `Result`，token 位於 `data.token`，同時回傳 `data.userId` 與 `data.role`。
- 後續 HTTP request header 必須使用：

```http
Authorization: Bearer <data.token>
```

- `POST /api/auth/logout` 與 `PUT /api/auth/password` 都會讓舊 token 立即失效。
- 測試或手動驗證時，不要在 logout 或 change password 後重用舊 token。
- 角色權限使用 `ROLE_` 前綴建立；前端看到的 role value 是 `USER` 或 `ADMIN`。
- `/api/user/**` 需要 USER，`/api/admin/**` 需要 ADMIN。
- 前端測試 auth flow 時，優先使用 mock API client 或測試專用 token fixture，不要在每個 component test 重新測後端登入功能。
- Auth session helper 已建立於 `src/features/auth/authSession.ts`，負責儲存與清除 token、userId、role、tokenExpiresIn、refreshAfterSeconds。
- `src/app/bootstrapApi.ts` 會把 auth token provider 與 401 cleanup callback 注入 API client。

## Feature 實作方向

- Reading / Listening:
  - user flow: list tests、get detail、start session、pause/resume、submit answers、view records
  - admin flow: manage tests、part groups、questions、audio/images、records
  - 前端不要複製 answer judging 或 scoring logic
- Writing:
  - 支援 text、image、PDF input type
  - upload 與 multipart request 必須保留 browser-managed boundary
  - AI scoring status 是 backend-owned，前端只顯示 status 與 result
- Speaking:
  - 支援 exam/session lifecycle、audio upload、record processing、final scoring、D-ID talk status
  - session 與 record status transition 是 backend-owned
- Dashboard:
  - 可能包含 overview、preload/config、AI ask、SSE、structured query、review/rewrite flows
  - streaming/SSE handling 應隔離在 dashboard-specific service 或 hook

## 測試與驗證

- 目前已配置 Vitest，聚焦 API contract wrapper 測試。
- 目前基本 build verification 是 `npm.cmd run build`。
- 目前基本 test verification 是 `npm.cmd run test`。
- 行為改動應補上或更新聚焦測試，特別是 API client parsing、auth state、route guard、upload flow、SSE/dashboard flow、表單 validation。
- 文件-only 變更至少確認目標文件存在、關鍵 heading 正確；不一定需要跑 build。
- UI / behavior 變更若目前沒有 test runner，至少跑 `npm.cmd run build`。
- 不要用前端測試重測後端 scoring、permission 或 transaction rules。
- 若無法執行測試或 build，最終回覆要明確說明原因。

## 文件同步

- 會影響未來開發者理解專案的變更，必須同步更新 `docs/frontend/frontend-overview.md`。
- 包含但不限於：
  - 新增 top-level folder、route group、feature module、state/store pattern、API client pattern、form/upload helper、test strategy
  - 重大 UI layout 或 navigation 改動
  - 新 frontend integration point，例如 auth persistence、dashboard SSE、OCR/PDF upload、audio upload、D-ID talk UI、AI scoring display
  - API response/type model 變更
  - build tooling 變更，例如 Vite、Tailwind、TypeScript、lint/test setup、environment variables
- 小型 component-local styling 或 copy 調整，若不改變未來開發者理解方式，通常不需要更新 overview。

## Git 與工作樹

- 可能遇到使用者或自動化留下的未提交變更；不要 revert 你沒有建立的變更。
- 編輯前先用 `git status --short --branch` 確認工作樹狀態。
- 若同一檔案已有非本次任務的變更，先理解它，再在其基礎上修改。
- 不要使用 `git reset --hard`、`git checkout --` 或其他會丟棄變更的命令，除非使用者明確要求。
- commit message 要短且描述實際改動。

## 文件安全

- 禁止批量刪除文件或目錄。
- 不要使用 `del /s`、`rd /s`、`rmdir /s`、`Remove-Item -Recurse` 或 `rm -rf`。
- 如果必須刪除文件，只能一次刪除一個明確路徑的文件，例如：

```powershell
Remove-Item "C:\path\to\file.txt"
```

- 如果看起來需要批量刪除，必須停止操作，詢問使用者並讓使用者手動處理或明確批准清理方案。

## Windows 與命令

- 預設工作目錄是 `C:\SmartIELTS-frontend(api)`。
- 搜尋文字或檔案一律使用 PowerShell 原生命令，例如 `Get-ChildItem`、`Select-String`、`Where-Object`；不要使用 `rg` / `rg --files`。
- PowerShell 下執行 npm script 可使用 `npm.cmd run build`、`npm.cmd run dev`、`npm.cmd run preview`。
- 不要用 shell 串接危險刪除或跨 shell 拼接檔案操作。
- manual code edit 優先使用 `apply_patch`，不要用 shell redirect 或 Python 腳本寫檔。

## 跨前後端責任邊界

- 若發現問題的根因或達成目標所需修改的程式碼屬於對方端（前端或後端），必須在進度回報與最終回覆中重點說明。
- 說明時要明確列出：問題所在、為什麼需要對方端修改、期望修改的 API / contract / UI behavior / data shape，以及目前這一端可完成的處理或限制。
- 若 API contract 本身需要更正，前端不得直接修改 contract；必須提醒使用者，並列出疑似錯誤位置、影響範圍與建議由後端確認或修正的內容。
- 不要為了繞過對方端缺口，把 backend-owned business rules、權限、評分、狀態轉移或持久化責任搬到 frontend；也不要用 frontend workaround 掩蓋需要 backend 修正的 contract 或資料問題。
- 若因此無法完整驗證目標，最終回覆必須標明被阻擋的驗證項目與需要對方端提供的後續條件。
