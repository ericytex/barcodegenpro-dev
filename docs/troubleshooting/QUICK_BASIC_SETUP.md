# Quick Basic Setup (No GitHub Integration)

Simple setup - just copies files, no GitHub/GHCR stuff.

## On Your Remote Server

```bash
# 1. Go to repository root
cd ~/barcodegen-v2  # or your repo path

# 2. Run basic setup
sudo ./deploy/setup-basic.sh
```

That's it! It will:
- ✅ Create `/opt/barcode-gen-pro` directory
- ✅ Copy `docker-compose.prod.yml`
- ✅ Create `.env.example` template
- ✅ Leave your running containers untouched

## What Gets Created

```
/opt/barcode-gen-pro/
├── docker-compose.prod.yml
└── .env.example
```

## Next Steps (When Ready)

```bash
cd /opt/barcode-gen-pro
cp .env.example .env
nano .env  # Edit with your values
```

## Using the Files Later

When you want to use GHCR images (after GitHub Actions builds them):

```bash
cd /opt/barcode-gen-pro

# Login to GHCR (if needed)
echo $GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin

# Pull and start
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Or Keep Using Current Setup

The files are just there for when you need them. Your current containers keep running normally.

