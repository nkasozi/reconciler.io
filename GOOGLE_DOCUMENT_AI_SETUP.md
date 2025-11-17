# Google Document AI Setup for Vercel Deployment

## Overview

This setup allows Google Document AI to work both locally (with mock data) and in production on Vercel (with real Google Document AI).

## Architecture

```
Frontend (Browser)
    ↓
Local Development: /api/process-document (SvelteKit API) → Mock Data
Production: /api/process-document.js (Vercel Function) → Google Document AI
```

## Local Development Setup

1. **No setup required** - works out of the box with mock data
2. Start dev server: `npm run dev`
3. Upload a document - you'll see mock table data in development

## Production Setup (Vercel)

### 1. Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to project: `765754879203`
3. Go to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Name: `vercel-documentai`
6. Grant role: **Document AI API User**
7. Create and download the **JSON key file**

### 2. Configure Vercel Environment Variables

Add these environment variables in your Vercel project settings:

```bash
# Method 1: Upload service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/tmp/service-account-key.json

# Method 2: Inline service account JSON (recommended for Vercel)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"765754879203",...}
```

### 3. Update Vercel Function (Optional)

The function in `/api/process-document.js` is already configured for your project:

- Project ID: `765754879203`
- Location: `us`
- Processor ID: `c9b8c6fb78e18f74`

If you need to modify the service account setup, edit lines 15-20 in `/api/process-document.js`.

## Testing

### Local Testing

```javascript
// Browser console
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

// This will use mock data locally
import('./src/lib/utils/documentAIClient.js').then(({ processDocumentWithBackend }) => {
	processDocumentWithBackend(file).then((result) => console.log(result));
});
```

### Production Testing

1. Deploy to Vercel
2. Upload a document with table data
3. Check browser console for real Google Document AI results

## File Structure

```
/api/
  process-document.js          # Vercel serverless function (production)
/src/routes/api/process-document/
  +server.ts                   # SvelteKit API route (development)
/src/lib/utils/
  documentAIClient.ts          # Frontend client (auto-detects environment)
  ocrProcessor.ts              # Updated to use backend
  documentScanner.ts           # Updated to use backend
```

## Environment Detection

The frontend automatically detects the environment:

- **Development** (`localhost:5173`): Uses SvelteKit API → Mock data
- **Production** (Vercel domains): Uses Vercel function → Real Google Document AI

## Troubleshooting

### Development Issues

- Mock data should work without any setup
- Check browser console for "Development mode" messages

### Production Issues

1. **Check Vercel Function Logs**: Vercel Dashboard > Functions > View Logs
2. **Verify Environment Variables**: Ensure `GOOGLE_SERVICE_ACCOUNT_KEY` is set
3. **Check Google Cloud**: Ensure Document AI API is enabled for project `765754879203`

### Common Errors

- `Failed to initialize Document AI client`: Service account credentials missing
- `Processor not found`: Check project ID and processor ID in `/api/process-document.js`
- `Permission denied`: Service account needs Document AI API User role

## Cost Considerations

- Google Document AI charges per page processed
- Development uses mock data (no cost)
- Production processes real documents (billable)
- Monitor usage in Google Cloud Console

## Security Notes

- Service account credentials are server-side only (secure)
- No API keys exposed in frontend code
- Vercel environment variables are encrypted

## Next Steps

1. Deploy to Vercel
2. Set up service account credentials
3. Test with real documents
4. Monitor processing results and costs
