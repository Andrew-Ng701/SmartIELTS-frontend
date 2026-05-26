<h1 align="center">SmartIELTS Frontend</h1>

<p align="center">
  <strong>SmartIELTS 前端完整代碼倉庫</strong><br />
  React single-page application for student practice, user console, admin console, records, profile, AI Agent, and Speaking examiner UI.
</p>

<p align="center">
  <strong>React 19</strong> · <strong>TypeScript 5.8</strong> · <strong>Vite 7</strong> · <strong>Tailwind CSS v4</strong> · <strong>Vitest</strong>
</p>

---

## 1. 倉庫定位

**`SmartIELTS-frontend` 是前端專用倉庫。**

本倉庫放置 SmartIELTS 前端完整代碼、前端 README、前端部署說明、環境變數範例與前端側 API integration 說明。

前端主要負責：

- Public website / landing / FAQ / login-required pages
- Student console / dashboard
- Reading、Listening、Writing、Speaking 使用者練習入口與檢視頁
- Profile、Settings、Records、Record detail
- Admin console、admin users、admin records、admin content authoring UI
- Floating AI Agent drawer
- Same-origin D-ID Speaking examiner iframe host
- 前端 API client、contract types、view model mapping、UI validation、upload UI orchestration

前端不負責：

- 後端 API implementation
- DB schema 或 migration
- JWT 簽發與 server-side token invalidation
- 權限判斷的最終規則
- IELTS 評分、AI scoring、record ownership、status transition
- 後端 transaction consistency

以上後端責任應放在 `SmartIELTS-backend`。

## 2. 三個 Repository 分工

| Repository | 是否放實際代碼 | 主要內容 | 不應放入的內容 |
| --- | --- | --- | --- |
| **`SmartIELTS-frontend`** | **是，前端代碼** | React/Vite/TypeScript 前端完整 source code、前端 README、前端部署說明、`.env.example`、前端測試、前端文件 | 後端 source code、DB migration、server deployment scripts |
| **`SmartIELTS-backend`** | **是，後端代碼** | 後端完整 source code、後端 README、API 文件、DB migration、後端部署說明、server config | React app source code、前端 build artifact 管理 |
| **`SmartIELTS`** | **否，不放實際前後端代碼** | 總覽 README、系統架構圖、前後端啟動方式、部署流程、環境需求、repo links、demo screenshots、API contract 入口 | `src/`、backend implementation、frontend implementation |

**建議管理方式：**

- 日常前端開發只在 `SmartIELTS-frontend`。
- 日常後端開發只在 `SmartIELTS-backend`。
- 專案展示、總覽、跨 repo 啟動流程與截圖放在 `SmartIELTS` 主倉庫。

## 3. 技術棧

| 類別 | 技術 |
| --- | --- |
| App framework | React 19 |
| Language | TypeScript 5.8 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 through `@tailwindcss/vite` |
| Test runner | Vitest |
| Package manager | npm + `package-lock.json` |
| App style | Single-page frontend, browser-history-backed page state |
| Backend integration | Typed API wrappers in `src/api`, DTO/query/VO contracts in `src/contracts` |

## 4. 目前前端功能範圍

### 4.1 Public Pages

- Landing page
- FAQ page
- Login-required gate
- Public header / module dropdown / mobile navigation

### 4.2 Auth

- Login / register UI
- JWT session persistence helper
- Password change UI
- HTTP 401 cleanup callback
- Environment-gated preview auth fallback

### 4.3 User Console

- User dashboard snapshot
- Active/deleted records summary
- Overall average
- Module target bands
- Module stats
- Score radar / score trend / module activity
- Dashboard insights

### 4.4 User Practice And Records

- Reading / Listening practice entry and workspace
- Writing submit UI
- Speaking same-origin iframe examiner page
- Unified records hub
- Record detail review
- Delete / restore UI orchestration where supported by backend API

### 4.5 Profile And Settings

- Account details
- Display name
- Profile picture upload
- Reading / Listening / Writing / Speaking target bands
- Password change

