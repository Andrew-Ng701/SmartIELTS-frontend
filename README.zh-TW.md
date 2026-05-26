<p align="right">
  <a href="./README.md"><img alt="English README" src="https://img.shields.io/badge/README-ENGLISH-111827?style=for-the-badge&labelColor=555555"></a>
  <a href="./README.zh-TW.md"><img alt="繁體中文 README" src="https://img.shields.io/badge/README-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-2563eb?style=for-the-badge&labelColor=555555"></a>
</p>

<h1 align="center">SmartIELTS Frontend</h1>

<p align="center">
  <strong>SmartIELTS 前端完整代碼倉庫</strong><br>
  React single-page application，覆蓋學生端、管理端、紀錄、Profile、Dashboard AI 與 Speaking examiner UI。
</p>

<p align="center">
  <strong>React 19</strong> · <strong>TypeScript 5.8</strong> · <strong>Vite 7</strong> · <strong>Tailwind CSS v4</strong> · <strong>Vitest</strong>
</p>

---

## 1. 倉庫定位

**`SmartIELTS-frontend` 是專門放前端代碼的倉庫。**

本倉庫包含：

- React/Vite/TypeScript 前端完整源碼。
- 前端 README 與部署說明。
- `.env.example` 環境變數範例。
- 前端 API client、contracts、view-model mapping 與 UI validation。
- Student / Admin / Dashboard AI / Speaking examiner 等前端畫面與流程。

本倉庫不負責：

- 後端 API 實作。
- Database schema 或 DB migration。
- JWT 簽發與 server-side token invalidation。
- IELTS scoring、AI scoring、record ownership、status transition。
- 後端 transaction consistency。

上述責任屬於 `SmartIELTS-backend`。

---

## 2. 三倉庫結構

| Repository | 是否放代碼 | 主要內容 | 不應放入 |
| --- | --- | --- | --- |
| **`SmartIELTS-frontend`** | **是，前端代碼** | React/Vite/TypeScript source、前端 README、前端部署說明、`.env.example`、前端 docs | 後端 source、DB migrations、server implementation |
| **`SmartIELTS-backend`** | **是，後端代碼** | Spring Boot source、後端 README、API docs、DB migrations、後端部署說明 | React 前端實作 |
| **`SmartIELTS`** | **否，只放總覽文件** | 總覽 README、架構圖、啟動方式、部署流程、repo links、demo screenshots、API contract 入口 | Frontend `src/`、backend implementation、重複 application source |

---

## 3. 技術棧

| 類別 | 技術 |
| --- | --- |
| App framework | React 19 |
| Language | TypeScript 5.8 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 through `@tailwindcss/vite` |
| Test runner | Vitest |
| Package manager | npm with `package-lock.json` |
| API integration | `src/api` endpoint wrappers、`src/contracts` backend DTO/VO contracts |

---

## 4. 前端功能範圍

- Public pages：Landing page、FAQ、login-required pages、header、module dropdown、mobile navigation。
- Auth：login、register、JWT session storage、password change、HTTP 401 cleanup。
- User console：dashboard snapshot、target bands、module stats、score trend、module activity、insights。
- Practice：Reading、Listening、Writing、Speaking user flows。
- Records：unified records hub、detail review、delete/restore orchestration。
- Profile：account details、display name、profile picture upload、IELTS target bands。
- Admin console：overview、users、records、Reading/Listening/Writing/Speaking authoring。
- Dashboard AI：floating AI Agent drawer、quick prompts、ask API、SSE-first response handling。
- Speaking examiner：same-origin D-ID iframe host at `public/did-speaking-frame.html`。

---

## 5. 專案結構

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
|-- scripts/
|-- .env.example
|-- package.json
|-- package-lock.json
|-- vite.config.ts
`-- README.md
```

| Path | 用途 |
| --- | --- |
| `src/app` | App bootstrap、route constants、navigation constants、shell、runtime config |
| `src/api` | API client、endpoint wrappers、error handling、API tests |
| `src/contracts` | 與後端 contract 對齊的 TypeScript DTO/query/VO |
| `src/features/auth` | Login、register、settings、auth session helper |
| `src/features/user` | User console、profile、records、practice flows |
| `src/features/admin` | Admin console、users、records、content management |
| `src/features/dashboard-agent` | AI Agent drawer、ask/preload/SSE/executive summary |
| `public/did-speaking-frame.html` | D-ID Speaking examiner iframe page |
| `docs/frontend/frontend-overview.md` | 前端架構與實作地圖 |

