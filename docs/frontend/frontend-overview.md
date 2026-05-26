# SmartIELTS Frontend Overview

Last Updated: 2026-05-21

Source Verified: project root, `package.json`, `vite.config.ts`, `tsconfig*.json`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/api`, `src/contracts`, `src/app`, `src/features`, `public/did-speaking-frame.html`, downloaded backend `api-contract.md`

## Purpose

This file records the SmartIELTS frontend architecture, API integration boundaries, feature ownership, and production constraints. It is the first local reference after `AGENTS.md` when deciding where a frontend change belongs.

The frontend API workspace now contains typed backend integration for auth, profile, password change, user/admin console, records, admin users, Reading/Listening user practice, Writing user submit, Reading/Listening/Writing/Speaking admin content, dashboard AI ask/SSE/executive summary, and the production iframe-based Speaking examiner host. User Speaking intentionally remains same-origin iframe based through production; `speakingApi` keeps the documented backend lifecycle wrappers available for later session orchestration behind that iframe-first UI.

Storage location:

- API workspace: `C:\SmartIELTS-frontend(api)`
- Backup/reference workspace: `C:\SmartIELTS-frontend`
- Frontend project overview: `docs/frontend/frontend-overview.md`
- Project memory: `AGENTS.md`
- Frontend API contract reference: currently external at `D:\web-ai-project\SmartIELTS\docs\api\api-contract.md`

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
- Current app state: English single-page frontend with a thin `src/App.tsx` page orchestrator, browser-history-backed page routes, protected-page gates, shared form/file validation helpers, and typed API/contract scaffolding for backend integration; no external router or form library yet
- Current implementation scope: staged API integration. Auth, profile, settings password update, console, records, admin users, admin content, Reading/Listening/Writing user flows, dashboard AI ask/SSE/executive summary, D-ID iframe Speaking runtime configuration, and shared form/upload validation now call or prepare documented backend/runtime boundaries. Reading/Listening admin authoring now uses the richer API-backed task builder with a Reading passage editor, insertion-position question blocks, local student preview, structured IELTS question data, `allow_audio_seek` persistence for Listening tests, click-to-fullscreen image previews, and post-save question media upload through the existing admin multipart endpoints. User Speaking intentionally remains same-origin iframe based through production and is kept separate from the backend Speaking session flow until a later release. User-facing UI and admin-facing UI must stay separate in navigation, page flow, runtime data, and visible actions.

Main entrypoints:

- `index.html`
- `public/did-speaking-frame.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src/vite-env.d.ts`
- `src/app/bootstrapApi.ts`
- `src/app/appRoutes.ts`
- `src/api/client.ts`
- `src/contracts/common.ts`

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
- `npm.cmd run test`: run focused Vitest API contract tests
- `npm.cmd run preview`: preview built output

Development server:

- Preferred local frontend URL: `http://127.0.0.1:5173`
- Vite config sets `server.port = 5173`
- If the port is already occupied, Vite may choose the next available port

Backend connection:

- Backend default base URL: `http://localhost:8080/api`
- Vite dev proxy maps `/api` to `http://localhost:8080`
- Browser code should call `/api/...` in development when using the Vite proxy
- `.env.example` documents `VITE_API_BASE_URL=http://localhost:8080/api`, `VITE_DID_SCRIPT_SRC`, `VITE_DID_CLIENT_KEY`, `VITE_DID_AGENT_ID`, and `VITE_ENABLE_PREVIEW_AUTH=false`

Tailwind:

- Tailwind v4 is loaded through the Vite plugin in `vite.config.ts`
- Global stylesheet imports Tailwind using `@import "tailwindcss";`
- Do not add a legacy Tailwind v3 `tailwind.config.js` or PostCSS flow unless the project explicitly migrates back to that setup

## Current Project Structure

Current source tree:

