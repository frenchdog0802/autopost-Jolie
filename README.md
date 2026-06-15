# autoPost-Jolie

LINE Bot that uploads an image to S3, generates platform-specific captions with OpenAI, and publishes to Instagram, Facebook, and Threads after user confirmation.

## Requirements

- Node.js 20+
- Environment variables listed in `.env.example`

## Scripts

```bash
npm install
npm run dev          # development server
npm run build        # compile TypeScript to dist/
npm run start        # run production build
npm run lint
npm run typecheck
npm test
npm run test:coverage
```

## Local development

1. Copy `.env.example` to `.env` and fill in credentials.
2. Run `npm run dev`.
3. Expose `/webhook` with a tunnel such as ngrok for LINE webhook testing.

## Production build

```bash
npm run build
node dist/index.js
```

Health check: `GET /health` → `{ "status": "ok" }`

## Render deployment

1. Create a Web Service on Render.
2. Build command: `npm install && npm run build`
3. Start command: `node dist/index.js`
4. Health check path: `/health`
5. Set all required environment variables from `.env.example`.
6. Point LINE webhook to `https://<your-render-domain>/webhook` and verify.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full deployment checklist.

## Manual E2E checklist

See [docs/E2E.md](./docs/E2E.md).

## S3 bucket notes

- Enable public read for uploaded image URLs used by Meta APIs.
- Configure CORS if needed for external fetches.
- Optional lifecycle rule: expire objects under `uploads/` after 1 hour.

See [docs/S3.md](./docs/S3.md).
