# Deployment Checklist

## deployment-01: Render service setup

- [x] `npm run build && node dist/index.js` works locally with `.env`
- [x] Build command: `npm install && npm run build`
- [x] Start command: `node dist/index.js`
- [x] Health check path: `/health`
- [x] `render.yaml` and README document Render settings

## deployment-02: Environment and LINE webhook

Complete these steps in external dashboards before going live:

1. Deploy the Render Web Service using this repository.
2. Add all required environment variables from `.env.example` in Render Environment.
3. Confirm Render health check passes on `/health`.
4. In LINE Developer Console, set webhook URL to `https://<render-domain>/webhook`.
5. Click **Verify** and confirm success.
6. Use Starter tier or accept Free tier cold starts.

Verification:

- [ ] LINE webhook Verify succeeds
- [ ] Render logs show server startup without `ConfigError`

## deployment-03: Manual E2E

Use [E2E.md](./E2E.md) during staging/production validation.

## deployment-04: S3 lifecycle backup

See [S3.md](./S3.md) for bucket policy, CORS, and lifecycle rule setup.
