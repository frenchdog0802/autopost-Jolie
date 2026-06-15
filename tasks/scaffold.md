# 專�?骨架（Scaffold�?

> 建�? Node.js + TypeScript + Express 專�??��?結�???

---

## Task: scaffold-01

### Goal

?��??��?案�?建�? `package.json`?�`tsconfig.json`?�`.gitignore`?�目?��?構�? npm scripts??

### Files

- `package.json`
- `tsconfig.json`
- `.gitignore`
- `.env.example`
- `src/index.ts`（placeholder，export empty�?
- `src/types/index.ts`（placeholder�?

### Dependencies

- ??

### Acceptance Criteria

- [x] `npm install` ?��?，�?�?express?�typescript?�@types/node?�@types/express
- [x] `npm run build` ?�編�?TypeScript ??`dist/`
- [x] `npm run dev` �?ts-node ??tsx ?��??�發伺�???
- [x] `.gitignore` ?�含 `node_modules/`?�`dist/`?�`.env`
- [x] `.env.example` ?�出 design.md ?�?��?要環境�??��??�值�?
- [x] ?��?結�?符�? design.md §11

### Test Requirements

- [x] `npm run build` exit code 0
- [x] `npm run typecheck`（若已設定�?exit code 0

**?�估工�?�?* 1 小�?

---

## Task: scaffold-02

### Goal

?�入 lint ??format 工具?��?eslint + prettier ??biome）�?

### Files

- `eslint.config.js` ??`.eslintrc.*`
- `.prettierrc`（若使用�?
- `package.json`（新�?scripts: `lint`, `format`�?

### Dependencies

- scaffold-01

### Acceptance Criteria

- [x] `npm run lint` ?��? `src/` ?��?
- [x] lint 規�??�含 TypeScript ?�援
- [x] ?��? placeholder 檔�??��? lint

### Test Requirements

- [x] `npm run lint` exit code 0

**?�估工�?�?* 1 小�?

---

## Task: scaffold-03

### Goal

建�?依賴注入?��? factory / bootstrap 骨架，方便�?續模�?wiring??

### Files

- `src/bootstrap.ts`（建立並 export ?�??service 實�???factory ?��?�?

### Dependencies

- scaffold-01
- types-01（interface 定義完�?後接?��?

### Acceptance Criteria

- [x] `createApp()` ??`bootstrap()` ?��??�傳 `{ app, services }` 結�?
- [x] ??service �?interface ?�別注入，暫?�可??stub 實�?
- [x] bootstrap 不在�?task 實�?業�??�輯

### Test Requirements

- [x] ?��?測試：`bootstrap()` ?�傳?�件?�含?��? key（app?�services�?
- [x] 測試檔�?`src/__tests__/bootstrap.test.ts`

**?�估工�?�?* 1?? 小�?