### 4.6 Admin Console

- Admin overview
- Admin users
- Admin user detail and user-scoped records
- Admin records
- Admin Reading / Listening test authoring
- Admin Writing authoring
- Admin Speaking authoring
- Deleted items pages for supported admin content

### 4.7 Dashboard AI Agent

- Floating AI Agent button
- Drawer chat UI
- Quick prompts
- Ask API integration
- SSE-first response handling with fallback
- Executive summary badge

## 5. 專案目錄

以下使用 ASCII 樹狀圖，避免不同 terminal encoding 顯示亂碼。

```text
.
|-- public/
|   `-- did-speaking-frame.html
|-- src/
|   |-- api/
|   |-- app/
|   |-- assets/
|   |-- components/
|   |-- contracts/
|   |-- features/
|   |   |-- admin/
|   |   |-- auth/
|   |   |-- dashboard-agent/
|   |   |-- public/
|   |   `-- user/
|   |-- hooks/
|   |-- lib/
|   |-- types/
|   |-- App.tsx
|   |-- main.tsx
|   `-- styles.css
|-- docs/
|   `-- frontend/
|       |-- backend-overview.md
|       `-- frontend-overview.md
|-- scripts/
|-- .env.example
|-- package.json
|-- package-lock.json
|-- vite.config.ts
|-- tsconfig.json
|-- tsconfig.app.json
|-- tsconfig.node.json
`-- README.md
```

### 5.1 重要目錄說明

| Path | 說明 |
| --- | --- |
| `src/app` | App bootstrap、route constants、navigation constants、global shell、runtime config |
| `src/api` | API client、endpoint wrappers、errors、API contract tests |
| `src/contracts` | Backend-facing TypeScript DTO/query/VO contracts，保留後端原始欄位名稱 |
| `src/features/auth` | Login、register、settings、auth session helper |
| `src/features/user` | USER-facing console、profile、records、practice、reading、listening、writing、speaking |
| `src/features/admin` | ADMIN-facing console、users、records、reading/listening/writing/speaking management |
| `src/features/dashboard-agent` | AI Agent drawer、ask/preload/SSE/executive summary boundary |
| `src/components` | 非 feature-owned 的共用 UI、exam renderer、audio control |
| `src/hooks` | Shared React hooks |
| `src/lib` | Framework-agnostic helpers、validation、asset URL helpers |
| `public/did-speaking-frame.html` | D-ID Speaking examiner same-origin static iframe page |
| `docs/frontend/frontend-overview.md` | 前端架構、API integration status、feature ownership |
| `scripts/e2e-api-smoke.ps1` | API smoke check helper script |

## 6. 本地環境需求

### 6.1 必要工具

- Node.js：需相容 Vite 7
- npm：使用 `package-lock.json` 安裝一致版本
- Git
- PowerShell：Windows 本地開發建議使用

### 6.2 後端需求

API-backed flows 需要 SmartIELTS backend 正在執行。

本地預設後端：

```text
http://localhost:8080
```

本地 API base URL：

```text
http://localhost:8080/api
```

Vite development proxy：

```text
/api -> http://localhost:8080
```

## 7. 安裝

```powershell
npm install
```

CI 或正式部署建議使用：

```bash
npm ci
```

## 8. 環境變數

### 8.1 建立本地 `.env`

```powershell
Copy-Item .env.example .env
```

`.env` 只放本機或部署平台的實際設定，不應 commit。

