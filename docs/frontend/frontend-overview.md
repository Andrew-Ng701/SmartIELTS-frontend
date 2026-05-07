# SmartIELTS Frontend Overview

Last Updated: 2026-05-07

Source Verified: project root, `package.json`, `vite.config.ts`, `tsconfig*.json`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, downloaded backend `frontend-api.md`

## Purpose

本文件是 SmartIELTS 前端專案的預設導覽文件，給維護者與 AI assistant 快速了解專案現況、架構方向、前後端邊界與 API 接入規則。

目前前端已有第一版學生端 UI 原型，但尚未接入 router、API client 或後端資料。本文件同時記錄「已存在的事實」與「後續開發應遵守的預設方向」，避免每次開發前重複掃描整個專案。

Storage location:

- Frontend project overview: `docs/frontend/frontend-overview.md`
- Project memory: `AGENTS.md`
- Frontend API contract reference: currently external at `C:\Users\ngand\Downloads\frontend-api.md`

Default lookup rule:

1. Read this file for frontend architecture, conventions, and implementation direction.
2. Read `AGENTS.md` for AI/Codex project memory and editing rules.
3. Read the frontend API contract before implementing API calls, auth, records, dashboard, upload, or AI-related flows.
4. Query source only when a detail is missing, stale, risky, or source lookup is clearly more efficient.

## Manual Update Mode

Update this file when frontend structure changes:

- new top-level folder, route group, feature module, state/store pattern, API client pattern, form/upload helper, test strategy
- major UI layout/navigation change that affects how future developers understand the app
- new frontend integration point such as auth persistence, dashboard SSE, OCR/PDF upload, audio upload, D-ID talk UI, or AI scoring display
- API response/type model changes that affect frontend contracts
- build tooling changes such as Vite, Tailwind, TypeScript, lint/test setup, or environment variables

Do not update this file for small component-local edits unless they change how future developers should navigate or reason about the project.

## Project Snapshot

- App type: React single-page frontend
- Framework/runtime tooling: Vite 7
- UI library: React 19 with React DOM 19
- Language: TypeScript 5.8, strict compiler settings
- Styling: Tailwind CSS v4 through `@tailwindcss/vite`
- Package manager: npm with `package-lock.json`
- Current app state: static English showcase UI prototype in `src/App.tsx`; no router, API client, persistent auth store, feature modules, form library, or test runner yet

Main entrypoints:

- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src/vite-env.d.ts`

Core config:

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `.env.example`

## Runtime And Config

Scripts:

- `npm.cmd run dev`: start Vite development server
- `npm.cmd run build`: run `tsc -b` and production Vite build
- `npm.cmd run preview`: preview built output

Development server:

- Preferred local frontend URL: `http://127.0.0.1:5173`
- Vite config sets `server.port = 5173`
- If the port is already occupied, Vite may choose the next available port

Backend connection:

- Backend default base URL: `http://localhost:8080/api`
- Vite dev proxy maps `/api` to `http://localhost:8080`
- Browser code should call `/api/...` in development when using the Vite proxy
- `.env.example` documents `VITE_API_BASE_URL=http://localhost:8080/api`

Tailwind:

- Tailwind v4 is loaded through the Vite plugin in `vite.config.ts`
- Global stylesheet imports Tailwind using `@import "tailwindcss";`
- Do not add a legacy Tailwind v3 `tailwind.config.js` or PostCSS flow unless the project explicitly migrates back to that setup

## Current Project Structure

Current source tree:

- `src/main.tsx`: React root creation and `StrictMode`
- `src/App.tsx`: single-file English showcase prototype covering Home, Auth, Dashboard, Reading, Listening, Writing, Speaking, Records, Profile, FAQ, Error, and global AI Agent through local state navigation
- `src/styles.css`: Tailwind import, light document theme, base font/form/button defaults, and template-like hover/zoom/reveal/dropdown/avatar/AI Agent interaction utilities
- `src/vite-env.d.ts`: Vite client type reference for importing image assets in TypeScript
- `src/assets/template`: selected extracted `WorldCourse` template images used by the UI prototype

Generated or dependency folders:

- `node_modules`: npm dependencies
- `dist`: production build output

Recommended future structure:

- `src/app`: app providers, route setup, global layout
- `src/api`: API client, endpoint wrappers, shared request/response helpers
- `src/features/auth`: login, register, logout, password change, auth state
- `src/features/user`: student profile, overview, user-facing pages
- `src/features/admin`: admin console pages and management flows
- `src/features/reading`, `src/features/listening`, `src/features/writing`, `src/features/speaking`: IELTS module flows
- `src/features/dashboard`: dashboard overview, AI ask/SSE, charts, insight panels
- `src/components`: reusable UI components that are not feature-owned
- `src/hooks`: shared React hooks
- `src/lib`: small framework-agnostic helpers
- `src/types`: shared TypeScript contracts only when multiple features need them