---

## 6. 本地需求

- Node.js compatible with Vite 7。
- npm。
- Git。
- PowerShell（Windows 本地開發建議）。
- 已啟動的後端：`http://localhost:8080/api`。

---

## 7. 安裝與啟動

```powershell
npm install
Copy-Item .env.example .env
npm.cmd run dev
```

預設前端 URL：

```text
http://127.0.0.1:5173
```

Vite proxy：

```text
/api -> http://localhost:8080
```

---

## 8. 環境變數

`.env.example`：

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_DID_SCRIPT_SRC=https://agent.d-id.com/v2/index.js
VITE_DID_CLIENT_KEY=
VITE_DID_AGENT_ID=
VITE_ENABLE_PREVIEW_AUTH=false
```

| Variable | 用途 | Production 注意事項 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL | 可使用 production API URL 或同域 `/api` reverse proxy |
| `VITE_DID_SCRIPT_SRC` | D-ID examiner script | 通常使用 D-ID 官方 script URL |
| `VITE_DID_CLIENT_KEY` | D-ID client key | 不要 commit 真實 key |
| `VITE_DID_AGENT_ID` | D-ID agent ID | 不要 commit 真實 agent ID |
| `VITE_ENABLE_PREVIEW_AUTH` | Local preview fallback | Production 必須是 `false` |

---

## 9. 常用命令

| Command | 用途 |
| --- | --- |
| `npm.cmd run dev` | 啟動 Vite dev server |
| `npm.cmd run build` | Type-check + production build |
| `npm.cmd run preview` | Preview built output |
| `npm.cmd run test` | Run Vitest tests |

---

## 10. 部署方式

SmartIELTS Frontend 是 static Vite frontend，部署 artifact 是：

```text
dist/
```

標準流程：

1. 在 hosting platform 設定 production environment variables。
2. 安裝依賴：`npm ci`。
3. 建置：`npm run build`。
4. 發佈 `dist/`。
5. 設定 SPA fallback：`/* -> /index.html`。
6. 設定 `/api` reverse proxy 或 `VITE_API_BASE_URL`。
7. 如前後端不同域，確認 backend CORS。
8. 如啟用 Speaking examiner，確認 D-ID allowed domain。

---

## 11. API Integration Boundary

Frontend API base path：

```text
/api
```

共用 response envelope：

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

Frontend 行為：

| Condition | Behavior |
| --- | --- |
| `code === 1` | Business success |
| `code === 0` | Business failure，顯示或傳遞 `msg` |
| HTTP `401` | 清除 token/session 並返回登入 |
| Multipart upload | 不手動設定 `Content-Type`，交由 browser 設定 boundary |

---

## 12. Speaking D-ID Examiner

Speaking examiner 使用：

```text
public/did-speaking-frame.html
```

React 以同源路徑載入：

```text
/did-speaking-frame.html
```

不要改成 `srcdoc`、`blob:`、`data:`、`file:` 或 React-rendered iframe content，避免 D-ID allowed domain 判斷得到 `origin null`。

---

## 13. Pre-Push Checklist

```powershell
npm.cmd run test
npm.cmd run build
git status --short --branch
```

確認：

- README 與 `.env.example` 同步。
- 架構、routes、API boundary 或 deployment 行為改動時，同步更新 `docs/frontend/frontend-overview.md`。
- `.env` 與 production secrets 沒有 commit。
- `VITE_ENABLE_PREVIEW_AUTH=false` 用於 production。
- Backend contract field names 沒有被前端 rename。

---

## 14. 相關連結

| Resource | Link |
| --- | --- |
| Main hub | [SmartIELTS](https://github.com/Andrew-Ng701/SmartIELTS) |
| Backend code | [SmartIELTS-backend](https://github.com/Andrew-Ng701/SmartIELTS-backend) |
| API contract | [docs/api/api-contract.md](https://github.com/Andrew-Ng701/SmartIELTS-backend/blob/main/docs/api/api-contract.md) |
| Frontend overview | `docs/frontend/frontend-overview.md` |
