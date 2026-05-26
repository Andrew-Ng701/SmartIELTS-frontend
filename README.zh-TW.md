<p align="right">
  <a href="./README.md"><img alt="English README" src="https://img.shields.io/badge/README-English-2563eb?style=for-the-badge"></a>
  <a href="./README.zh-TW.md"><img alt="Traditional Chinese README" src="https://img.shields.io/badge/README-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-f97316?style=for-the-badge"></a>
</p>

<h1 align="center">SmartIELTS Frontend</h1>

<p align="center">
  <strong>SmartIELTS 前端完整代碼倉庫</strong><br>
  React single-page application，負責學生端、管理端、紀錄、個人資料、Dashboard AI 與 Speaking examiner UI。
</p>

<p align="center">
  <strong>React 19</strong> · <strong>TypeScript 5.8</strong> · <strong>Vite 7</strong> · <strong>Tailwind CSS v4</strong> · <strong>Vitest</strong>
</p>

---

## 1. 倉庫定位

**`SmartIELTS-frontend` 是前端專用倉庫。**

本倉庫放置 SmartIELTS 前端完整代碼、前端文件、前端部署說明、環境變數範例，以及前端側 API integration 說明。

前端主要負責：

- Public website、landing page、FAQ、login-required pages。
- Student dashboard 與 learning console。
- 使用者端 Reading、Listening、Writing、Speaking 練習流程。
- Profile、settings、records、record detail pages。
- Admin console、admin users、admin records、admin content authoring UI。
- Floating AI Agent drawer 與 dashboard ask flows。
- Same-origin D-ID Speaking examiner iframe host。
- 前端 API client、TypeScript contracts、view-model mapping、UI validation、upload orchestration。

前端不負責：

- 後端 API implementation。
- Database schema 或 migration。
- JWT 簽發或 server-side token invalidation。
- 最終權限判斷。
- IELTS scoring、AI scoring、record ownership、status transitions。
- 後端 transaction consistency。

以上責任應放在 `SmartIELTS-backend`。

## 2. 三個 Repository 分工

SmartIELTS 分成三個 repository 管理。

| Repository | 是否放實際代碼 | 主要內容 | 不應放入 |
| --- | --- | --- | --- |
| **`SmartIELTS-frontend`** | **是，前端代碼** | React/Vite/TypeScript source、前端 README、前端部署說明、`.env.example`、前端測試、前端文件 | 後端 source code、DB migrations、server implementation |
| **`SmartIELTS-backend`** | **是，後端代碼** | 後端 source code、後端 README、API docs、DB migrations、後端部署說明、server configuration | React frontend implementation |
| **`SmartIELTS`** | **否，不放應用 source code** | 總覽 README、架構圖、前後端啟動方式、部署流程、環境需求、repo links、demo screenshots、API contract 入口 | Frontend `src/`、backend implementation、重複的應用 source |

建議工作方式：

- 前端功能開發在 `SmartIELTS-frontend`。
- 後端功能開發在 `SmartIELTS-backend`。
- 跨專案總覽、截圖、架構圖與 repo links 放在 `SmartIELTS`。

## 3. 技術棧

| 類別 | 技術 |
| --- | --- |
| App framework | React 19 |
| Language | TypeScript 5.8 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 through `@tailwindcss/vite` |
| Test runner | Vitest |
| Package manager | npm with `package-lock.json` |
| App style | Single-page frontend with browser-history-backed page state |
| API integration | Typed wrappers in `src/api`，backend contracts in `src/contracts` |

## 4. 目前前端功能範圍

### 4.1 Public Pages

- Landing page。
- FAQ page。
- Login-required page。
- Public header、module dropdown、mobile navigation。

### 4.2 Authentication

- Login 與 register UI。
- JWT session storage helper。
- Password change UI。
- HTTP 401 cleanup callback。
- 用環境變數控制的 preview auth fallback，僅供本地 UI 檢視。

### 4.3 User Console