Keep feature-owned components, hooks, and types inside their feature folder until at least two features genuinely share them.

## Frontend Architecture

Frontend responsibilities:

- render screens and navigation
- collect user input
- manage local UI state such as loading, open panels, form drafts, filters, optimistic display, and client-only interaction state
- call backend APIs and display backend responses
- show validation and business errors from backend `msg`
- handle token storage and request authorization

Backend responsibilities:

- validate input
- enforce roles and ownership
- create IDs, timestamps, scores, statuses, token versions, and server-owned values
- evaluate answers and AI scoring
- persist records and status transitions
- return clear data so frontend does not duplicate business rules

Default implementation direction:

- Build a small API client before adding feature pages.
- Keep backend response types explicit and close to endpoint wrappers.
- Prefer feature modules over one large global component tree.
- Avoid adding global state until the same state is used across routes or feature boundaries.
- Keep UI components controlled by props and events; keep API orchestration in feature-level hooks or services.
- Do not move backend-owned business rules into the client to avoid one API call or patch over backend gaps.

## API Integration

Common response wrapper:

```ts
type Result<T> = {
  code: 0 | 1;
  msg: string | null;
  data: T;
};
```

Frontend handling rules:

- Treat `code === 1` as business success.
- Treat `code === 0` as business failure and show `msg` where appropriate.
- Do not rely on HTTP status alone for business success.
- Still handle HTTP 401 as auth failure: clear token and route to login.
- For multipart endpoints, do not manually set `Content-Type`; let the browser set the boundary.
- Use ISO strings for backend `LocalDateTime`, for example `2026-05-06T13:30:00`.

Pagination response shape:

```ts
type PageResult<T> = {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
};
```

Common status values:

- Role: `USER`, `ADMIN`
- Reading record: `in_progress`, `paused`, `submitted`, `auto_submitted`
- Listening record: `in_progress`, `paused`, `submitted`
- Writing input type: `TEXT`, `IMAGE`, `PDF`
- Writing AI status: `PENDING`, `SUCCESS`, `FAILED`
- Speaking session: `PENDING`, `STARTED`, `IN_PROGRESS`, `WAITING_FINAL_EVALUATION`, `COMPLETED`, `FAILED`
- Speaking record: `RECEIVED`, `PROCESSING`, `SCORED`, `FAILED`
- Speaking exam type: `FULL`

Backend-owned fields:

- `id`
- `userId`
- `createdTime`
- `deletedTime`
- `score`
- `status`
- record ownership
- AI result
- `tokenVersion`

Frontend should submit only the key data required for the backend to complete the action.

## Auth

