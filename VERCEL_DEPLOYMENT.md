# Vercel Deployment with Google Document AI

## Environment Variables Required

For the Google Document AI integration to work on Vercel, you need to set up the following environment variables in your Vercel project dashboard:

### Required Environment Variables

1. **GCP_PROJECT_ID**

   - Value: `765754879203`
   - Description: Your Google Cloud Project ID

2. **GCP_SERVICE_ACCOUNT_EMAIL**

   - Value: Your service account email (e.g., `your-service-account@your-project.iam.gserviceaccount.com`)
   - Description: The email address of the service account with Document AI permissions

3. **GCP_PRIVATE_KEY**
   - Value: Your service account private key (the entire key from the JSON file, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - Description: The private key for authentication
   - **Important**: Copy the entire private key as a single line, Vercel will handle the newlines

### Setting Up Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:
   - **Name**: Use the exact variable names above
   - **Value**: Copy the values from your Google Cloud service account JSON file
   - **Environment**: Set to "Production" and "Preview" as needed

### Service Account Setup

Your service account needs the following permissions:

- Document AI API User (`roles/documentai.apiUser`)
- Service Account Token Creator (if using impersonation)

### Local Development

For local development, you can either:

1. Use Google Cloud CLI authentication (`gcloud auth application-default login`)
2. Set the same environment variables in your `.env.local` file
3. Use the `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to your service account JSON file

### Testing

After setting up the environment variables, deploy to Vercel and test the OCR functionality. The system will automatically:

- Use environment variable credentials on Vercel
- Fall back to Application Default Credentials for local development

## Architecture

- **Production (Vercel)**: Uses `/api/process-document.js` serverless function
- **Development**: Uses SvelteKit API route `/src/routes/api/process-document/+server.ts`
- Both use the same credential pattern for consistent authentication
