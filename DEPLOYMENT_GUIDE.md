# Deployment Guide - Render

This guide will help you deploy the Online Compiler backend to [Render](https://render.com).

## Prerequisites

- GitHub account with the repository pushed
- Render account (sign up at https://render.com)
- PostgreSQL database (Render provides free Postgres)
- Redis instance (Render provides free Redis)

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your backend folder is properly configured:

```bash
cd backend
npm install
npm run build
```

Push all changes to GitHub:

```bash
git add .
git commit -m "Prepare backend for Render deployment"
git push origin main
```

### 2. Create a Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Grant Render access to your GitHub repositories

### 3. Deploy Using render.yaml (Recommended)

**Option A: Deploy Entire Stack with render.yaml**

1. In Render dashboard, click **New → Blueprint**
2. Connect your GitHub repository
3. Render will automatically detect the `render.yaml` file
4. Review the services (Backend, PostgreSQL, Redis)
5. Click **Deploy**

Render will automatically create:
- Web service for the backend
- PostgreSQL database
- Redis instance
- Connect them with environment variables

### 4. Deploy Backend Only (Without render.yaml)

If you prefer to set up services manually:

1. **Create PostgreSQL Database**
   - Go to Render Dashboard → New → PostgreSQL
   - Choose free plan
   - Copy the `Internal Database URL`

2. **Create Redis Instance**
   - Go to Render Dashboard → New → Redis
   - Choose free plan
   - Copy the Redis URL

3. **Deploy Backend Service**
   - Go to Render Dashboard → New → Web Service
   - Select your GitHub repository
   - Set the following:
     - **Name**: `online-compiler-backend`
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `node dist/index.js`
     - **Plan**: Free

4. **Add Environment Variables**
   - Click **Environment** tab
   - Add the following variables:
     - `DATABASE_URL`: Paste the PostgreSQL URL from step 1
     - `REDIS_URL`: Paste the Redis URL from step 2
     - `NODE_ENV`: `production`
     - `CORS_ORIGIN`: Your frontend URL (e.g., `https://your-frontend.vercel.app`)
     - `PORT`: `3000` (Render assigns this automatically)

5. **Deploy**
   - Click **Create Web Service**
   - Render will start the deployment process

### 5. Configure CORS

Update your backend code to use the CORS_ORIGIN environment variable:

**backend/src/index.ts**:
```typescript
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin }));
```

### 6. Verify Deployment

1. Wait for the build to complete (you can monitor in the Logs tab)
2. Once deployed, you'll get a URL like: `https://online-compiler-backend.onrender.com`
3. Test the API:
   ```bash
   curl -X POST https://online-compiler-backend.onrender.com/submission \
     -H "Content-Type: application/json" \
     -d '{"code": "print(\"hello\")", "language": "python"}'
   ```

### 7. Connect Frontend

Update your frontend API endpoint to point to your Render backend:

**frontend/.env**:
```
VITE_API_URL=https://online-compiler-backend.onrender.com
```

## Database Migrations

Render automatically runs migrations during deployment. If you need manual migration:

1. Go to your service's Shell tab in Render dashboard
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

## Monitoring & Logs

- View logs in real-time: Service → Logs tab
- Monitor performance: Service → Metrics tab
- View error logs: Service → Events tab

## Troubleshooting

### Build Failed
- Check the Logs tab for error messages
- Ensure all dependencies are in `package.json`
- Verify build command works locally: `npm run build`

### Runtime Errors
- Check environment variables are set correctly
- Ensure DATABASE_URL and REDIS_URL are valid
- Check CORS_ORIGIN matches your frontend URL

### Database Connection Issues
- Verify the PostgreSQL instance is running
- Check the DATABASE_URL format
- Ensure IP allowlist is properly configured

### Redis Connection Issues
- Verify the Redis instance is running
- Check the REDIS_URL format
- Ensure it's properly linked to the web service

## Cost Considerations

**Free Plan Limitations:**
- Services automatically spin down after 15 minutes of inactivity
- Limited to 0.5GB RAM per service
- Limited bandwidth

For production, consider upgrading to a paid plan.

## Next Steps

1. Deploy the worker service similarly
2. Deploy the frontend to Vercel or Netlify
3. Set up proper error monitoring (Sentry, etc.)
4. Configure custom domain names
5. Set up CI/CD pipeline for automatic deployments

---

For more help, visit [Render Documentation](https://render.com/docs)