- User dashboard snapshot。
- Active / deleted records summary。
- Overall average。
- Module target bands。
- Module stats。
- Score radar、score trend、module activity。
- Dashboard insights。

### 4.4 User Practice And Records

- Reading / Listening practice entry and workspace。
- Writing submission UI。
- Speaking same-origin iframe examiner page。
- Unified records hub。
- Record detail review。
- 後端 API 支援時提供 delete / restore UI orchestration。

### 4.5 Profile And Settings

- Account details。
- Display name。
- Profile picture upload。
- Reading、Listening、Writing、Speaking target bands。
- Password change。

### 4.6 Admin Console

- Admin overview。
- Admin users。
- Admin user detail and user-scoped records。
- Admin records。
- Admin Reading / Listening test authoring。
- Admin Writing authoring。
- Admin Speaking authoring。
- 支援的 admin content deleted item views。

### 4.7 Dashboard AI Agent

- Floating AI Agent launcher。
- Drawer chat UI。
- Quick prompts。
- Ask API integration。
- SSE-first response handling with fallback。
- Executive summary badge。

## 5. 專案目錄

以下使用 ASCII tree，避免不同 terminal encoding 造成亂碼。

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

| Path | 說明 |
| --- | --- |
| `src/app` | App bootstrap、route constants、navigation constants、shell、runtime config |
| `src/api` | API client、endpoint wrappers、errors、API contract tests |
| `src/contracts` | Backend-facing TypeScript DTO/query/VO contracts，保留後端欄位名稱 |
| `src/features/auth` | Login、register、settings、auth session helper |
| `src/features/user` | User console、profile、records、practice、reading、listening、writing、speaking |
| `src/features/admin` | Admin console、users、records、content management |
| `src/features/dashboard-agent` | AI Agent drawer、ask/preload/SSE/executive summary boundary |
| `src/components` | Shared non-feature UI、exam renderer、audio control |
| `src/hooks` | Shared React hooks |
| `src/lib` | Framework-agnostic helpers、validation、asset URL helpers |
| `public/did-speaking-frame.html` | Same-origin D-ID Speaking examiner iframe page |
| `docs/frontend/frontend-overview.md` | Frontend architecture and implementation map |
| `scripts/e2e-api-smoke.ps1` | API smoke check helper script |

## 6. 本地環境需求

必要工具：

- Node.js：需相容 Vite 7。
- npm。
- Git。
- Windows 本地開發建議使用 PowerShell。

後端需求：

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

CI 或正式部署 build 建議：

```bash
npm ci
```

## 8. 環境變數

需要時從 `.env.example` 建立本地 `.env`：

```powershell
Copy-Item .env.example .env
```

目前 `.env.example`：

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_DID_SCRIPT_SRC=https://agent.d-id.com/v2/index.js
VITE_DID_CLIENT_KEY=
VITE_DID_AGENT_ID=
VITE_ENABLE_PREVIEW_AUTH=false
```

| Variable | Required | Local example | Production guidance |
| --- | --- | --- | --- |
| **`VITE_API_BASE_URL`** | **Yes** | `http://localhost:8080/api` | 使用正式 backend API base URL，例如 `https://api.example.com/api`，或使用同網域 `/api` reverse proxy |
| **`VITE_DID_SCRIPT_SRC`** | Speaking examiner 需要 | `https://agent.d-id.com/v2/index.js` | 通常維持 D-ID 官方 script URL，除非 D-ID 更改 integration endpoint |
| **`VITE_DID_CLIENT_KEY`** | Speaking examiner 需要 | 空值或測試 key | 在 hosting platform 設定，不要 commit 真實 credentials |
| **`VITE_DID_AGENT_ID`** | Speaking examiner 需要 | 空值或測試 agent ID | 在 hosting platform 設定，不要 commit 真實 agent ID |
| **`VITE_ENABLE_PREVIEW_AUTH`** | Optional | `false` | Production 必須維持 `false` |