### 8.2 `.env.example`

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_DID_SCRIPT_SRC=https://agent.d-id.com/v2/index.js
VITE_DID_CLIENT_KEY=
VITE_DID_AGENT_ID=
VITE_ENABLE_PREVIEW_AUTH=false
```

### 8.3 變數詳細說明

| Variable | Required | Local example | Production guidance |
| --- | --- | --- | --- |
| **`VITE_API_BASE_URL`** | **Yes** | `http://localhost:8080/api` | 設為正式 backend API base URL，例如 `https://api.example.com/api` 或同網域 `/api` reverse proxy 方案 |
| **`VITE_DID_SCRIPT_SRC`** | Speaking examiner 需要 | `https://agent.d-id.com/v2/index.js` | 通常維持 D-ID 官方 script URL，除非 D-ID integration 文件更新 |
| **`VITE_DID_CLIENT_KEY`** | Speaking examiner 需要 | 空值或測試 key | 在部署平台設定，不要 commit 真實 key |
| **`VITE_DID_AGENT_ID`** | Speaking examiner 需要 | 空值或測試 agent id | 在部署平台設定，不要 commit 真實 agent id |
| **`VITE_ENABLE_PREVIEW_AUTH`** | Optional | `false` | Production 必須維持 `false`，避免 demo fallback login 被啟用 |

### 8.4 安全注意

**Vite 會把所有 `VITE_*` 變數打包給瀏覽器使用。**

因此：

- 不要把 server secret 放進 `VITE_*`。
- 不要 commit `.env`。
- 不要把 production token、private API key、database credential 放在前端。
- D-ID client-side integration 所需值應依 D-ID 文件與 allowed domain 設定使用。
- Production 應透過 hosting platform environment variables 注入。

## 9. 常用指令

| Command | 用途 | 何時使用 |
| --- | --- | --- |
| `npm.cmd run dev` | 啟動 Vite dev server | 本地開發 |
| `npm.cmd run build` | TypeScript build + Vite production build | 提交前、部署前 |
| `npm.cmd run preview` | 本地預覽 production build | 部署前 smoke check |
| `npm.cmd run test` | 執行 Vitest tests | 提交前、CI |

Linux/macOS 可使用 npm 原生命令：

```bash
npm run dev
npm run build
npm run preview
npm run test
```