- `src/app`: app bootstrap, route constants, browser-history route mapping, navigation constants, shared app/page types, and `AppShell` for the public header, module dropdown, avatar menu, and mobile nav
- `src/api`: API client, error classes, endpoint wrappers, multipart helper usage, focused API contract tests, and dashboard SSE reader entrypoint
- `src/contracts`: backend-facing DTO/query/VO TypeScript contracts; preserve backend field names exactly
- `src/features/auth`: auth session storage helper for token, user id, role, expiry and refresh metadata; `AuthPage` owns API-first login/register UI plus environment-gated preview fallback, and `SettingsPage` owns password-change UI and `PUT /api/auth/password`
- `src/features/user`: USER-facing feature folders for console, profile, records, practice, reading, listening, writing, and speaking; `features/user/console` now owns `DashboardPage` plus console-to-dashboard mapping, `features/user/profile` owns `ProfilePage` plus profile target-band helpers, `features/user/records` owns `RecordsPage`, `RecordDetailPage`, record filters/table/pagination, records API view-model mapping, and unified record detail review mapping, `features/user/practice` owns the shared Reading/Listening `PracticePage` plus practice API view-model helpers, `features/user/writing` owns `WritingPage` plus writing API view-model helpers, and `features/user/speaking` owns `SpeakingPage`, D-ID iframe URL constants, speaking exam lifecycle mappers, and related contract tests
- `src/features/public`: public-facing pages and presentation helpers; `LandingPage`, `LoginRequiredPage`, `FaqPage`, and `ErrorPage` own the public showcase, login-required gate, FAQ accordion, module cards, stats/admin intro, and footer UI.
- `src/features/admin/console`: Admin Console shell and overview dashboard flow; `AdminConsolePage` owns the admin header, internal view navigation, initial admin API orchestration, toast/fullscreen editor state, and Writing/Speaking CRUD handoff. `AdminOverviewPage` owns backend admin console snapshot rendering, module record charts, AI failure lists, leaderboards, and content library health counts. `adminOverviewModel.ts` maps `/api/admin/console` payloads into the overview snapshot.
- `src/features/admin/exams`: shared Reading/Listening admin authoring flow; `AdminReadingListeningPage` owns the active Reading/Listening test list, deleted test list, basic test editor, task/question editing, and save/delete/restore orchestration through Reading/Listening admin APIs. `adminExamModel.ts` maps backend tests into the admin exam view model and builds upsert payloads.
- `src/features/admin/users`: admin users list and detail flow; `AdminUsersPage` owns active/deleted users view, users KPIs, delete/restore orchestration, and detail entry. `AdminUserDetailPage` loads user-scoped records through `POST /api/admin/users/{userId}/records` and opens record detail through `GET /api/admin/users/{userId}/records/{moduleType}/{recordId}`.
- `src/features/admin`: ADMIN-facing feature folders for console, users, records, reading, listening, writing, and speaking; `features/admin/records` now owns `AdminRecordsPage`, module summary mapping, and `AdminRecordDetailPage`. The page reuses shared records controls, calls admin record delete/restore endpoints, and opens global admin record detail through `GET /api/admin/records/{module}/{recordId}`.
- `src/features/admin/writing`: admin Writing authoring boundary; `adminWritingModel.ts` creates Task 1/Task 2 drafts, maps backend Writing question payloads, and builds admin upsert payloads with Vitest coverage. `AdminWritingAuthoring.tsx` owns the Writing list, deleted-items page, and editor form UI.
- `src/features/admin/speaking`: admin Speaking authoring boundary; `adminSpeakingModel.ts` creates Topic 1/Topic 2-3 drafts, maps backend Speaking question payloads, and builds admin upsert payloads with Vitest coverage. `AdminSpeakingAuthoring.tsx` owns the Speaking topic list, deleted-items page, and editor form UI.
- `src/features/dashboard-agent`: dashboard AI ask/preload/SSE/executive summary feature boundary; `DashboardAgent` owns the floating AI Agent launcher, drawer state, drag position, chat messages, quick prompts, process trace, and `/api/smartielts/dashboard/{user|admin}/ask-sse` orchestration with non-SSE fallback. `ExecutiveSummaryBadge` loads `/api/smartielts/dashboard/{user|admin}/executive_summary` for the User Dashboard and Admin Dashboard title areas.
- `src/components`: shared non-feature UI folders for layout, feedback, small UI primitives, audio controls, and the shared Reading/Listening student question renderer used by practice pages, record review pages, admin user record review, and admin preview. The shared exam renderer owns IELTS-style question cards plus the bottom question navigation bar; practice status colors are white for unanswered, green for marked, and black for answered, while review status colors are blue for correct and red for wrong. Review mode keeps the same answer-input shapes as the live exam and disables editing.
- `src/hooks`, `src/lib`, `src/types`: shared hooks including interaction guards for debounced callbacks and async action locks, framework-agnostic helpers, form/file validation utilities, and shared types
- `src/main.tsx`: React root creation and `StrictMode`
- `src/App.tsx`: thin page-state orchestrator for browser-history page selection, auth session handoff, protected-page gate selection, module card metadata, and feature page mounting. Public shell chrome is delegated to `src/app/AppShell.tsx`; public, auth, dashboard-agent, user, admin, records, practice, writing, and speaking pages are feature-owned modules. Older practice/admin prototype helpers, record-detail preview code, and AI Agent drawer logic have been removed from the active app shell.
- `src/styles.css`: Tailwind import, light document theme, base font/form/button defaults, and template-like hover/zoom/reveal/dropdown/avatar/AI Agent interaction utilities
- `src/vite-env.d.ts`: Vite client type reference for importing image assets in TypeScript
- `src/assets/template`: selected extracted `WorldCourse` template images used by the UI prototype
- `public/did-speaking-frame.html`: same-origin static host page for the D-ID Speaking Examiner script; React loads it through an iframe at `/did-speaking-frame.html`

