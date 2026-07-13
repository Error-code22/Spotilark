# Railway Deployment Guide for Spotilark Backend

## Context
Spotilark needs a deployed backend server to handle YouTube streaming, search, and API requests from the mobile app. Railway is ideal because it supports Node.js, has persistent storage, and can install system packages (yt-dlp, ffmpeg).

## Pre-Deployment Checklist

### 1. Repository Setup
- Ensure `package.json` has correct `start` script: `"start": "next start -p $PORT"`
- Ensure `next.config.ts` uses `output: 'standalone'` (for server deployment)
- Push latest code to GitHub

### 2. Environment Variables
Create a `.env.production` file (don't commit) with all required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_COOKIE_PATH=/tmp/spotilark-cookies/youtube-main.txt

# Telegram (for audio storage)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Cloudinary (for cover images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
NODE_ENV=production
PORT=3000
```

### 3. Create Procfile
Create `Procfile` in project root:
```
web: npm run start
```

### 4. Create railway.json
Create `railway.json` in project root:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 5. Install System Dependencies
Railway uses Nixpacks. Create `nixpacks.toml` to install yt-dlp and ffmpeg:
```toml
[phases.setup]
nixPkgs = ["ffmpeg", "yt-dlp"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

**Alternative if nixpacks doesn't work:** Use a Dockerfile:

```dockerfile
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "run", "start"]
```

## Deployment Steps

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Add a payment method (Railway has a free tier with $5 credit)

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your `spotilark-web` repository
4. Railway will auto-detect Node.js and start building

### Step 3: Configure Environment Variables
1. In Railway dashboard, go to your project
2. Click "Variables" tab
3. Add all environment variables from `.env.production`
4. **Important:** Add `PORT=3000` (Railway assigns a port automatically)

### Step 4: Configure Build Settings
1. Go to "Settings" tab
2. Under "Build":
   - Build Command: `npm run build`
   - Start Command: `npm run start`
3. Under "Deploy":
   - Healthcheck Path: `/`
   - Healthcheck Timeout: 300 seconds

### Step 5: Deploy
1. Railway will automatically deploy on push to main branch
2. Monitor deployment in "Deployments" tab
3. Once deployed, Railway provides a public URL (e.g., `https://spotilark-web.up.railway.app`)

### Step 6: Test the Server
1. Visit your Railway URL in browser
2. Test API endpoints:
   - `https://your-app.up.railway.app/api/search/remote?q=test`
   - `https://your-app.up.railway.app/api/stream/youtube?v=dQw4w9WgXcQ`

## Mobile App Configuration

### Update Capacitor Config
Once your server is deployed, update `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  // ... other settings
  server: {
    url: 'https://your-app.up.railway.app',
    cleartext: false, // HTTPS in production
    allowNavigation: ['*'],
  },
};
```

### Update Environment Variables
Create `.env.capacitor`:
```env
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
```

## Post-Deployment Checklist

- [ ] Server builds successfully on Railway
- [ ] Health check passes (`/` returns 200)
- [ ] YouTube search works (`/api/search/remote?q=test`)
- [ ] YouTube streaming works (`/api/stream/youtube?v=VIDEO_ID`)
- [ ] Track upload works (test with small file)
- [ ] Supabase connection works
- [ ] Environment variables are all set
- [ ] Mobile app can reach the server

## Troubleshooting

### Build Fails
- Check Railway build logs for missing dependencies
- Ensure `package.json` has all required dependencies
- Verify `next.config.ts` has `output: 'standalone'`

### yt-dlp Not Found
- Ensure `nixpacks.toml` includes `yt-dlp` in nixPkgs
- Or use Dockerfile approach with `pip3 install yt-dlp`

### ffmpeg Not Found
- Ensure `nixpacks.toml` includes `ffmpeg` in nixPkgs
- Or use Dockerfile approach with `apt-get install ffmpeg`

### Port Issues
- Railway assigns `$PORT` automatically
- Ensure `next start -p $PORT` uses the assigned port
- Don't hardcode port 3000 in production

### Memory Issues
- Railway free tier has 512MB RAM
- yt-dlp and ffmpeg can be memory-intensive
- Consider upgrading to Hobby plan ($5/month) for 1GB RAM

## Cost Estimation
- **Railway Free Tier:** $5 credit/month (enough for small usage)
- **Railway Hobby Plan:** $5/month for 1GB RAM, 100GB bandwidth
- **Usage:** ~$0.0004/GB-minute for compute, $0.10/GB for bandwidth

## Next Steps After Deployment
1. Get your Railway public URL
2. Update `capacitor.config.ts` with the URL
3. Build and test mobile APK
4. Monitor server logs for any issues
5. Set up custom domain if needed