Windows PowerShell 建議使用：

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npm.cmd run test
```

## 10. 本地開發流程

### 10.1 啟動後端

請在 `SmartIELTS-backend` 依後端 README 啟動 backend。

預期 backend 服務：

```text
http://localhost:8080
```

### 10.2 啟動前端

```powershell
npm.cmd run dev
```

預設前端 URL：

```text
http://127.0.0.1:5173
```

### 10.3 本地 API 呼叫方式

Frontend browser code 通常呼叫：

```text
/api/...
```

Vite proxy 會轉發至：

```text
http://localhost:8080/api/...
```

### 10.4 Preview Auth

`VITE_ENABLE_PREVIEW_AUTH=true` 時，本地可使用 preview fallback 檢視 user/admin UI。

Production 必須使用：

```env
VITE_ENABLE_PREVIEW_AUTH=false
```

## 11. 測試與驗證

### 11.1 執行測試

```powershell
npm.cmd run test
```

目前測試涵蓋：

- API client `Result<T>` parsing
- API endpoint wrapper contract behavior
- Auth session helper
- App route definitions
- User dashboard view-model mapping
- User records / record detail mapping
- Admin overview / users / records mapping
- Reading / Listening / Writing / Speaking model helpers
- Form validation
- File validation

### 11.2 Production build

```powershell
npm.cmd run build
```

Build output：

```text
dist/
```

Build command 實際執行：

```text
tsc -b && vite build
```

### 11.3 Preview build

```powershell
npm.cmd run preview
```

用於部署前檢查 `dist/` 的 production-like 行為。

## 12. 前端部署說明

### 12.1 部署產物

SmartIELTS frontend 是 static Vite frontend。

部署產物：

```text
dist/
```

**只需要部署 `dist/` 內容到 static hosting / CDN / Nginx / object storage + CDN。**

### 12.2 標準部署流程

1. 在 hosting platform 設定 production environment variables。
2. 安裝 dependencies。
3. 執行 production build。
4. 發布 `dist/`。
5. 設定 SPA fallback。
6. 設定 `/api` reverse proxy 或確保 `VITE_API_BASE_URL` 指向 backend。
7. 設定 backend CORS allowed origin。
8. 若啟用 Speaking examiner，設定 D-ID allowed domain。
9. 用真實 account 驗證 login、dashboard、records、profile、admin console、AI Agent、Speaking iframe。

### 12.3 Linux host build example

```bash
npm ci
npm run build
```

Publish directory：

```text
dist
```

### 12.4 Windows host build example

```powershell
npm ci
npm.cmd run build
```

Publish directory：

```text
dist
```

### 12.5 SPA fallback

因為這是 single-page frontend，所有非 asset route 都應 fallback 到：

```text
/index.html
```

規則概念：

```text
/* -> /index.html
```

如果沒有設定 SPA fallback，重新整理 dashboard、records、admin 等 route 可能會出現 404。

### 12.6 API routing

建議 production 使用同網域 reverse proxy：

```text
https://your-domain.com/api/* -> SmartIELTS backend
```

優點：

- 減少 CORS 複雜度
- 前端可維持 `/api/...` 呼叫形式
- Cookie/header/proxy policy 較集中

也可以使用獨立 API domain：

```text
VITE_API_BASE_URL=https://api.your-domain.com/api
```

這種方案需要 backend 正確設定 CORS。

## 13. Nginx 部署範例

以下是概念範例，實際 production 需補上 domain、TLS、cache、gzip/brotli、security headers、upstream name。

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/smartielts-frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://smartielts-backend:8080/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

如果 backend 本身已部署在外部 API domain，則可不設 `/api` reverse proxy，但必須確認 `VITE_API_BASE_URL` 與 CORS。

## 14. Static Hosting / CDN 部署重點

適用平台概念：

- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- Any static file host

通用設定：

| Item | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm ci` |
| Node version | 使用與 Vite 7 相容版本 |
| SPA fallback | 所有 frontend routes fallback 到 `/index.html` |
| API | reverse proxy `/api` 或設定 `VITE_API_BASE_URL` |

部署後必查：

- Direct open `/` 正常
- Direct refresh dashboard/user/admin pages 不 404
- `/api` request 指到正確 backend
- Login 成功後 Authorization header 正常帶 `Bearer <token>`
- HTTP 401 會清除前端 session
- D-ID Speaking iframe 不出現 `origin null`

## 15. API Integration Boundary

前端 API base path：

```text
/api
```

本地後端 default：

```text
http://localhost:8080/api
```

主要 API code：

| Path | 說明 |
| --- | --- |
| `src/api/client.ts` | Shared API client、`Result<T>` parsing、auth token provider、401 handler |
| `src/api/authApi.ts` | Login/register/logout/password endpoints |
| `src/api/userApi.ts` | User profile endpoints |
| `src/api/consoleApi.ts` | Deterministic user/admin console endpoints |
| `src/api/recordsApi.ts` | Unified user records endpoints |
| `src/api/adminApi.ts` | Admin overview / records / content shared endpoints |
| `src/api/adminUsersApi.ts` | Admin users endpoints |
| `src/api/dashboardApi.ts` | Dashboard AI ask / SSE / executive summary |
| `src/api/readingApi.ts` | Reading endpoints |
| `src/api/listeningApi.ts` | Listening endpoints |
| `src/api/writingApi.ts` | Writing endpoints |
| `src/api/speakingApi.ts` | Speaking endpoints |

Shared backend response envelope：

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

Frontend interpretation：

| Condition | Frontend behavior |
| --- | --- |
| `code === 1` | Business success |
| `code === 0` | Business failure，顯示或傳遞 `msg` |
| HTTP `401` | 清除 token/session，導回 login |
| Multipart upload | 不手動設定 `Content-Type`，由 browser 自動帶 boundary |

## 16. Auth 行為

前端 session helper：

```text
src/features/auth/authSession.ts
```

登入成功後保存：

- JWT token
- userId
- role
- tokenExpiresIn
- refreshAfterSeconds

後續 request header：

```http
Authorization: Bearer <token>
```

重要規則：

- `/api/user/**` 需要 USER。
- `/api/admin/**` 需要 ADMIN。
- `POST /api/auth/logout` 會讓 token 失效。
- `PUT /api/auth/password` 成功後會清除 session。
- 不要在 logout 或 change password 後重用舊 token。

## 17. Speaking D-ID Examiner

Speaking examiner 使用 public static file：

```text
public/did-speaking-frame.html
```

React iframe 載入：

```text
/did-speaking-frame.html
```

**不要改回以下方式：**

- `srcdoc`
- `blob:`
- `data:`
- `file:`
- React-rendered iframe content

原因：

- D-ID allowed domain 需要正常 same-origin page。
- `origin null` 會導致 D-ID integration 失敗。
- React StrictMode 可能影響 script lifecycle。

Production checklist：

- `VITE_DID_SCRIPT_SRC` 正確。
- `VITE_DID_CLIENT_KEY` 已在 hosting platform 設定。
- `VITE_DID_AGENT_ID` 已在 hosting platform 設定。
- D-ID allowed domain 包含 production frontend domain。
- HTTPS 啟用。

## 18. Frontend / Backend Responsibility Boundary

### 18.1 Frontend owns

- UI rendering
- User input collection
- Local interaction state
- Form UX validation
- Upload UX
- Request orchestration
- Loading / empty / error UI
- API response mapping to view models
- Browser route/page state

### 18.2 Backend owns

- Authentication validation
- Authorization and permissions
- Persistence
- ID generation
- Timestamp generation
- Ownership checks
- IELTS scoring
- AI scoring
- Status transitions
- Transaction consistency
- Token invalidation

### 18.3 不應放在前端的邏輯

- 最終評分邏輯
- 是否可刪除/restore 的權限規則
- record ownership 推導
- user/admin role server validation
- AI result generation
- backend-owned status transition

## 19. 提交與上線前 Checklist

提交前：

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```

確認：

- README 與 `.env.example` 已同步。
- 如果架構、route、API boundary、deployment behavior 有變更，已更新 `docs/frontend/frontend-overview.md`。
- 沒有 commit `.env`。
- Production secrets 沒有進 Git。
- User-facing UI 沒混入 admin-only action。
- Admin-facing UI 沒混入 user practice flow。
- API contract type 保留後端原始欄位名稱。

推送：

```powershell
git add -A
git commit -m "Describe actual change"
git push origin main
```

## 20. Release Checklist

Frontend release 前建議檢查：

| Check | Expected |
| --- | --- |
| Tests | `npm.cmd run test` passes |
| Build | `npm.cmd run build` passes |
| Env | Production env variables configured |
| Preview auth | `VITE_ENABLE_PREVIEW_AUTH=false` |
| API | Backend URL or `/api` proxy works |
| CORS | Backend allows frontend origin |
| SPA fallback | Direct refresh routes do not 404 |
| Auth | Login/logout/password-change behavior verified |
| User flow | Dashboard, profile, records, module entries verified |
| Admin flow | Admin console, users, records, content pages verified |
| D-ID | Speaking iframe loads with correct origin |
| HTTPS | Production domain uses HTTPS |

## 21. 與主倉庫的關係

主倉庫 `SmartIELTS` 應只放總覽內容，例如：

- Overall project README
- Architecture diagram
- Frontend repo link
- Backend repo link
- Local startup guide for both frontend and backend
- Deployment flow overview
- Environment requirements
- Demo screenshots
- API contract entry point

主倉庫不應複製本倉庫的完整前端 source code。

## 22. 相關文件

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Codex/project working rules、frontend/backend boundary、testing and Git rules |
| `docs/frontend/frontend-overview.md` | Frontend architecture and implementation map |
| `docs/frontend/backend-overview.md` | Backend-facing overview reference kept in frontend workspace |
| `.env.example` | Frontend environment variable template |
| `vite.config.ts` | Vite plugins, port, and local proxy |
| `package.json` | Scripts and dependencies |

## 23. Quick Start

```powershell
npm install
Copy-Item .env.example .env
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Before pushing:

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```