Generated or dependency folders:

- `node_modules`: npm dependencies
- `dist`: production build output

Current staged structure:

- `src/app`: app providers, route setup, global layout
- `src/api`: API client, endpoint wrappers, shared request/response helpers
- `src/contracts`: backend DTO/query/VO contracts
- `src/features/auth`: login, register, logout, password change, auth state
- `src/features/user`: student console, profile, records, and user-facing IELTS practice pages
- `src/features/admin`: admin console, users, records, and admin-facing IELTS management flows
- `src/features/dashboard-agent`: dashboard AI ask/SSE/preload
- `src/components`: reusable UI components that are not feature-owned
- `src/hooks`: shared React hooks
- `src/lib`: small framework-agnostic helpers
- `src/types`: shared TypeScript contracts only when multiple features need them

Keep feature-owned components, hooks, and types inside their feature folder until at least two features genuinely share them.
Keep USER and ADMIN page-level flows in separate feature trees. Shared UI primitives may move to `components`, but role-specific navigation and workflows must remain separate.

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

- Use the existing API client in `src/api/client.ts` before adding feature pages.
- Keep backend response types explicit and close to endpoint wrappers.
- Prefer role-separated feature modules over one large global component tree.
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
- Still handle HTTP 401 as auth failure: clear token, reset local login state, and route to the public landing page. HTTP 403 remains a permission/API error so submit or admin actions cannot incorrectly log the user out.
- For multipart endpoints, do not manually set `Content-Type`; let the browser set the boundary.
- Use ISO strings for backend `LocalDateTime`, for example `2026-05-06T13:30:00`.

Implemented API layer:

- `src/api/client.ts`: base request helpers for JSON, multipart and dashboard SSE stream reads.
- `src/api/errors.ts`: `ApiError`, `AuthRequiredError`, and message extraction.
- `src/api/authApi.ts`, `userApi.ts`, `adminUsersApi.ts`, `consoleApi.ts`, `recordsApi.ts`, `readingApi.ts`, `listeningApi.ts`, `writingApi.ts`, `speakingApi.ts`, `dashboardApi.ts`, `adminApi.ts`: typed endpoint wrappers.
- `src/contracts/*`: backend-facing types for common wrappers, auth, user/admin users, console, unified records, IELTS modules, dashboard, and generic admin wrappers.

