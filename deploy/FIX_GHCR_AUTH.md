# Fix GHCR Authentication Error

You're getting: `denied` error when pulling from GHCR.

## Quick Fix Options

### Option 1: Login to GHCR (Recommended)

```bash
# Create a GitHub Personal Access Token
# Go to: https://github.com/settings/tokens
# Create token with: read:packages permission

# Login
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin

# Then try again
docker compose pull
docker compose up -d
```

### Option 2: Make Packages Public (Easier, no auth needed)

1. Go to: https://github.com/orgs/ericytex/packages
2. Find packages: `barcode-backend` and `barcode-frontend`
3. Click on each → Package settings → Change visibility → **Make public**

After making public, no login needed:
```bash
docker compose pull
docker compose up -d
```

### Option 3: Use Local Build (Fallback)

If GHCR isn't ready yet, uncomment the build sections in docker-compose.yml:

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  # image: ghcr.io/ericytex/barcode-backend:latest  # comment this out
```

Then build locally:
```bash
docker compose build
docker compose up -d
```

## Check Package Status

```bash
# See if packages exist and are accessible
curl -I https://ghcr.io/v2/ericytex/barcode-backend/manifests/latest
curl -I https://ghcr.io/v2/ericytex/barcode-frontend/manifests/latest
```

If you get 401/403, the packages are private and you need to authenticate.
If you get 404, the packages haven't been built yet (wait for GitHub Actions to finish).

