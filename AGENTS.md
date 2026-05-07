# Project Memory

## 語言與命名

- 文件、說明、註解與協作溝通優先使用中文；技術名詞、API field、TypeScript symbol、套件名保留英文。
- 優先跟隨現有專案風格。若某個 module 已有明確慣例，新程式碼應保持一致，除非該慣例明顯影響可維護性或 API 相容性。
- React component 使用 `UpperCamelCase`，例如 `LoginPage`、`ReadingSessionPanel`。
- TypeScript type、interface、enum 使用 `UpperCamelCase`。
- function、parameter、local variable、一般 object field、React props、state value 使用 `lowerCamelCase`。
- React hook 使用 `useXxx` 命名。
- 共用字串常量使用 `UPPER_SNAKE_CASE`，特別是 literal key、status、route path、storage key、request name、cache key、API label。
- 環境變數使用 `VITE_UPPER_SNAKE_CASE`。
- 不要只為了前端命名風格而修改後端 DTO/VO 欄位、request parameter、response field 或 status value。除非任務明確包含 mapping/migration，否則要保留外部 contract。

## 前後端職責

- 目前前端仍在 UI 構建階段，尚未形成穩定實作；前端應優先建立清晰的頁面、狀態、API client 與使用者體驗，不要提前複製後端業務規則。
- 假設前端只會傳送後端完成動作所需的關鍵資料。
- 前端主要負責顯示、輸入收集、本地互動狀態、表單體驗、上傳體驗、路由與使用者回饋。
- 業務規則、權限檢查、評分、持久化決策、跨 entity 推導應放在後端。
- 後端負責驗證輸入、執行權限規則、推導 server-owned value、維持 transaction consistency，並回傳足夠清晰的資料，讓前端不需要複製核心邏輯也能渲染。
- 編寫前端時，優先保證核心流程可用。不要為了少打一個 API 或掩蓋後端缺口，把後端應負責的邏輯搬到 client。
- generated ID、timestamp、ownership、scoring、status transition、tokenVersion 預設視為 backend-owned，除非現有設計明確不是如此。

## 工程規則

- 優先使用專案既有 pattern、helper、component style、feature boundary、API response shape，再考慮新增抽象。
- 修改範圍應貼近需求。避免大範圍 rename、無關格式化或順手重構。
- 新增共用抽象前，先確認至少兩個以上實際使用點或能明確降低複雜度。
- API contract type 應與後端欄位保持一致；需要 UI 專用 shape 時，使用明確 mapper 分離 server contract 與 view model。
- multipart endpoint 不手動設定 `Content-Type`，由 browser 自動帶 boundary。
- 行為改動應補上或更新聚焦的測試，特別是 API client parsing、auth state、route guard、upload flow、SSE/dashboard flow、表單 validation。
- 文件更新應同步更新 `docs/frontend/frontend-overview.md`，如果改動會影響未來開發者快速理解專案。

## 登入與測試 Token

- 此專案使用 stateless JWT，不使用 session。登入入口是 `POST /api/auth/login`。
- API base path 是 `/api`；本地後端預設 base URL 是 `http://localhost:8080/api`。
- Vite dev server 目前 proxy `/api` 到 `http://localhost:8080`，前端開發可直接 request `/api/...`。
- 登入 request body 使用：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- 登入成功 response 外層是 `Result`，token 位於 `data.token`，同時回傳 `data.userId` 與 `data.role`。後續 HTTP request header 必須使用：

```http
Authorization: Bearer <data.token>
```

- 前端 API client 必須統一解析 `Result<T>`：
  - `code === 1` 視為業務成功
  - `code === 0` 顯示或傳遞 `msg`
  - HTTP 401 清除 token 並導向登入頁
- `POST /api/auth/logout` 與 `PUT /api/auth/password` 都會讓舊 token 立即失效。測試或手動驗證時不要在 logout/change password 後重用舊 token。
- 角色權限使用 `ROLE_` 前綴建立；前端看到的 role value 是 `USER` 或 `ADMIN`。`/api/user/**` 需要 USER，`/api/admin/**` 需要 ADMIN。
- 前端測試 auth 流程時，優先透過 mock API client 或測試專用 token fixture 驗證 UI 行為；不要在每個 component test 重新測後端登入功能。

## 文件安全

- 禁止批量刪除文件或目錄。
- 不要使用 `del /s`、`rd /s`、`rmdir /s`、`Remove-Item -Recurse` 或 `rm -rf`。
- 如果必須刪除文件，只能一次刪除一個明確路徑的文件，例如：

```powershell
Remove-Item "C:\path\to\file.txt"
```

- 如果看起來需要批量刪除，必須停止操作，詢問使用者並讓使用者手動處理或明確批准清理方案。