Boundary rule:

- `consoleApi` is only for deterministic full-page console payloads: `/api/user/console` and `/api/admin/console`.
- `dashboardApi` is only for documented `/api/smartielts/dashboard/**` AI ask, preload, executive summary, and SSE flows. Do not call undocumented `overview_visual` routes.
- `recordsApi` should be the first choice for the user records hub and cross-module record detail/delete/restore.
- API wrappers must not expose removed routes from `api-contract.md`, including module-specific record endpoints, `/user/reading/tests/{testId}`, `/user/listening/tests/{testId}`, user single-question Writing/Speaking detail routes, or generic `/admin/exams/**`.

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

- Use `src/features/auth/authSession.ts` as the small auth module responsible for token persistence, current role, and logout cleanup.
- Avoid scattering direct `localStorage` access across feature code.
- `src/app/bootstrapApi.ts` configures the API client with the auth token provider and 401 cleanup callback.

## Feature Direction

Reading and Listening:

- User flow: list tests, get detail, start session, pause/resume, submit answers, view records.
- Admin flow: manage tests, part groups, questions, audio/images, and records.
- Current admin authoring prototype supports individual question-block image attachments with local preview and fullscreen viewing. Question titles follow the selected question type and are not separately entered in the active Reading/Listening editor. New Reading/Listening tasks start with no question blocks; the builder first shows one Add question action, then shows explicit insert-above, insert-between, and insert-below controls after questions exist. Reading exposes a passage editor from the Current task panel, with side-by-side edit and formatted preview panes. Reading authoring includes multiple choice, TRUE/FALSE/NOT GIVEN, matching, summary/completion, and table completion question blocks. Listening authoring includes multiple choice, TRUE/FALSE/NOT GIVEN, completion, matching, table completion, and diagram/chart label question blocks. The Reading/Listening editor uses a left Current Task summary panel and the browser page as the single scroll container.
- Frontend should not duplicate answer judging or scoring logic.

Writing:

- Support text, image, and PDF input types.
- Writing questions and embedded writing record metadata include nullable `chartType` for Academic Task 1 chart classification; Task 2 should send and display it as null/absent.
- Upload and multipart requests must preserve browser-managed boundaries.
- AI scoring status is backend-owned; frontend displays status and result.

Speaking:

- Support exam/session lifecycle, audio upload, record processing, final scoring, and D-ID talk status when exposed.
- Session and record status transitions are backend-owned.

Dashboard:

- Dashboard APIs may include overview, preload/config, AI ask, SSE, structured query, and review/rewrite flows.
- Frontend should isolate streaming/SSE handling inside dashboard-specific services or hooks.

## Current Feature Map

This section records the current feature-owned app surface. `src/App.tsx` is now a thin orchestrator for browser-history page selection, auth handoff, protected-page gating, module metadata, and feature page mounting. Public shell chrome is delegated to `src/app/AppShell.tsx`, and the floating AI Agent is owned by `src/features/dashboard-agent/DashboardAgent.tsx`.

### Global Navigation And Auth

- `LandingPage` is owned by `src/features/public/PublicPages.tsx`. Home remains a public showcase for brand, module previews, AI Agent positioning, exam-oriented stats, admin intro, and footer content.
- `AuthPage` is owned by `src/features/auth/AuthPage.tsx`. It uses API-first auth: regular email/password calls `/api/auth/login` or `/api/auth/register` and stores JWT session data. Local `user` and `admin` preview inputs are available only when `VITE_ENABLE_PREVIEW_AUTH=true`, which must stay disabled for production. Email/password fields use shared validation before API submit.
- `appRoutes.ts` maps local page ids to browser paths and back. `App.tsx` initializes from `window.location.pathname`, pushes/replaces history on app navigation, and listens for `popstate`.
- `LoginRequiredPage` is owned by `src/features/public/PublicPages.tsx` and gates Dashboard, Records, Reading, Listening, Writing, Speaking, Profile, Settings, and unauthenticated Admin Console access when no user session is active.
- Public/USER navigation uses the website header through `AppShell`; ADMIN uses the separate Admin Console header and does not show student navigation.
- USER avatar dropdown links to Profile, Settings, and Logout.

