# Deploy Everything on Vercel 🚀

**Good news!** Everything (frontend + backend API routes) can be deployed together on Vercel in a single deployment.

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Dashboard (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/new)**
2. **Click "Add New Project"**
3. **Import your GitHub repository**
4. **Configure Project**:
   - Framework: **Next.js** (auto-detected)
   - Root Directory: `.` (root)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. **Add Environment Variables**:
   Click "Environment Variables" and add:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GUMROAD_PRODUCT_ID=your_gumroad_product_id (optional)
   GUMROAD_PREMIUM_PRODUCT_ID=your_premium_product_id (optional)
   ```

6. **Click "Deploy"**

✅ **Done!** Your app is live with all API routes working.

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy (will prompt for environment variables)
vercel

# For production
vercel --prod
```

### Step 3: Set Environment Variables

After deployment, go to **Settings → Environment Variables** and add:

**Required:**
- `GEMINI_API_KEY` - Your Google Gemini API key (for AI features)

**Optional (for license verification):**
- `GUMROAD_PRODUCT_ID` - Your Gumroad product ID
- `GUMROAD_PREMIUM_PRODUCT_ID` - Your premium product ID

**Note:** After adding environment variables, Vercel will automatically redeploy.

## API Routes Included

All these API routes are now part of your Next.js app and deploy automatically:

- ✅ `POST /api/verify` - License verification
- ✅ `POST /api/ai/parse-pdf` - AI PDF parsing
- ✅ `POST /api/ai/suggest-tags` - AI tag suggestions
- ✅ `POST /api/ai/monthly-narrative` - AI narrative generation
- ✅ `POST /api/parse-pdf` - Legacy PDF parsing (still works)

## How It Works

- **Frontend**: Next.js app (React components)
- **Backend**: Next.js API routes (serverless functions on Vercel)
- **Everything**: Deploys together in one Vercel project
- **No separate backend needed**: All API routes are part of the Next.js app

## Environment Variables

### Required
```
GEMINI_API_KEY=your_gemini_api_key
```

### Optional (for license verification)
```
GUMROAD_PRODUCT_ID=your_product_id
GUMROAD_PREMIUM_PRODUCT_ID=your_premium_product_id
```

## Testing Your Deployment

### 1. Test Core Features (Works Without API Keys)
- [ ] File import (CSV/Excel/PDF)
- [ ] Auto-tagging
- [ ] All core features work ✅

### 2. Test AI Features (Requires GEMINI_API_KEY)
- [ ] AI PDF parsing works
- [ ] AI narrative generation works
- [ ] AI tag suggestions work

### 3. Test License Verification (Requires GUMROAD_PRODUCT_ID)
- [ ] License verification works

## Benefits of Single Vercel Deployment

✅ **Simpler**: One deployment, one URL
✅ **Faster**: No CORS issues (same domain)
✅ **Cheaper**: No separate backend hosting
✅ **Easier**: All environment variables in one place
✅ **Reliable**: Vercel handles scaling automatically

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Run `npm run build` locally first
- Verify TypeScript compiles: `npx tsc --noEmit`

### API Routes Not Working
- Check environment variables are set
- Check Vercel function logs
- Verify API routes are in `src/app/api/`

### AI Features Not Working
- Verify `GEMINI_API_KEY` is set
- Check Vercel function logs for errors
- Frontend will gracefully fall back to client-side features

## Migration from Separate Backend

If you previously had a separate backend:

1. ✅ **Already done**: Backend services moved to `src/lib/services/`
2. ✅ **Already done**: API routes created in `src/app/api/`
3. ✅ **Already done**: API client updated to use relative paths
4. **You can delete**: The `backend/` folder (optional - kept for reference)

## Next Steps

1. Deploy to Vercel
2. Add environment variables
3. Test your app
4. Share your URL! 🎉

---

**Remember**: Core features work without any API keys. AI features are optional enhancements.

