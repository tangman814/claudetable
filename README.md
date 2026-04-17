# 🦞 ClaudeTable — 海鮮餐廳訂位系統

專為餐廳櫃檯人員設計的全端訂位管理系統，支援快速訂位、平面桌圖、甘特圖時間軸與大團體多桌管理。

---

## 快速啟動

### 前置需求
- Node.js 18+（建議 22）
- npm 9+

### 第一次執行（初始化資料庫）

```bash
# 進入專案目錄
cd D:\ClaudeTable

# 安裝所有依賴
npm install

# 建立資料庫並填入範例資料（執行一次即可）
npm run seed
```

### 日常啟動

```bash
# 同時啟動後端（port 3001）與前端（port 5173）
npm run dev
```

然後開啟瀏覽器：**http://localhost:5173**

---

## 個別啟動

```bash
# 只啟動後端
npm run dev:backend

# 只啟動前端
npm run dev:frontend
```

---

## 功能一覽

### 今日總覽
- 今日總人數、確認中、入座中統計
- 訂位清單含快速狀態變更（已確認 → 入座中 → 已完成）
- 超額警告（人數超過桌位建議容量時顯示琥珀色標記）

### 甘特圖（`/gantt`）
- X 軸：17:00–00:00 時間軸
- Y 軸：所有桌號，依分區分組
- 各訂位以色塊顯示，顏色對應狀態
- 即時紅線標示現在時刻

### 平面桌圖（`/floor-plan`）
- 1F / 2F / 外場 分區切換
- 桌位顏色：🟢 空閒 · 🔵 已訂位 · 🔴 入座中
- 桌位拖拉重新排版（儲存至資料庫）
- **挪動模式**：點桌 → 點「挪動此桌」→ 點目標桌 → 確認

### 快速訂位 Drawer
4 步驟流程：
1. **客戶** — 電話搜尋自動帶入，或新建客戶
2. **日期時段** — 日期快選 + 30 分鐘格（尖峰時段標星）
3. **選桌** — 顯示當日已佔用（紅色）與可選桌位，支援多桌選取
4. **確認** — 訂位摘要 + 特殊需求備註

> 超額訂位僅顯示警告，不阻擋完成。

### 訂位管理（`/reservations`）
- 依日期 / 狀態篩選
- 一覽表含訂位編號、客戶、桌號、狀態
- 快速取消

### 客戶資料（`/customers`）
- 姓名或電話搜尋
- 顯示到訪次數、VIP 備註

### 系統設定（`/settings`）
- 餐廳名稱、營業時間、預設用餐時間
- 尖峰時段設定

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + Vite + TypeScript |
| UI | Tailwind CSS |
| 平面桌圖 | react-konva（Canvas） |
| 狀態管理 | Zustand |
| 資料請求 | SWR |
| 後端 | Node.js + Express 5 |
| ORM | Drizzle ORM |
| 資料庫 | SQLite（better-sqlite3） |
| 驗證 | Zod（前後端共用） |

---

## 資料庫

SQLite 檔案位於 `backend/claudetable.db`（自動建立）。

如需重置資料：
```bash
# 刪除資料庫檔案並重新 seed
del backend\claudetable.db
npm run seed
```

---

## 目錄結構

```
D:\ClaudeTable\
├── shared/types.ts          # Zod 共用型別定義
├── backend/
│   ├── src/
│   │   ├── index.ts         # Express 主程式 (port 3001)
│   │   ├── db/schema.ts     # Drizzle 資料表定義
│   │   ├── db/seed.ts       # 範例資料
│   │   ├── routes/          # API 路由
│   │   └── services/        # 業務邏輯
│   └── claudetable.db       # SQLite 資料庫
└── frontend/
    └── src/
        ├── pages/           # 各頁面元件
        ├── components/      # 共用元件 + Drawer
        ├── api/             # API client
        ├── hooks/           # SWR hooks
        └── store/           # Zustand stores
```

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/v1/health` | 健康檢查 |
| GET/POST | `/api/v1/zones` | 分區管理 |
| GET/POST/PATCH | `/api/v1/tables` | 桌位管理 |
| PATCH | `/api/v1/tables/:id/position` | 更新桌位座標 |
| GET/POST | `/api/v1/customers` | 客戶搜尋/建立 |
| GET/POST/PATCH/DELETE | `/api/v1/reservations` | 訂位 CRUD |
| PATCH | `/api/v1/reservations/:id/tables/reassign` | 挪動桌位 |
| GET | `/api/v1/availability` | 桌位可用性查詢 |
| GET | `/api/v1/availability/schedule` | 甘特圖資料 |
| GET/PATCH | `/api/v1/settings` | 系統設定 |
