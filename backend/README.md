# Backend - Quick Setup & Deployment Guide

## Local Development

```bash
# Install dependencies
npm install

# Run development server with auto-reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure your local database:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/compiler_db
   REDIS_URL=redis://localhost:6379
   ```

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create/migrate database
npx prisma migrate dev --name init

# View database
npx prisma studio
```

## Render Deployment - 3 Options

### Option 1: One-Click Blueprint Deployment (Easiest)
```bash
# 1. Push to GitHub
git push origin main

# 2. Go to https://render.com
# 3. Click "New" → "Blueprint"
# 4. Select repository
# 5. Click "Deploy"
# Done! Services auto-configured ✓
```

### Option 2: Manual Web Service Deployment
```
Render Dashboard:
  → New Web Service
  → Select repository
  → Build: npm install && npm run build
  → Start: node dist/index.js
  → Add Database & Redis URLs via env vars
  → Deploy
```

### Option 3: Use Render CLI
```bash
# Coming soon with Render CLI
```

## Package.json Scripts

| Script | Purpose | When to Use |
|--------|---------|-----------|
| `npm run dev` | Development with hot-reload | Local development |
| `npm run build` | Compile TypeScript | Before production |
| `npm start` | Run compiled app | Production/Render |

## Build Process

### Local Build
```
TypeScript (src/) → TypeScript Compiler → JavaScript (dist/)
                 ↓
              Prisma Client Generated
```

### Render Build
```
GitHub Push
    ↓
npm install (install dependencies)
npm run build (compile TS + generate Prisma)
    ↓
npm start (run dist/index.js)
    ↓
Service Live ✓
```

## Environment Variables

**Automatically provided by Render:**
- `PORT` (default: 3000)
- `NODE_ENV` (set to production)

**You need to configure:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `CORS_ORIGIN` - Frontend URL (e.g., https://frontend.vercel.app)

## Troubleshooting

### Build Fails
```bash
# Test locally first
npm run build  # Should create dist/ folder

# Check errors in Render Logs tab
```

### "Port already in use"
```bash
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### Database not found
```bash
# Verify DATABASE_URL in Render environment vars
# Format: postgresql://user:pass@host:port/dbname
# Check PostgreSQL service is running on Render
```

## File Structure

```
backend/
├── src/
│   ├── index.ts          (Express server)
│   └── db.ts             (Prisma client)
├── prisma/
│   ├── schema.prisma     (Database schema)
│   └── migrations/       (Migration history)
├── dist/                 (Compiled output - generated)
├── .env                  (Local environment - git ignored)
├── .env.example          (Template for env vars)
├── package.json          (Dependencies & scripts)
├── tsconfig.json         (TypeScript config)
└── render.yaml           (Render deployment config)
```

## API Endpoints

```
POST /submission
  Request: { code: string, language: string }
  Response: { message: string, id: string }

GET /submission/:submissionId
  Response: { submission: Submission }
```

## Next Steps

1. Setup `.env` with local database
2. Run `npm install` && `npm run build`
3. Test with `npm start`
4. Push to GitHub
5. Deploy to Render
6. Configure CORS_ORIGIN to frontend URL
7. Test with live frontend

---

**Questions?** Check [Render Docs](https://render.com/docs)
