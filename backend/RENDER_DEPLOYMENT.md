# Backend Render Deployment Checklist

## Pre-Deployment Checklist

- [ ] All code committed to Git and pushed to GitHub
- [ ] `npm install` runs without errors
- [ ] `npm run build` compiles TypeScript successfully
- [ ] Local testing with `npm run dev` works
- [ ] Environment variables in `.env.example` are documented
- [ ] Backend code handles environment variables correctly

## Render Setup Steps

### Quick Deployment (Using Blueprint)

- [ ] Have GitHub repository ready
- [ ] Login to Render dashboard
- [ ] Click "New" → "Blueprint"
- [ ] Select your repository
- [ ] Review the services in `render.yaml`
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete
- [ ] Test the API endpoint

### Manual Deployment

1. **Create PostgreSQL Database**
   - [ ] Go to Render Dashboard → New → PostgreSQL
   - [ ] Create free tier instance
   - [ ] Copy Internal Database URL
   - [ ] Note: Free tier spins down after 15 minutes

2. **Create Redis Instance**
   - [ ] Go to Render Dashboard → New → Redis
   - [ ] Create free tier instance
   - [ ] Copy Redis URL

3. **Create Web Service**
   - [ ] Go to Render Dashboard → New → Web Service
   - [ ] Connect GitHub repository
   - [ ] Set Name: `online-compiler-backend`
   - [ ] Set Build Command: `npm install && npm run build`
   - [ ] Set Start Command: `node dist/index.js`
   - [ ] Select Free Plan

4. **Configure Environment Variables**
   - [ ] Add `DATABASE_URL` from PostgreSQL
   - [ ] Add `REDIS_URL` from Redis
   - [ ] Add `NODE_ENV` = `production`
   - [ ] Add `CORS_ORIGIN` = your frontend URL
   - [ ] Add `PORT` = `3000` (optional, Render assigns automatically)

5. **Deploy**
   - [ ] Click "Create Web Service"
   - [ ] Monitor build in Logs tab
   - [ ] Wait for "Your service is live"

## Post-Deployment Verification

- [ ] Check Render Logs for any errors
- [ ] Test API endpoint: `curl https://your-service.onrender.com/submission`
- [ ] Verify database connection is working
- [ ] Verify Redis connection is working
- [ ] Update frontend VITE_API_URL environment variable
- [ ] Test submission endpoint from frontend

## Environment Variables Reference

```
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://default:password@hostname:10000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
PORT=3000
```

## Common Issues & Solutions

### Build Fails
1. Check "Build Command" is correct
2. Verify package.json has all required dependencies
3. Check tsconfig.json has proper rootDir/outDir

### Service Won't Start
1. Check "Start Command" is correct: `node dist/index.js`
2. Verify dist folder is created after build
3. Check environment variables are set

### Database Connection Fails
1. Verify DATABASE_URL is correct format
2. Check PostgreSQL instance is in same region
3. Verify SQL migrations are applied

### Redis Connection Fails
1. Verify REDIS_URL format
2. Check Redis instance is running
3. Verify URL has correct password

### CORS Errors
1. Update CORS_ORIGIN in environment variables
2. Make sure frontend URL is added
3. Restart the service after updating

## Monitoring

- **Logs**: Service → Logs tab (real-time)
- **Metrics**: Service → Metrics tab
- **Events**: Service → Events tab (deployment history)

## Cost Notes

- Free tier services spin down after 15 minutes of inactivity
- Paid tier needed for always-on services
- Consider upgrading for production use

## Next Steps

1. Deploy worker service similarly
2. Deploy frontend to Vercel/Netlify
3. Set up proper error tracking (Sentry)
4. Configure custom domains
5. Set up automated deployments on Git push

---

**Support**: Check Render docs at https://render.com/docs