### Dashboard Agent

- `DashboardAgent` is owned by `src/features/dashboard-agent/DashboardAgent.tsx` and owns the floating launcher, drag position, drawer open state, chat messages, quick prompts, process trace, and ask orchestration.
- Logged-in USER requests prefer `/api/smartielts/dashboard/user/ask-sse`; logged-in ADMIN requests prefer `/api/smartielts/dashboard/admin/ask-sse`.
- If the SSE stream cannot be opened, the drawer falls back to `/api/smartielts/dashboard/{user|admin}/ask` and renders the backend response or API error in the same chat stream.
- The drawer displays backend/API errors in the chat stream and does not expose hidden chain-of-thought.
- `ExecutiveSummaryBadge` is shared by the User Dashboard and Admin Overview title rows. It calls the dashboard-controller executive summary endpoint for the active role, shows an explicit spinner while loading, and keeps a subtle live animation after content is loaded.

### User Dashboard

- `DashboardPage` is owned by `src/features/user/console/DashboardPage.tsx` and calls `/api/user/console`.
- The page title row also calls `/api/smartielts/dashboard/user/executive_summary?timeRange=30d` through `ExecutiveSummaryBadge`.
- `dashboardModel.ts` maps backend console payloads into the dashboard view model and has Vitest coverage.
- The dashboard renders profile snapshot, active/deleted/total records, overall average, consecutive login days, target bands, module stats, score radar, score trend, module activity, and insight cards.
- Charts are CSS/HTML visualizations; no chart library is installed.

### User Records

- `RecordsPage` is owned by `src/features/user/records/RecordsPage.tsx` and uses unified `/api/user/records` for list data.
- Delete and restore use unified `/api/user/records/{moduleType}/{recordId}` endpoints.
- `RecordDetailPage` calls `GET /api/user/records/{moduleType}/{recordId}` and renders backend review payloads through `recordDetailModel.ts`.
- Reading/Listening detail uses `examPageReview` and renders a read-only exam-page review by reusing the same student answer controls, passage pane, tape player, and section/passage tabs used by live practice. Review pages use an exam-like top bar with exit, current passage/section score, and full-exam score, and do not show the live exam bottom question navigation. Reading and Listening record review share the same 5:5 split layout and question rendering for every question type; Listening uses the left pane for the active section tape instead of the live-practice notes pane. User answers are shown inside the original input, radio, checkbox, select, table, matching, or blank UI; correct answers are blue, wrong user answers are red, and wrong fill-blank or matching/select items show the correct answer inline next to the answer control instead of in a lower result panel. TRUE/FALSE/NOT GIVEN and multiple-choice review can mark both the wrong user option in red and the correct option in blue in the same row/card without applying colored row backgrounds. Record review keeps grouped questions together, such as Q1-3 or Q4-5, instead of repeating the same question group. The record detail mapper supports one-to-one exam replay payloads from `detail` or `review`, including Reading `parts[].groups[].passages[]` titles/content/questions and Listening `testAudio`, `partGroupAudios`, nested group `audios`, `allowAudioSeek`, nested questions, and table completion metadata from `optionsJson`. Admin record detail reuses the same review layout.
- Writing detail uses `writingReview`; Speaking detail uses `speakingSessionReview`. Writing replay preserves question images, renders image/PDF answer attachments below the answer box, shares one click-to-preview wheel-zoom viewer for question images and answer attachments, and keeps the answer text rule where OCR/PDF `extractedText` is preferred over typed `textContent` when present.
- `RecordControls.tsx` owns shared filters/table/pagination used by user records and reused by admin records where appropriate.

