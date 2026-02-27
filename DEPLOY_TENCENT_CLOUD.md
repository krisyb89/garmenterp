# Deploying Garment ERP on Tencent Cloud

## Architecture Overview

```
User → Tencent CDN (optional) → CVM / Lighthouse Server → Next.js App (PM2)
                                                         → MySQL (TencentDB or local)
```

**Recommended Stack:**
- Compute: Tencent Cloud CVM or Lighthouse (轻量应用服务器)
- Database: TencentDB for MySQL (managed) OR MySQL on the same CVM
- Reverse Proxy: Nginx
- Process Manager: PM2
- SSL: Let's Encrypt (free) via Certbot

---

### Step 1: Provision a Server

1. Go to [Tencent Cloud Console](https://console.cloud.tencent.com/)
2. Create a **Lighthouse** instance (轻量应用服务器) — cheapest option:
   - Region: Choose same region as your TencentDB MySQL instance
   - Image: Ubuntu 22.04 LTS
   - Specs: 2 CPU / 4GB RAM minimum (enough for ~20 concurrent users)
   - Storage: 60GB SSD
3. Open firewall ports: **22** (SSH), **80** (HTTP), **443** (HTTPS)

### Step 2: Database (TencentDB for MySQL — Already Provisioned)

Your database is already running on TencentDB for MySQL. Just ensure:
1. The CVM/Lighthouse server's **private IP** is whitelisted in the TencentDB security group
2. You have the internal endpoint (e.g., `sh-cynosdbmysql-grp-xxx.sql.tencentcdb.com:3306`)
3. A database named `garment_erp` exists with a dedicated user

### Step 3: Install Node.js & Dependencies

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 4: Deploy the Application

```bash
# Create app directory
sudo mkdir -p /var/www/garment-erp
sudo chown $USER:$USER /var/www/garment-erp

# Upload your code (from your local machine):
# scp -r ./Garment\ ERP/* user@your-server-ip:/var/www/garment-erp/

# Or use git:
cd /var/www/garment-erp
git clone <your-repo-url> .

# Create environment file
cat > .env << 'EOF'
# Database — use your TencentDB internal endpoint
DATABASE_URL="mysql://erpadmin:YourPassword@sh-cynosdbmysql-grp-xxx.sql.tencentcdb.com:3306/garment_erp"

# Auth
JWT_SECRET="your-random-secret-at-least-32-chars-long-change-this"

# App
NODE_ENV=production
PORT=3000
EOF

# Install dependencies & build
npm install
npx prisma db push
npm run build

# Seed initial data (if first deploy)
npm run seed
```

### Step 5: Run with PM2

```bash
# Start the app
pm2 start npm --name "garment-erp" -- start

# Auto-restart on server reboot
pm2 startup
pm2 save

# Useful PM2 commands:
# pm2 logs garment-erp    — view logs
# pm2 restart garment-erp — restart app
# pm2 status              — check status
```

### Step 6: Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/garment-erp
```

Paste the following (replace `your-domain.com`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

Enable and start:

```bash
sudo ln -s /etc/nginx/sites-available/garment-erp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Step 7: Enable HTTPS (SSL)

```bash
# Point your domain's DNS A record to your server IP first, then:
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

---

## Updating the Application

When you have code updates:

```bash
cd /var/www/garment-erp

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Apply database schema changes
npx prisma db push

# Rebuild
npm run build

# Restart
pm2 restart garment-erp
```

---

## Cost Estimate (Monthly)

| Component | Spec | Approx. Cost (CNY) |
|-----------|------|---------------------|
| Lighthouse 2C4G | Ubuntu, 60GB SSD | ¥50-80/月 |
| TencentDB MySQL | Already provisioned | (existing cost) |
| Domain + DNS | .com domain | ¥5-10/月 |
| **Total (server + domain only)** | | **¥55-90/月** |

---

## If Using Without a Domain (IP Only)

Skip the Certbot step. Access via `http://your-server-ip`. For HTTPS without a domain, you can use a self-signed certificate, but browsers will show a warning.

---

## Backup Strategy

TencentDB for MySQL has built-in automatic backups. You can also run manual backups from your server:

```bash
# Manual database backup (connect to TencentDB via internal endpoint)
mysqldump -h sh-cynosdbmysql-grp-xxx.sql.tencentcdb.com -u erpadmin -p garment_erp > /backup/garment_erp_$(date +%Y%m%d).sql

# Crontab entry (daily at 2 AM):
# 0 2 * * * mysqldump -h sh-cynosdbmysql-grp-xxx.sql.tencentcdb.com -u erpadmin -pYourPassword garment_erp > /backup/garment_erp_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App won't start | Check `pm2 logs garment-erp` for errors |
| Database connection refused | Verify MySQL is running: `sudo systemctl status mysql` |
| 502 Bad Gateway | App crashed — `pm2 restart garment-erp` |
| Can't access from browser | Check firewall: ports 80/443 open in Tencent console |
| Prisma errors after schema change | Run `npx prisma db push` then `pm2 restart garment-erp` |