安全注意：

- 不要 commit `.env`。
- 不要把 server secrets 放進 `VITE_*` 變數。
- Vite 會把所有 `VITE_*` 變數暴露給 browser code。
- Production credentials 應由 hosting platform 注入。

## 9. 常用指令

| Command | 用途 | 使用時機 |
| --- | --- | --- |
| `npm.cmd run dev` | 啟動 Vite dev server | Windows 本地開發 |
| `npm.cmd run build` | Type-check + production build | 部署前或提交前 |
| `npm.cmd run preview` | 預覽 build output | Production-like 本地檢查 |
| `npm.cmd run test` | 執行 Vitest tests | 提交前或 CI |

Linux/macOS 等效指令：

```bash
npm run dev
npm run build
npm run preview
npm run test
```

## 10. 本地開發

先依 `SmartIELTS-backend` README 啟動後端。

再啟動前端：

```powershell
npm.cmd run dev
```

預設前端 URL：

```text
http://127.0.0.1:5173
```

Frontend browser code 通常呼叫：

```text
/api/...
```

Vite 會轉發至：

```text
http://localhost:8080/api/...
```

Preview auth 只應用於本地 UI 檢視：

```env
VITE_ENABLE_PREVIEW_AUTH=true
```

Production 必須使用：

```env
VITE_ENABLE_PREVIEW_AUTH=false
```

## 11. 測試與驗證

執行測試：

```powershell
npm.cmd run test
```

目前測試聚焦：

- API client `Result<T>` parsing。
- API endpoint wrapper behavior。
- Auth session helper。
- App route definitions。
- User dashboard mapping。
- User records and record detail mapping。
- Admin overview、users、records mapping。
- Reading、Listening、Writing、Speaking model helpers。
- Form and file validation。

Production build：

```powershell
npm.cmd run build
```

Build output：

```text
dist/
```

預覽 production build：

```powershell
npm.cmd run preview
```

## 12. 前端部署說明

SmartIELTS Frontend 是 static Vite frontend。部署產物是：

```text
dist/
```

標準部署流程：

1. 在 hosting platform 設定 production environment variables。
2. 安裝 dependencies。
3. 執行 production build。
4. 發布 `dist/` 作為 static assets。
5. 設定 SPA fallback 到 `index.html`。
6. 設定 `/api` reverse proxy 或將 `VITE_API_BASE_URL` 指向 backend API URL。
7. 若 frontend/backend 不同 domain，設定 backend CORS allowed origins。
8. 若啟用 Speaking examiner，設定 D-ID allowed domain。
9. 驗證 login、dashboard、records、profile、admin console、AI Agent、Speaking iframe。

Linux build example：

```bash
npm ci
npm run build
```

Windows build example：

```powershell
npm ci
npm.cmd run build
```

Publish directory：

```text
dist
```

SPA fallback：

```text
/* -> /index.html
```

API routing：

```text
/api/* -> SmartIELTS backend service
```

## 13. Nginx 範例

以下是最小概念範例。Production 需要補上正確 domain、TLS、cache policy、compression、security headers、upstream configuration。

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

## 14. Static Hosting / CDN 重點

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Install command | `npm ci` |
| Output directory | `dist` |
| SPA fallback | Frontend paths route to `/index.html` |
| API | Reverse proxy `/api` 或設定 `VITE_API_BASE_URL` |

部署後檢查：

- 直接開 `/` 正常。
- 直接刷新 dashboard/user/admin pages 不會 404。
- `/api` requests 指向正確 backend。
- Login 後帶上 `Authorization: Bearer <token>`。
- HTTP 401 會清除 frontend session。
- D-ID Speaking iframe 不出現 `origin null`。

## 15. API Integration Boundary

Frontend API base path：

```text
/api
```

Shared backend response envelope：

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

Frontend interpretation：

