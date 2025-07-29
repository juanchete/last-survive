# Environment Setup Guide

This guide explains how to set up environment variables for the NFL Fantasy Last Survive application.

## Quick Start

1. **Create a `.env` file** in the root directory of the project
2. **Copy the contents** from `.env.example`
3. **Fill in your values**

## Required Environment Variables

### Supabase Configuration

```bash
# Your Supabase project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Your Supabase anonymous/public key
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

To find these values:
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the `Project URL` and `anon public` key

### Optional Configuration

```bash
# Admin emails (comma-separated list)
# Users with these emails will have admin access
VITE_ADMIN_EMAILS=admin@example.com,admin2@example.com

# Application settings
VITE_APP_NAME=Last Survive
VITE_APP_URL=http://localhost:5173
```

## Security Notes

⚠️ **NEVER commit your `.env` file to version control!**

- The `.env` file is already in `.gitignore`
- Only share the `.env.example` file
- Keep your actual credentials secure

## Development vs Production

### Local Development
Create a `.env` file with your development Supabase project credentials.

### Production Deployment
Set environment variables in your hosting platform:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Heroku**: Settings → Config Vars

## Troubleshooting

### Missing Environment Variables Error
If you see an error about missing Supabase environment variables:
1. Check that your `.env` file exists
2. Verify the variable names start with `VITE_`
3. Restart your development server after adding/changing variables

### Variables Not Loading
- Make sure variable names start with `VITE_` (Vite requirement)
- Restart the development server: `npm run dev`
- Check for typos in variable names

## Example .env File

```bash
# Supabase
VITE_SUPABASE_URL=https://tvzktsamnoiyjbayimvh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin Access
VITE_ADMIN_EMAILS=juanlopezlmg@gmail.com,admin@lastsurvive.com

# App Config
VITE_APP_NAME=Last Survive
VITE_APP_URL=http://localhost:5173
```

## Next Steps

After setting up your environment variables:
1. Run `npm install` to install dependencies
2. Run `npm run dev` to start the development server
3. The app will be available at `http://localhost:5173`