Public endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`

Protected route prefixes:

- `/api/user/**`: requires `ROLE_USER`
- `/api/admin/**`: requires `ROLE_ADMIN`
- `/api/smartielts/dashboard/**`: requires JWT; user dashboard uses current user, admin dashboard may use `targetUserId`

Login/register success response contains:

- `data.token`
- `data.userId`
- `data.role`

Request auth header:

```http
Authorization: Bearer <data.token>
```

Token behavior:

- JWT claims include `userId`, `role`, and `tokenVersion`
- `POST /api/auth/logout` invalidates old tokens
- `PUT /api/auth/password` invalidates old tokens
- Frontend must not reuse old tokens after logout or password change
- On 401, clear auth state and navigate to login

Recommended auth storage:

- Start with one small auth module responsible for token persistence, current role, and logout cleanup.
- Avoid scattering direct `localStorage` access across feature code.
- Prefer one request interceptor/helper that attaches `Authorization` when a token exists.

## Feature Direction

Reading and Listening:

- User flow: list tests, get detail, start session, pause/resume, submit answers, view records.
- Admin flow: manage tests, part groups, questions, audio/images, and records.
- Frontend should not duplicate answer judging or scoring logic.

Writing:

- Support text, image, and PDF input types.
- Upload and multipart requests must preserve browser-managed boundaries.
- AI scoring status is backend-owned; frontend displays status and result.

Speaking:

- Support exam/session lifecycle, audio upload, record processing, final scoring, and D-ID talk status when exposed.
- Session and record status transitions are backend-owned.

Dashboard:

- Dashboard APIs may include overview, preload/config, AI ask, SSE, structured query, and review/rewrite flows.
- Frontend should isolate streaming/SSE handling inside dashboard-specific services or hooks.

## UI And Styling

Current UI:

- 明亮教育平台風格的英文 showcase prototype，參考 `WorldCourse` 模板的首頁節奏、課程卡片、固定導覽、成就區、testimonial 與 footer。
- 可見 UI 文案已改為英文；中文仍可保留在本文件與協作說明中。
- 使用從 `C:\Users\ngand\Downloads\202401082.rar` 解出的模板圖片，包括 hero、course cards、auth illustration、stats icons、background 與 testimonials。
- Home 現在只做品牌與功能展示：hero、module previews、AI Agent showcase、stats、testimonials、footer；不再放實際 Dashboard、Records 或 FAQ sections。
- Header navbar 使用暖白 `#FCFBF8` 背景與 `#E8E1DA` 底部分隔線；Home、Modules dropdown、Dashboard、Records、FAQ、Login/avatar 保持網站式導覽。Nav 預設文字為 `#222222`，hover 使用 `#E56A2E`，active 使用 `#FFF1E8` 淡橘膠囊背景與 `#C9551C` 2px 底線。
- Login 使用本地 `isLoggedIn` mock state；Auth `Continue` 後 Header Login 變為預設用戶頭像，avatar hover/focus 顯示 View Profile、Settings、Logout；預設 avatar 來源為 `src/assets/default-avatar.jpeg`，目前使用使用者提供的第二張頭像圖。
- FAQ 是獨立 page；Profile 由 avatar dropdown 進入，顯示預設 avatar、account details、update profile、display name 編輯與本地頭像 preview UI，不再顯示 Current focus 或 profile 內 logout。
- Settings 是獨立 page；目前提供靜態 Basic settings 與 Change password UI，不串接真實 API 或持久化狀態。
- 全站保留可拖動 `AI Agent` floating button；目前使用由 `C:\Users\ngand\Downloads\images.png` 製作的裁切透明圖標 `src/assets/ai-agent-icon.png`，名稱顯示在圖片下方。點擊打開右側 drawer，展示聊天訊息、quick prompt chips 與輸入框；已移除說明型文案與 Dashboard AI button。此 UI 不發送真實請求。
- `src/styles.css` 以 root font-size 控制整體文字與 rem-based UI，目前為 `89.25%`，相對上一版 `85%` 放大 5%；Dashboard `Score trend` 圖表已縮小高度與 bar 高度。
- Brand 使用裁切後的 `src/assets/brand-icon-cropped.png`，移除外圍多餘空白並保留 logo 中央負空間。
- 功能頁仍為靜態展示頁，移除了面向使用者的 backend/API/implementation planning 文案。
- UI 只借模板版型與教育平台氛圍，不引入 shop、cart、checkout、price plan 等不符合 SmartIELTS 後端的流程。
- `src/styles.css` 提供 template-like hover effects：card lift、nav underline、button arrow slide、image reveal overlay、testimonial avatar hover polish、dropdown/avatar menu、AI Agent drawer，以及 `prefers-reduced-motion` fallback；`.zoom-effect` 保留容器與 transition，但圖片 hover 不再放大。
- No committed design system yet; current shared UI is component-local inside `src/App.tsx`.

Default UI rules:

- Use Tailwind utility classes for layout and component styling.
- Keep shared components small and reusable.
- Prefer accessible native controls before custom controls.
- Keep page sections unframed unless the UI element is a repeated card, modal, or focused tool surface.
- Do not add broad UI libraries until the app has enough repeated interaction patterns to justify one.

## Types And Naming

TypeScript naming:

- React components: `UpperCamelCase`
- Type aliases, interfaces, enums: `UpperCamelCase`
- functions, variables, hooks, props, local state: `lowerCamelCase`
- hooks: `useXxx`
- shared string constants: `UPPER_SNAKE_CASE`
- environment variable names: `VITE_UPPER_SNAKE_CASE`

API contract naming:

- Preserve backend field names exactly in API types.
- Do not rename DTO/VO fields in the client unless a mapper clearly separates server contract from UI view model.
- Prefer explicit union types for known status strings.

## Testing

Current state:

- No test runner is configured.
- Build verification is currently `npm.cmd run build`.

Recommended test direction:

- Add Vitest for unit tests when shared helpers, API parsing, or state logic appear.
- Add React Testing Library for component behavior that has branching UI states.
- Add Playwright only when route-level flows, auth navigation, uploads, or streaming UI need browser verification.
- Keep tests focused on frontend behavior; do not re-test backend scoring or permission rules in client tests.

Minimum checks after documentation-only changes:

- Confirm expected docs files exist.
- Confirm key headings are present.
- Run `npm.cmd run build`.

## Current Gaps

The following pieces are intentionally not implemented yet:

- router and route guards
- API client and typed endpoint wrappers
- auth store/token persistence
- feature module folders
- form validation approach
- upload helpers
- UI component library/design system
- test runner and test utilities
- lint/format tooling
- dashboard SSE client
- real backend data fetching for the static UI prototype
- persistent login/auth state beyond the current local mock state
- real AI Agent requests behind the floating assistant drawer

When implementing these, update this overview so future work can start from the current architecture instead of rediscovering it.