| Condition | Behavior |
| --- | --- |
| `code === 1` | Business success |
| `code === 0` | Business failure，顯示或傳遞 `msg` |
| HTTP `401` | 清除 token/session 並返回 login |
| Multipart upload | 不手動設定 `Content-Type`，由 browser 自動設定 boundary |

## 16. Auth 行為

Frontend session helper：

```text
src/features/auth/authSession.ts
```

Login success 會保存：

- JWT token。
- userId。
- role。
- tokenExpiresIn。
- refreshAfterSeconds。

後續 request header：

```http
Authorization: Bearer <token>
```

規則：

- `/api/user/**` 需要 USER。
- `/api/admin/**` 需要 ADMIN。
- `POST /api/auth/logout` 會讓 token 失效。
- `PUT /api/auth/password` 成功後會清除 frontend session。
- logout 或 change password 後不要重用舊 token。

## 17. Speaking D-ID Examiner

Speaking examiner 使用 public static file：

```text
public/did-speaking-frame.html
```

React 透過以下路徑載入：

```text
/did-speaking-frame.html
```

不要改成：

- `srcdoc`
- `blob:`
- `data:`
- `file:`
- React-rendered iframe content

原因：

- D-ID allowed domain checks 需要正常 same-origin page。
- `origin null` 會破壞 D-ID integration。
- React StrictMode 可能影響 script lifecycle。

## 18. Frontend / Backend Responsibility Boundary

Frontend owns：

- UI rendering。
- User input collection。
- Local interaction state。
- Form UX validation。
- Upload UX。
- Request orchestration。
- Loading、empty、error UI。
- API response mapping to view models。
- Browser route/page state。

Backend owns：

- Authentication validation。
- Authorization and permissions。
- Persistence。
- ID and timestamp generation。
- Ownership checks。
- IELTS scoring and AI scoring。
- Status transitions。
- Transaction consistency。
- Token invalidation。

## 19. Pre-Push Checklist

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```

確認：

- README 與 `.env.example` 已同步。
- 若 architecture、routes、API boundaries、deployment behavior 有變更，已更新 `docs/frontend/frontend-overview.md`。
- `.env` 未被 commit。
- Production secrets 未被 commit。
- User-facing UI 沒有 admin-only actions。
- Admin-facing UI 沒有 user practice flows。
- Backend contract field names 保持原樣。

## 20. Release Checklist

| Check | Expected |
| --- | --- |
| Tests | `npm.cmd run test` passes |
| Build | `npm.cmd run build` passes |
| Environment | Production variables are configured |
| Preview auth | `VITE_ENABLE_PREVIEW_AUTH=false` |
| API | Backend URL or `/api` proxy works |
| CORS | Backend allows the frontend origin when needed |
| SPA fallback | Direct route refresh does not 404 |
| Auth | Login/logout/password-change behavior is verified |
| User flow | Dashboard、profile、records、module entries verified |
| Admin flow | Admin console、users、records、content pages verified |
| D-ID | Speaking iframe loads with a valid origin |
| HTTPS | Production domain uses HTTPS |

## 21. 與主倉庫的關係

主倉庫 `SmartIELTS` 應只放跨專案總覽內容：

- Overall project README。
- Architecture diagram。
- Frontend repository link。
- Backend repository link。
- Local startup guide for both frontend and backend。
- Deployment flow overview。
- Environment requirements。
- Demo screenshots。
- API contract entry point。

主倉庫不應複製此前端 source code。

## 22. 相關文件

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Project working rules、boundaries、testing、Git rules |
| `docs/frontend/frontend-overview.md` | Frontend architecture and implementation map |
| `docs/frontend/backend-overview.md` | Backend-facing reference kept in frontend workspace |
| `.env.example` | Frontend environment variable template |
| `vite.config.ts` | Vite plugins、port、local proxy |
| `package.json` | Scripts and dependencies |

## 23. Quick Start

```powershell
npm install
Copy-Item .env.example .env
npm.cmd run dev
```

Open：

```text
http://127.0.0.1:5173
```

Before pushing：

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```