### User Reading And Listening Practice

- `PracticePage` in `src/features/user/practice/PracticePage.tsx` owns the shared Reading/Listening user list and exam workspace.
- It calls `readingApi` or `listeningApi` to list tests, start sessions, fetch session detail, pause/resume sessions, and submit answers. The list also reads `/api/user/records/overview` for the active module so completed attempts can show Completed status and score next to each task. Reading and Listening tests expose pause controls only when backend `allowPause` / `allow_pause` enables pausing. Listening tests respect backend `allowAudioSeek` / `allow_audio_seek` by disabling manual tape progress changes when seeking is not allowed.
- The current workspace keeps answer/notes/timer/audio UI state locally during an attempt; backend remains responsible for scoring and record state. Submit requires a backend `sessionId`; multiple-answer questions use the backend `answers: string[]` field while single-answer questions use `answer`, and multi-answer question ranges can display as `Q28-30` when the backend provides `questionNoEnd`. The shared student question renderer supports a focused single-question mode and a full-section list mode for Listening, with clear-current-answer behavior, radio/checkbox options, TRUE/FALSE/NOT GIVEN radio controls, inline completion blanks that preserve source spacing and line breaks, backend-backed Reading/Listening table completion rows/header styling, and unified Matching answer banks.
- Pause/Resume is wired to the backend session endpoints when the test enables pause; pausing stops the local countdown/audio state until resume succeeds.

### User Writing

- `WritingPage` in `src/features/user/writing/WritingPage.tsx` owns user Writing question selection and answer submission.
- `writingModel.ts` owns backend question mapping, file split helpers, record labels, and word count helpers with Vitest coverage.
- The Writing question list can filter by Task 1 or Task 2 through the documented `/api/user/writing/questions?taskType=...` query.
- Submit uses multipart `/api/user/writing/questions/{questionId}/submit` and preserves browser-managed boundaries.
- Writing attachments use `src/lib/fileValidation.ts` before submit: image/PDF only, no more than 10 files, max 10 MB per file, and only one PDF.

### User Speaking

- `SpeakingPage` in `src/features/user/speaking/SpeakingPage.tsx` remains iframe-only by design through production.
- Clicking `Open examiner` opens the same-origin `/did-speaking-frame.html` D-ID examiner iframe. Do not replace it with `srcdoc`, `blob:`, `data:`, `file:`, or a React-rendered frame because that can produce `origin null` or StrictMode-related D-ID issues.
- D-ID script source, client key, agent ID, and target ID are passed from React to the iframe URL. The static frame creates the D-ID script at runtime instead of hardcoding production credentials in `public/did-speaking-frame.html`.
- `speakingApi` already exposes the documented backend lifecycle wrappers: list questions, start exam, next question, submit answer multipart, session summary, talk status, and upload-audio multipart.
- User Speaking deliberately does not call those lifecycle wrappers in the current release. Full backend Speaking session orchestration, audio-answer submission UI, and platform Speaking records are future work behind the iframe-only examiner surface.

### Profile, Settings, FAQ

- `ProfilePage` calls `/api/user/profile` and `/api/user/profile-picture`, managing account details, display name, avatar upload, and IELTS target bands. Display name and uploaded avatar data URLs are also cached per user id in `profileCache.ts` so the header avatar menu can update immediately after profile changes.
- `ProfilePage` uses shared form/file validation for email, display name, target bands, and avatar image size/type before calling APIs.
- `SettingsPage` calls `PUT /api/auth/password`; shared validation enforces current/new/confirmed password fields before submit, and success clears local auth session and returns the user to login.
- `FaqPage` is owned by `src/features/public/PublicPages.tsx`.

### Admin Overview, Users And Records

