# H-BAT Deployment Guide

## Environment Variables Required for Vercel

To deploy this application to Vercel, you need to set the following environment variables in your Vercel project settings:

### Required Environment Variables

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Service Role Key (Optional - only needed for admin features)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the appropriate values from your Supabase project

## Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the following values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY` (if needed)

## Common Deployment Issues

### 1. Missing Environment Variables
If you see an error about missing Supabase configuration, ensure all required environment variables are set in Vercel.

### 2. Audio Context Errors
The application includes client-side audio processing. Ensure your browser supports Web Audio API and allow audio permissions when prompted.

### 3. Build Warnings
The application may show warnings about viewport metadata configuration. These are non-critical and the app will still function properly.

## Testing the Deployment

1. Visit your deployed URL
2. Check that the homepage loads correctly
3. Test the audio initialization (may require user interaction)
4. Verify that the authentication system works (if configured)

## Support

If you encounter issues during deployment, check:
1. All environment variables are correctly set
2. Your Supabase project is active and accessible
3. The build logs in Vercel for specific error messages 