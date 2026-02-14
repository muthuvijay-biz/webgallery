# Static Gallery

This is a Next.js application that serves as a simple, password-protected gallery for photos, videos, and documents.

## Features

- **Secure Access**: The gallery is protected by a login screen.
- **Tabbed Galleries**: Media is organized into Photos, Videos, and Documents.
- **Admin Controls**: Upload and delete files directly from the UI.
- **Responsive Design**: The gallery is designed to work on all screen sizes.

## Getting Started

To get started, run the development server:

```bash
npm run dev
```

Navigate to the application in your browser (usually `http://localhost:9002`). You will be prompted to log in.

### Login Credentials

Use the following hardcoded credentials to access the gallery:

- **Username**: `admin`
- **Password**: `password`

## File Management

### Uploading Files

You can upload new photos, videos, and documents through the "Upload" button available in each respective tab.

### Deleting Files

Each item in the gallery has a delete button. Clicking it will prompt for confirmation before permanently deleting the file.

### Important Note on Production Deployments

This application writes uploaded files to the `public/uploads` directory for local development. On serverless platforms (Vercel, etc.) the runtime filesystem is read-only or ephemeral, so uploads/deletes will not persist across deployments or instance restarts.

Recommended (free, easy): **Supabase Storage** — free tier includes **500 MB** which fits your requirement. To enable Supabase storage in production:

1. Create a Supabase project and add a Storage bucket (suggested name: `uploads`).
2. In your hosting provider (Vercel) add these environment variables (the app accepts modern `sb_` keys and common fallbacks):
   - `USE_SUPABASE=true`
   - `SUPABASE_URL` = your Supabase project URL (example: `https://rmhjtozbrgwkjhreibii.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` = **Service Role** key (server-only). This value usually starts with `sb_secret_...` in the Supabase UI.
     - fallbacks accepted: `SUPABASE_SERVICE_ROLE`, `SUPABASE_SECRET_KEY`, `SUPABASE_SECRET`
   - `SUPABASE_ANON_KEY` = *optional* (publishable key, starts with `sb_publishable_...`)
   - `SUPABASE_BUCKET` = `uploads`
3. Make the bucket public (or the app will need signed URLs).

Optional (private buckets): set `SUPABASE_SIGNED_URL_EXPIRY` (seconds) to control signed URL lifetime. Default is `3600` (1 hour). The app will generate signed URLs server-side when `USE_SUPABASE=true` so private buckets are supported.

When `USE_SUPABASE=true` the app will store/list/delete files from Supabase Storage. Local dev still uses `public/uploads` so no env changes are required for development.
