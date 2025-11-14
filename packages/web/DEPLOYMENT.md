# GitHub Pages Deployment Guide

This document provides instructions for configuring GitHub Pages deployment for the web-component-analyzer web application.

## Prerequisites

- Repository must be public or have GitHub Pages enabled for private repositories
- GitHub Actions must be enabled for the repository

## Repository Configuration Steps

### 1. Enable GitHub Pages

1. Navigate to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click on **Pages**
4. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
   - This allows the workflow to deploy directly without using a branch

### 2. Verify Workflow Permissions

1. In repository **Settings**, go to **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Ensure the following is selected:
   - ✅ "Read and write permissions" OR
   - ✅ "Read repository contents and packages permissions" with "Allow GitHub Actions to create and approve pull requests" enabled

### 3. Trigger Deployment

The deployment will automatically trigger when:
- Code is pushed to the `main` branch
- A pull request is merged to `main`

You can also manually trigger the workflow:
1. Go to **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

### 4. Access Your Deployed Site

After successful deployment, your site will be available at:
```
https://<username>.github.io/web-component-analyzer/
```

Replace `<username>` with your GitHub username or organization name.

### 5. Custom Domain (Optional)

To configure a custom domain:

1. In repository **Settings** → **Pages**
2. Under **Custom domain**, enter your domain name
3. Click **Save**
4. Configure DNS records with your domain provider:
   - Add a CNAME record pointing to `<username>.github.io`
   - Or add A records pointing to GitHub Pages IP addresses

For detailed DNS configuration, see: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Troubleshooting

### Deployment Fails

- Check the **Actions** tab for error logs
- Ensure all dependencies are correctly specified in `package.json`
- Verify the build completes successfully locally: `pnpm --filter @web-component-analyzer/web run build`

### 404 Error on Deployed Site

- Verify the `base` path in `vite.config.ts` matches your repository name
- Check that the workflow uploaded the correct artifact path
- Ensure GitHub Pages is enabled and set to "GitHub Actions" source

### Assets Not Loading

- Confirm the `base` configuration in `vite.config.ts` is correct
- Check browser console for CORS or path errors
- Verify all assets are included in the build output (`packages/web/dist`)

## Build Configuration

The deployment uses the following configuration:

- **Base Path**: `/web-component-analyzer/` (configured in `vite.config.ts`)
- **Build Output**: `packages/web/dist`
- **Source Maps**: Enabled for debugging
- **Bundle Optimization**: Enabled with code splitting for large dependencies

## Local Testing

To test the production build locally:

```bash
# Build the application
pnpm --filter @web-component-analyzer/web run build

# Preview the production build
pnpm --filter @web-component-analyzer/web run preview
```

The preview server will simulate the GitHub Pages environment with the correct base path.
