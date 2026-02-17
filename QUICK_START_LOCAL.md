# ⚡ Quick Start - Run Locally in 5 Minutes

## 🎯 Goal
Get Garment ERP running on your computer for **10x faster development**.

---

## 🚀 The Easy Way (Automated)

### **Mac/Linux:**
```bash
cd "/path/to/Garment ERP"
./setup.sh
```

### **Windows:**
```cmd
cd "C:\path\to\Garment ERP"
setup.bat
```

**Then:**
```bash
npm run dev
```

**Open:** http://localhost:3000

✅ **Done!** You're now developing locally.

---

## 📝 The Manual Way (Step by Step)

If the automated script doesn't work, run these commands one by one:

### **1. Navigate to project:**
```bash
cd "/path/to/Garment ERP"
```

### **2. Install dependencies:**
```bash
npm install
```
⏱️ Takes ~2 minutes

### **3. Setup database:**
```bash
npx prisma generate
npx prisma migrate deploy
```

### **4. Start the server:**
```bash
npm run dev
```

### **5. Open browser:**
Go to: **http://localhost:3000**

---

## 🔑 Login Credentials

**Admin account:**
- Email: `admin@garment-erp.local`
- Password: `admin123`

---

## ✨ Why This Is Better

### **Before (Slow):**
```
Write code → Upload to Replit (3 min) → Test → Feedback → Repeat
```
⏱️ **~5 minutes per iteration**

### **Now (Fast):**
```
Write code → Save file → Auto-refresh (1 sec) → Test → Feedback → Repeat
```
⏱️ **~10 seconds per iteration**

### **Deploy to Replit:**
Only when feature is complete (maybe once per day)

---

## 🎨 Development Workflow

### **Daily routine:**

**Morning:**
```bash
cd "/path/to/Garment ERP"
npm run dev
```
Leave Terminal open all day

**While working:**
1. I write code → You save files
2. Browser auto-refreshes
3. Test immediately
4. Give feedback
5. Repeat instantly!

**Evening:**
- Press `Ctrl + C` to stop server
- Close Terminal

---

## 🔧 Common Commands

### **Start development:**
```bash
npm run dev
```

### **Stop server:**
Press `Ctrl + C`

### **View database:**
```bash
npx prisma studio
```
Opens at: http://localhost:5555

### **Reset database:**
```bash
npx prisma migrate reset
```
⚠️ Deletes all data!

---

## 🐛 Quick Fixes

### **Port already in use:**
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F
```

### **Module not found:**
```bash
rm -rf node_modules
npm install
```

### **Database error:**
```bash
npx prisma generate
npx prisma migrate deploy
```

---

## 📊 What Changed?

### **Files created:**
- ✅ `.env` - Environment variables (database URL, secrets)
- ✅ `LOCAL_SETUP.md` - Full documentation
- ✅ `setup.sh` / `setup.bat` - Automated setup scripts

### **What you have now:**

**On Your Computer (Local):**
- 💻 Full Garment ERP running
- ⚡ Instant hot reload
- 🔄 Fast testing
- 📝 Easy debugging

**On Replit (Production):**
- 🌐 Live app for your team
- 📦 Deploy when features are done
- 🔒 Production database

---

## 🎯 Success Checklist

After running `npm run dev`, you should see:

- [ ] Terminal shows: `✓ Ready in X.Xs`
- [ ] Terminal shows: `Local: http://localhost:3000`
- [ ] Browser loads the app
- [ ] Can login with admin credentials
- [ ] Can view Purchase Orders
- [ ] Edit a file → Browser auto-refreshes

**All checked?** ✅ **You're ready!**

---

## 💡 Pro Tips

### **Keep it running:**
- Don't close Terminal while working
- Leave `npm run dev` running all day
- Server automatically detects file changes

### **Multiple projects?**
```bash
npm run dev -- -p 3001  # Use different port
```

### **Check for errors:**
- Press `F12` in browser
- Look at Console tab
- Red text = errors to fix

---

## 📞 Need Help?

**See full guide:** `LOCAL_SETUP.md`

**Common issues:**
1. Node.js not installed → Download from https://nodejs.org
2. Port already in use → Kill process or use different port
3. Database connection error → Check `.env` file
4. Module not found → Run `npm install`

---

## 🎉 You're All Set!

**Next steps:**
1. Run `npm run dev`
2. Open http://localhost:3000
3. Start building features!

When ready to deploy → See `REPLIT_DEPLOY.md`

---

**Questions?** Just ask! I'm here to help. 🚀
