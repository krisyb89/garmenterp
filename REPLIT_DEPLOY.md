# Deploy to Replit - Complete Guide

**Problem:** Full folder is 443MB (too large due to node_modules)
**Solution:** Upload without node_modules - Replit will install it automatically

---

## ✅ Ready to Upload

I've created a clean deployment package:

📦 **File:** `garment-erp-for-replit.zip` (38MB)
📍 **Location:** `/sessions/vibrant-upbeat-goodall/mnt/garment-erp-for-replit.zip`

**What's excluded:**
- ❌ node_modules/ (443MB) - Replit will run `npm install`
- ❌ .next/ (build files) - Replit will run `npm run build`
- ❌ .git/ (version control) - Not needed
- ❌ Log files - Not needed

---

## 🚀 Deployment Steps

### **Step 1: Upload to Replit**

1. Go to https://replit.com
2. Click **"+ Create Repl"**
3. Choose **"Import from Upload"**
4. Upload the `garment-erp-for-replit.zip` file (38MB)
5. Wait for extraction (~30 seconds)

### **Step 2: Replit Will Auto-Install**

Once uploaded, Replit automatically:
- ✅ Runs `npm install` (downloads node_modules)
- ✅ Detects it's a Next.js app
- ✅ Sets up PostgreSQL database
- ✅ Provides DATABASE_URL automatically

### **Step 3: Set Environment Variables**

In Replit, go to **Secrets** (🔒 icon) and add:

```
JWT_SECRET=your-super-secret-random-string-at-least-32-characters-long
```

**How to generate JWT_SECRET:**
```bash
# Run this in your terminal:
openssl rand -base64 32

# Or just make up a long random string:
# garment-erp-secret-key-2026-production-abc123xyz
```

### **Step 4: Run Migrations**

In Replit's Shell tab, run:

```bash
npx prisma migrate deploy
npx prisma generate
```

This will:
- Create all database tables
- Apply all migrations (including Phase 0 permissions)
- Create bootstrap admin user

### **Step 5: Click Run!**

Click the big green **"Run"** button in Replit.

Your app will start at: `https://your-repl-name.your-username.repl.co`

---

## 🔐 First Login

Once running, login with:

```
Email: admin@garment-erp.local
Password: admin123
```

**⚠️ CHANGE THIS PASSWORD IMMEDIATELY!**

---

## 🧪 Test Checklist

After deployment:

- [ ] App loads at Replit URL
- [ ] Can login with admin credentials
- [ ] Visit `/dashboard/wip/production`
- [ ] Production WIP table loads with color-coded cells
- [ ] Can create a test PO
- [ ] Can submit an approval
- [ ] Cell turns yellow/green as expected

---

## 🐛 Troubleshooting

### **"Cannot find module 'prisma'"**

**Solution:**
```bash
npm install
npx prisma generate
```

### **"Database connection failed"**

**Solution:**
1. Check if Replit PostgreSQL is enabled (left sidebar)
2. Verify DATABASE_URL is auto-provided (check Secrets)
3. Run migrations: `npx prisma migrate deploy`

### **"JWT_SECRET is required"**

**Solution:**
Add JWT_SECRET to Replit Secrets (see Step 3 above)

### **App shows white screen**

**Solution:**
```bash
# In Replit Shell:
rm -rf .next
npm run build
```

Then click Run again.

---

## 📦 Alternative: GitHub → Replit (Advanced)

If you prefer using Git:

### **Step 1: Push to GitHub**

```bash
cd "/sessions/vibrant-upbeat-goodall/mnt/Garment ERP"
git init
git add .
git commit -m "Initial commit - Garment ERP with Production WIP + Phase 0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/garment-erp.git
git push -u origin main
```

### **Step 2: Import to Replit**

1. Go to Replit
2. Click **"+ Create Repl"**
3. Choose **"Import from GitHub"**
4. Paste your GitHub repo URL
5. Click Import

Replit will automatically install dependencies.

---

## 🔄 Updating Your Repl (After Changes)

### **Method 1: Manual Upload**

1. Make changes locally
2. Create new zip (without node_modules)
3. Upload to Replit
4. Overwrite files

### **Method 2: Git Pull (if using GitHub)**

```bash
# In Replit Shell:
git pull origin main
npm install
npx prisma generate
```

---

## 📊 Replit Project Settings

**Recommended settings in Replit:**

**1. Run Command:**
```bash
npm run dev
```

**2. .replit file (auto-created):**
```toml
run = "npm run dev"
hidden = [".config", "node_modules", ".next"]

[nix]
channel = "stable-22_11"

[env]
PATH = "/home/runner/$REPL_SLUG/.config/npm/node_global/bin:/home/runner/$REPL_SLUG/node_modules/.bin:$PATH"

[deployment]
run = ["sh", "-c", "npm run build && npm run start"]
```

**3. Always-On (Optional):**
- Go to your Repl settings
- Enable "Always On" (requires paid plan)
- Keeps your app running 24/7

---

## 💰 Cost Notes

**Free Tier:**
- ✅ Unlimited public Repls
- ✅ PostgreSQL database included
- ✅ 0.5 GB RAM
- ⚠️ Repl sleeps after inactivity

**Hacker Plan ($7/month):**
- ✅ Private Repls
- ✅ Always-On feature
- ✅ 2 GB RAM
- ✅ Faster performance

For production use, Hacker plan is recommended.

---

## 🎯 Next Steps After Deploy

1. **Create Real Users:**
   - Don't use admin account for daily work
   - Create user accounts for your team
   - Assign appropriate roles

2. **Set Up Custom Domain (Optional):**
   - Replit supports custom domains
   - Connect your own domain name
   - Requires Hacker plan

3. **Monitor Performance:**
   - Check Replit logs for errors
   - Monitor database size
   - Set up backups

4. **Enable HTTPS (Automatic):**
   - Replit provides free HTTPS
   - No configuration needed

---

## 📞 Support

**Replit Help:**
- Docs: https://docs.replit.com
- Community: https://ask.replit.com

**Project Help:**
- See: PHASE0_GUIDE.md
- See: SETUP.md
- Check: Database with `npx prisma studio`

---

## ✅ Deployment Checklist

- [ ] Downloaded `garment-erp-for-replit.zip` (38MB)
- [ ] Created Replit account
- [ ] Uploaded zip to Replit
- [ ] Added JWT_SECRET to Secrets
- [ ] Ran migrations (`npx prisma migrate deploy`)
- [ ] Clicked Run
- [ ] Tested login (admin@garment-erp.local / admin123)
- [ ] Changed admin password
- [ ] Tested Production WIP page
- [ ] Created first real user

---

**Your app is now live on Replit!** 🎉

Access it at: `https://your-repl-name.your-username.repl.co`
