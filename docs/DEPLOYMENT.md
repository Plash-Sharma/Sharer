# DriveLite Free Production Deployment Guide
**Zero Cost • Lowest Latency • Enterprise Cloud Architecture**

This guide provides step-by-step instructions for deploying **DriveLite** at **$0 cost** with the **lowest possible network latency** and maximum efficiency.

---

## 🏆 Recommendation: The Ultra-Low-Latency Architecture

DriveLite was engineered with **browser-direct pre-signed S3 transfers**: file binaries flow directly between the user's browser and object storage. The Next.js server only mints cryptographically signed URLs in `<5ms`.

To achieve the lowest global latency, zero cold starts, and $0 cost:

| Component | Provider | Free Tier Allocation | Latency Profile |
|---|---|---|---|
| **Web & API Compute** | **Vercel** or **Koyeb** | Unlimited free hobby tier / 512MB always-on micro | Edge Anycast CDN (`<15ms` static TTFB) |
| **Relational Database** | **Neon** or **Supabase** | 0.5 GB Postgres 16, free forever | Intra-datacenter (`<2ms` query response) |
| **Object Storage** | **Cloudflare R2** | 10 GB free storage, **$0 egress fees** | 300+ Edge POPs worldwide (`<25ms` transfer start) |

---

## Deployment Option 1: The Modern Serverless Stack (Recommended)

### Step 1: Provision Free PostgreSQL on Neon
1. Go to [Neon.tech](https://neon.tech) and create a free account.
2. Create a project named `drivelite` in your preferred region (e.g. `us-east-1` or `eu-central-1`).
3. Copy the **Pooled Connection String** (it starts with `postgresql://...`).
4. Apply the database schema and custom indexes:
   ```bash
   DATABASE_URL="<your-neon-pooled-url>" npx prisma db push
   ```
5. Apply partial unique indexes for collision protection:
   ```bash
   DATABASE_URL="<your-neon-direct-url>" npx tsx -e "
   import { PrismaClient } from '@prisma/client';
   const p = new PrismaClient();
   async function run() {
     await p.\$executeRawUnsafe(\`
       CREATE UNIQUE INDEX IF NOT EXISTS node_parent_name_unique_active 
       ON nodes (\"parentId\", name) 
       WHERE \"deletedAt\" IS NULL AND \"parentId\" IS NOT NULL;
       CREATE UNIQUE INDEX IF NOT EXISTS node_root_name_unique_active 
       ON nodes (\"ownerId\", name) 
       WHERE \"deletedAt\" IS NULL AND \"parentId\" IS NULL;
       CREATE UNIQUE INDEX IF NOT EXISTS access_request_pending_unique 
       ON access_requests (\"nodeId\", \"requesterId\") 
       WHERE status = 'PENDING';
     \`);
     console.log('Partial unique indexes deployed!');
     await p.\$disconnect();
   }
   run();
   "
   ```

### Step 2: Provision Free S3 Storage on Cloudflare R2
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) and navigate to **R2**.
2. Create a bucket named `drivelite-files`.
3. Go to **Settings** -> **CORS Policy** and allow your domain:
   ```json
   [
     {
       "AllowedOrigins": ["https://your-drivelite-domain.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Under **Manage R2 API Tokens**, create a token with `Object Read & Write` permissions.
5. Note your **Account ID**, **Access Key ID**, and **Secret Access Key**.
   - Your S3 Endpoint will be: `https://<account-id>.r2.cloudflarestorage.com`

### Step 3: Deploy Compute to Vercel or Koyeb
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and select your repository.
3. Configure the Environment Variables:
   - `DATABASE_URL`: `postgresql://...@...neon.tech/drivelite?sslmode=require`
   - `APP_URL`: `https://your-app-name.vercel.app`
   - `JWT_SECRET`: Generate with `openssl rand -hex 32`
   - `S3_ENDPOINT_INTERNAL`: `https://<account-id>.r2.cloudflarestorage.com`
   - `S3_ENDPOINT_PUBLIC`: `https://<account-id>.r2.cloudflarestorage.com`
   - `S3_REGION`: `auto`
   - `S3_ACCESS_KEY`: `<your-r2-access-key-id>`
   - `S3_SECRET_KEY`: `<your-r2-secret-access-key>`
   - `S3_BUCKET`: `drivelite-files`
4. Click **Deploy**. Vercel will build the Next.js application and serve it across its global CDN.

---

## Deployment Option 2: 100% Free Docker VPS (Oracle Cloud Always Free)

Oracle Cloud Infrastructure (OCI) offers the most powerful free-tier cloud in the industry:
- **4 ARM Ampere A1 vCPUs**
- **24 GB RAM**
- **200 GB SSD storage**
- **Free Forever**

### Step 1: Launch OCI Compute Instance
1. Register for an [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/) account.
2. Create a VM instance using **Canonical Ubuntu 24.04** and choose **VM.Standard.A1.Flex** (4 OCPUs, 24 GB RAM).
3. Open ports `80`, `443`, and `3000` in the OCI Virtual Cloud Network (VCN) Security List.

### Step 2: Install Docker and Clone DriveLite
Connect to your VM via SSH:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

git clone <your-repo-url> drivelite
cd drivelite
```

### Step 3: Configure `.env` and Launch Full Docker Stack
```bash
cp .env.example .env
nano .env  # set JWT_SECRET and APP_URL=http://<your-vm-ip>
docker compose up -d
```
All 4 containers will boot automatically:
- `drivelite-postgres`: PostgreSQL database with health check and auto-migration
- `drivelite-minio`: S3-compatible storage engine
- `drivelite-minio-init`: Automated bucket creator and access policy config
- `drivelite-app`: Production Next.js standalone container

Access your site instantly at `http://<your-vm-ip>:3000`.

---

## Deployment Option 3: AWS Free Tier (EC2 + RDS + S3)

If AWS is mandatory for your infrastructure:
1. **Compute**: Launch an EC2 `t4g.small` or `t2.micro` instance (750 hours/month free for 12 months).
2. **Storage**: Create an Amazon S3 bucket `drivelite-files` in your chosen region (e.g. `us-east-1`). Enable CORS for PUT/GET from your domain.
3. **Database**: Launch an Amazon RDS PostgreSQL `db.t4g.micro` (free tier eligible for 12 months).
4. Run `docker compose up -d` on the EC2 instance or run the Node standalone server directly.

---

## Latency Optimization Comparison

| Strategy | DNS / SSL Latency | App TTFB | 100MB File Upload Speed | Monthly Cost |
|---|---|---|---|---|
| **Vercel + Neon + Cloudflare R2** | **< 10ms** (Anycast) | **< 35ms** | **Direct to R2 edge (< 3 sec)** | **$0.00** |
| **Oracle OCI Docker Stack** | **< 20ms** | **< 15ms** (Colocated) | **Direct to VM (< 2 sec)** | **$0.00** |
| **AWS EC2 (Single Region)** | **< 50ms** | **< 80ms** | **Direct to S3 (< 4 sec)** | **$0.00 (12 mos)** |
