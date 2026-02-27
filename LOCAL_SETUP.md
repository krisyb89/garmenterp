# 🚀 Local Development Setup Guide

You now have everything needed to run Garment ERP on your computer!

## ✅ Prerequisites Completed
- [x] Node.js installed
- [x] Replit database URL configured
- [x] `.env` file created

---

## 📋 Step-by-Step Setup

### **Step 1: Open Terminal**

**On Mac:**
- Press `Cmd + Space`, type "Terminal", press Enter

**On Windows:**
- Press `Win + R`, type "cmd", press Enter
- Or search for "Command Prompt" in Start menu

---

### **Step 2: Navigate to Your Project**

Copy and paste this command (adjust the path if your folder is somewhere else):

**Mac/Linux:**
```bash
cd "/path/to/Garment ERP"
```

**Windows:**
```cmd
cd "C:\path\to\Garment ERP"
```

💡 **Tip:** You can drag the folder into Terminal to auto-fill the path!

---

### **Step 3: Install Dependencies**

This downloads all the packages your app needs (creates `node_modules/` folder):

```bash
npm install
```

**What you'll see:**
```
added 324 packages in 45s
```

⏱️ **Takes about 1-2 minutes** (only need to do this once)

---

### **Step 4: Set Up Database**

Run the database migrations to create all the tables:

```bash
npx prisma migrate deploy
```

**What this does:**
- Creates all database tables (purchase_orders, suppliers, materials, etc.)
- Adds the Phase 0 permission fields
- Creates the bootstrap admin user

**What you'll see:**
```
✓ Applied 5 migrations in 234ms
```

Then generate the Prisma client:

```bash
npx prisma generate
```

**What you'll see:**
```
✓ Generated Prisma Client
```

---

### **Step 5: Start Development Server** 🎉

```bash
npm run dev
```

**What you'll see:**
```
  ▲ Next.js 14.2.16
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000

✓ Ready in 2.1s
```

---

## 🌐 Open Your App

1. Open your browser
2. Go to: **http://localhost:3000**
3. You should see the Garment ERP login page!

---

## 🧪 Test Phase 0 Permissions

### **Login Credentials:**

**Admin User (full access):**
- Email: `admin@garment-erp.local`
- Password: `admin123`

**Test the following:**

1. ✅ **Login as admin**
   - Go to Purchase Orders
   - Create a new PO
   - Save it as DRAFT
   - Edit it (should work)
   - Change status to CONFIRMED
   - Try to edit again (should be blocked with warning)

2. ✅ **Check Activity Log**
   - Every action should be logged
   - View at: http://localhost:3000/activity-log

---

## 🔥 Hot Reload Magic

**Now the magic happens!**

When I (or ChatGPT) make code changes:
1. Save the files
2. Browser automatically refreshes (within 1 second)
3. See changes immediately
4. No upload, no deploy, no waiting!

**Try it yourself:**
1. Open `src/app/page.js` in a text editor
2. Change some text
3. Save the file
4. Watch your browser auto-refresh!

---

## 🛠️ Common Commands

### **Start development server:**
```bash
npm run dev
```
(Keep this running while you work)

### **Stop the server:**
Press `Ctrl + C` in Terminal

### **Reset database (if needed):**
```bash
npx prisma migrate reset
```
⚠️ **Warning:** This deletes all data!

### **View database in GUI:**
```bash
npx prisma studio
```
Opens at: http://localhost:5555

---

## 🐛 Troubleshooting

### **"Port 3000 is already in use"**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### **"Cannot find module..."**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### **Database connection error**
```bash
# Check your .env file
cat .env

# Make sure DATABASE_URL is correct
# Should be: postgresql://postgres:password@helium/heliumdb?sslmode=disable
```

### **Prisma errors**
```bash
# Regenerate Prisma client
npx prisma generate

# Re-run migrations
npx prisma migrate deploy
```

---

## 📊 Development Workflow

### **Before you start each day:**
```bash
cd "/path/to/Garment ERP"
npm run dev
```

### **While developing:**
1. Edit code files
2. Browser auto-refreshes
3. Test immediately
4. Give feedback
5. Repeat!

### **When you're done:**
1. Press `Ctrl + C` to stop the server
2. Close Terminal

---

## 🚀 Next Steps

### **Now that you're running locally:**

1. **Faster iteration** - Changes appear instantly
2. **Better testing** - No deploy delays
3. **More efficient** - 10x faster than deploy-test cycle

### **When ready to deploy to Replit:**

```bash
# Commit your changes (if using Git)
git add .
git commit -m "Description of changes"

# Upload the new code to Replit
# (Can use GitHub or direct upload)
```

---

## 💡 Tips

### **Keep Terminal Open**
- Leave `npm run dev` running while you work
- Don't close the Terminal window
- Open a new Terminal tab/window if you need to run other commands

### **Browser DevTools**
- Press `F12` to open developer tools
- Check Console for any errors
- Network tab shows API calls

### **File Watcher**
- Next.js watches for file changes automatically
- If auto-refresh stops working, restart `npm run dev`

---

## ✅ Success Checklist

- [ ] Terminal shows "Ready in X.Xs"
- [ ] http://localhost:3000 loads the app
- [ ] Can login with admin@garment-erp.local
- [ ] Can create and edit Purchase Orders
- [ ] Changes to code files auto-refresh browser
- [ ] Activity log shows your actions

**If all checked ✅ → You're all set! Local development is working! 🎉**

---

## 🤝 Collaboration Workflow

### **Working with Claude (me) or ChatGPT:**

**Old way (slow):**
1. I write code
2. You upload to Replit (2-5 min wait)
3. Test
4. Give feedback
5. Repeat

**New way (fast):**
1. I write code
2. You save files locally
3. Browser refreshes (1 sec)
4. Test immediately
5. Give feedback
6. Repeat instantly!

**Deploy to Replit only when done** (maybe once per day or when feature is complete)

---

## 📞 Need Help?

If you run into issues:
1. Check the Troubleshooting section above
2. Copy the error message
3. Share it with me
4. I'll help you fix it!

---

Ready to start developing? Run `npm run dev` and let's go! 🚀