- `AdminConsolePage` owns the Admin Console shell, internal tab state, initial backend data loading, toast state, and fullscreen Writing/Speaking editor handoff.
- `AdminOverviewPage` renders `/api/admin/console` data through `adminOverviewModel.ts`.
- `AdminOverviewPage` also calls `/api/smartielts/dashboard/admin/executive_summary?timeRange=30d` through `ExecutiveSummaryBadge` in the dashboard title row.
- `AdminUsersPage` owns active/deleted user views, consecutive login day display from `/api/admin/users/list`, and user delete/restore calls. `AdminUserDetailPage` loads user-scoped records and record detail through admin user endpoints.
- `AdminRecordsPage` owns global admin records list/filter/pagination/delete/restore. `AdminRecordDetailPage` loads detail through `GET /api/admin/records/{module}/{recordId}`.

### Admin Reading And Listening Authoring

- `AdminReadingListeningPage` owns Reading/Listening admin test list, deleted list, builder/passage/transcript/preview editor modes, insertion-position question creation, question editing, and save/delete/restore orchestration. New tasks are intentionally empty until the admin chooses Add question, then the builder exposes insert-above, insert-between, and insert-below actions around existing question blocks. Admin preview adapts draft questions into the same shared student question renderer used by live Reading/Listening practice. Listening authoring exposes a manual transcript page from the Tape assignment row; whole-test tape mode edits one test-level transcript, while task tape mode edits the selected task transcript. The Reading/Listening question editor no longer exposes per-question score input; the system score is derived from question units. Active editor drafts are backed up in `localStorage` per module so a local draft can be restored after an interrupted authoring session; transcript text is persisted in the draft, while file objects are not persisted and must be selected again.
- `adminExamModel.ts` maps backend Reading/Listening tests, including top-level `partGroups` and nested `parts[].groups[]` detail responses, creates drafts, calculates question counts/scores, and builds full-save payloads with structured IELTS question data for multiple choice, TRUE/FALSE/NOT GIVEN, unified Matching, summary/completion, Reading/Listening table completion, and Listening diagram/chart labels. Multiple-choice `Single scored question` stores one question that may require multiple selected options, while `Multiple scored questions` counts one unit per correct option and persists ranged `questionNoStart` / `questionNoEnd` metadata. Blank accepted answers in admin authoring use newline-separated variants before being saved to `acceptedAnswersJson`, allowing commas and full-width punctuation inside one accepted answer. Reading matching authoring exposes one Matching type; legacy matching heading/information payloads are normalized to `MATCHING`.
- Reading/Listening question image attachments and Listening MP3 files preview locally while editing. Listening audio selection keeps the original MP3 file for upload and lets the admin continue authoring while the selected file waits for save. On save, the page follows the backend full-save contract in phases: create/update the test shell, sync part groups to obtain backend ids, sync Reading passages to obtain passage ids, then sync questions. Matching question images plus full-test or task-level Listening audio upload in the background through the existing `/api/admin/reading/**` and `/api/admin/listening/**` multipart endpoints when backend ids are available. Listening full-save payloads include `audios[].transcriptText` for non-blank manual transcripts, using test-level audio when one tape applies to the whole test and `partGroupId` audio when one tape applies to one task. Multipart Listening audio uploads also send non-blank `transcriptText`. Listening full-save payloads include the test id on part groups/questions, and new empty task placeholders are omitted until they contain questions, material, transcript text, or persisted ids; audio-only placeholders do not create empty part groups. Media upload errors are reported after core test content is saved instead of making the whole save appear to fail. Part-group and question images are both limited to one uploaded image per target.

### Admin Writing And Speaking Authoring

- `AdminWritingAuthoring.tsx` owns Writing list, deleted-items page, and editor form UI. `adminWritingModel.ts` maps backend payloads and builds upsert DTOs with Vitest coverage, including Task 1 `chartType` and null chart type for Task 2. Admin Writing question images are saved after create/update through the documented multipart replacement endpoint, then the question is read back so management lists and previews use persisted backend media.
- `AdminSpeakingAuthoring.tsx` owns Speaking topic list, deleted-items page, and editor form UI. `adminSpeakingModel.ts` maps backend payloads and builds upsert DTOs with required `question_text`, `display_order`, and `active` fields covered by Vitest.

