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

This application is designed to write uploaded files directly to the `public/uploads` directory of the project. This approach works seamlessly in a local development environment or on a traditional server with a persistent file system.

However, on modern serverless hosting platforms (like Vercel or Firebase App Hosting), the filesystem is often ephemeral. This means that any files uploaded at runtime will be lost during a new deployment or when the instance recycles. For a production-ready application, you should use a dedicated file storage service like Google Cloud Storage, AWS S3, or Firebase Storage.
