# Quick Setup for Remote Server

You're on your remote server. Here's how to set up GHCR deployment:

## Option 1: Pull Latest Changes from Repository

If you have the repository cloned on your server:

```bash
# Navigate to your repository
cd ~/barcodegen-v2  # or wherever you cloned it
cd ..

# Pull latest changes
git pull origin main

# Go to the repository root (where docker-compose.prod.yml is)
cd barcodegen-v2  # or your repo name

# Run the setup script
sudo ./deploy/setup-remote-server.sh
```

## Option 2: Manual Setup (If repo isn't up to date)

### Step 1: Create deployment directory

```bash
# Create the deployment directory
sudo mkdir -p /opt/barcode-gen-pro
cd /opt/barcode-gen-pro
```

### Step 2: Download required files

You need these files from the repository:

1. `docker-compose.prod.yml` (in repository root)
2. `deploy/webhook-receiver.sh`
3. `deploy/webhook-receiver.service`

**Option A: Copy from your local machine via SCP:**

From your **local machine**, run:
```bash
# Replace user@server with your server details
scp docker-compose.prod.yml user@194.163.134.129:/opt/barcode-gen-pro/
scp deploy/webhook-receiver.sh user@194.163.134.129:/opt/barcode-gen-pro/deploy/
scp deploy/webhook-receiver.service user@194.163.134.129:/opt/barcode-gen-pro/deploy/
```

**Option B: Create files manually on server:**

On your **remote server**, run:

```bash
cd /opt/barcode-gen-pro

# Create docker-compose.prod.yml (copy content from repo)
nano docker-compose.prod.yml
# Paste the content from the repository's docker-compose.prod.yml

# Create deploy directory
mkdir -p deploy

# Create webhook-receiver.sh (copy content from repo)
nano deploy/webhook-receiver.sh
# Paste the content from deploy/webhook-receiver.sh
chmod +x deploy/webhook-receiver.sh
```

### Step 3: Create .env file

```bash
cd /opt/barcode-gen-pro
nano .env
```

Add:
```env
SECRET_KEY=generate-with-openssl-rand-hex-32
DATABASE_PATH=/app/data/barcode_generator.db
LOG_LEVEL=INFO
CORS_ORIGINS=http://194.163.134.129,http://194.163.134.129:8080
```

Generate SECRET_KEY:
```bash
openssl rand -hex 32
```

### Step 4: Login to GHCR

```bash
# Create a GitHub Personal Access Token with 'read:packages' permission
# Go to: https://github.com/settings/tokens

# Login to GHCR
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin
```

### Step 5: Test pulling images

```bash
cd /opt/barcode-gen-pro
docker compose -f docker-compose.prod.yml pull
```

## Option 3: Use Existing Directory Structure

If you want to use your existing `~/barcodegen-v2` setup:

```bash
cd ~/barcodegen-v2

# Pull latest changes
git pull origin main

# Copy the new docker-compose.prod.yml to root
cp docker-compose.prod.yml ~/barcodegen-v2/

# Copy webhook files to deploy directory
cp deploy/webhook-receiver.sh deploy/
cp deploy/webhook-receiver.service deploy/
chmod +x deploy/webhook-receiver.sh

# Create/update .env file
nano .env
```

Then use `docker-compose.prod.yml` instead of your current `deploy/docker-compose.yml`.

## Troubleshooting

**Command not found?**
- Make sure you're in the right directory
- Check if files exist: `ls -la`
- Verify paths: `pwd`

**Can't find files?**
- List all files: `find . -name "docker-compose.prod.yml"`
- Check repository: `git status`
- Pull latest: `git pull origin main`

**Which docker-compose file to use?**
- For GHCR images: `docker-compose.prod.yml` (in repo root)
- For local builds: `docker-compose.yml` (in repo root)
- Your old setup: `deploy/docker-compose.yml` (you might want to migrate)