## UI And Styling

Current UI:

- The product remains an English, bright education-platform UI inspired by the `WorldCourse` template rhythm, with warm white chrome, orange active/hover accents, module cards, exam/dashboard stats, admin introduction, footer, and a floating AI Agent.
- Visible UI copy stays English. Chinese is used in project docs and collaboration notes only.
- Home is a public showcase only: brand hero, module previews, AI Agent showcase, exam/dashboard-oriented stats, admin introduction, and footer. It does not embed actual Dashboard, Records, FAQ sections, or user testimonials.
- Public/USER header navigation is website-style through `AppShell`: Home, Modules dropdown, Dashboard, Records, FAQ, and Login/avatar. ADMIN uses the separate Admin Console header and does not show student navigation.
- Dashboard is API-backed through `/api/user/console` and displays learner profile snapshot, record counts, average score, target bands, module stats, score radar/trend, activity, and insights. It must not include admin entry points.
- Auth is API-first: regular credentials call backend auth endpoints and store JWT session metadata. Preview auth is environment-gated through `VITE_ENABLE_PREVIEW_AUTH=true` and must remain off in production.
- Records is API-backed through unified user records endpoints, with active/deleted scope, module/status filters, sorting, pagination, detail, delete, and restore flows.
- Reading/Listening/Writing user module pages are API-backed for list/start/session/submit where wrappers are already connected. Per-attempt answer/timer/notes/audio UI state remains local until submitted.
- Speaking user flow is intentionally iframe-only for the current release: clicking `Open examiner` opens the same-origin `/did-speaking-frame.html` D-ID examiner iframe. Do not convert it to `srcdoc`, `blob:`, `data:`, `file:`, or React-rendered frame.
- Admin Console contains Overview, Users, Records, Reading, Listening, Writing, and Speaking tabs. Overview/users/records/content save/delete/restore flows use `/api/admin/**` wrappers where available. Local preview, draft, image/audio preview, and editor helper state remain frontend interaction concerns.
- User-facing pages must present learner practice, profile, records, and User Console only. Admin-facing pages must present management overview, users, content, records, module health, and Admin Console only.
- `DashboardAgent` owns the floating AI Agent launcher and drawer. It calls dashboard ask endpoints after login and shows errors in the drawer when unavailable.
- `src/styles.css` provides global base styles and template-like hover effects: card lift, nav underline, button arrow slide, image reveal overlay, dropdown/avatar menu, AI Agent drawer/chat UI, and `prefers-reduced-motion` fallback.
- No committed design system exists yet; shared UI is currently split between feature-owned components, `src/app/AppShell.tsx`, global styles, and small placeholder folders under `src/components`.
- Do not add shop, cart, checkout, pricing plan, backend implementation notes, API payload dumps, testing notes, or developer planning text to visible product UI.

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

- Vitest is configured for focused API contract tests.
- Build verification is currently `npm.cmd run build`.
- Test verification is currently `npm.cmd run test`.

Recommended test direction:

- Add/extend Vitest tests when API wrappers, parsing helpers, mapping logic, or state helpers change.
- Add React Testing Library for component behavior that has branching UI states.
- Add Playwright only when route-level flows, auth navigation, uploads, or streaming UI need browser verification.
- Keep tests focused on frontend behavior; do not re-test backend scoring or permission rules in client tests.

Minimum checks after documentation-only changes:

- Confirm expected docs files exist.
- Confirm key headings are present.
- Run `npm.cmd run build`.

## Current Gaps

The following pieces are intentionally not implemented yet:

- UI component library/design system
- lint/format tooling
- broad component behavior tests for API-backed UI states
- full backend Speaking session orchestration, platform Speaking records, and audio-answer submission UI behind the production iframe host

When implementing these, update this overview so future work can start from the current architecture instead of rediscovering it.
