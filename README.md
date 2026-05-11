# 🚀 SABIR7718 IDX Keeper - Render / VPS Edition

<div align="center">

# ⚡ IDX_ALIVE
### Automated Google IDX Workspace Keeper

Keep your Google IDX Workspace alive **24/7** using **Headless Chrome + Puppeteer + Telegram Automation**

<br>

![License](https://img.shields.io/badge/License-Copyright%202026-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Render%20%7C%20VPS-black?style=for-the-badge)
![Developer](https://img.shields.io/badge/Developer-SABIR7718-red?style=for-the-badge)

<br>

<a href="https://render.com/deploy">
  <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render">
</a>

</div>

---

# ✨ Features

## 🤖 Fully Automated Login System
- Auto Gmail Login
- Password Handling via Telegram
- 2FA Support
- Smart Session Recovery

## 💾 Smart Backup System
- Telegram Backup Upload
- Firebase Backup Support
- Auto Restore on Restart
- ZIP Profile Compression

## 🌐 Live Browser Monitoring
- Live Browser Screenshot View
- Web Access via VPS IP
- Real-Time Workspace Monitoring
- Auto Screenshot Updates

## 🔄 Auto Keep Alive
- Refresh IDX Workspace Every Minute
- Prevent Auto Logout
- Crash Recovery System
- Auto Browser Restart

## 🛡️ Stability & Recovery
- Chrome Profile Cleanup
- Session Lock Removal
- Error Handling System
- VPS Optimized

---

# 📦 Requirements

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| Ubuntu VPS | 20.04 / 22.04 |
| RAM | 2GB Recommended |
| Storage | 5GB+ |
| Google Chrome | Latest |

---

# 🚀 Quick Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/SABIR7718/IDX_ALIVE
cd IDX_ALIVE
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Create `.env`

Create `.env` file in root directory:

```env
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
IDX_URL=https://idx.google.com/your-workspace-url
FIREBASE_URL=your_firebase_realtime_database_url

PORT=10000
PROFILE_PATH=./chrome-profile
STATUS_FILE=./status.json
REFRESH_INTERVAL=60000
```

---

## 4️⃣ Start Application

```bash
node app.js
```

---

# ☁️ Deploy to Render

## 📌 Create `render.yaml`

```yaml
services:
  - type: web
    name: idx-alive
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node app.js
    autoDeploy: true
```

---

## 📌 Render Environment Variables

| Key | Value |
|---|---|
| BOT_TOKEN | Your Telegram Bot Token |
| CHAT_ID | Your Telegram Chat ID |
| IDX_URL | Your Google IDX Workspace URL |
| FIREBASE_URL | Firebase Realtime DB URL |
| PORT | 10000 |

---

# 📲 Telegram Commands

| Command | Function |
|---|---|
| `/backup` | Backup Current Chrome Profile |
| `/view` | Capture Live Screenshot |
| `/stop` | Full Reset & Fresh Login |
| `/reset` | Same as Stop |

---

# 🛠️ Tech Stack

- Node.js
- Puppeteer
- Google Chrome
- Xvfb
- Express Server
- Telegram Bot API
- Firebase Realtime Database
- Archiver ZIP

---

# 📂 Project Structure

```bash
IDX_ALIVE/
│
├── chrome-profile/
├── public/
│   └── live.jpg
│
├── app.js
├── index.js
├── package.json
├── .env
├── status.json
├── profile_backup.zip
└── README.md
```

---

# 🌍 Live Browser Access

Open in browser:

```bash
http://YOUR_VPS_IP:10000
```

---

# ⚠️ Important Notes

- Recommended for Ubuntu VPS
- Open Port `10000` and `9222`
- Use `/stop` before resetting manually
- First startup requires Google Login
- Keep backup enabled for safety

---

# 🔥 Recommended VPS Specs

| Resource | Recommended |
|---|---|
| CPU | 2 Core |
| RAM | 2GB+ |
| Storage | 10GB SSD |
| Network | Unlimited |

---

# 👨‍💻 Developer

<div align="center">

# SABIR7718 (VOIDSEC)

### 🌐 Social Links

[YouTube](https://youtube.com/@voidsec7718)

[Instagram](https://instagram.com/sabir._7718)

[Telegram](https://t.me/SABIR7718)

[GitHub](https://github.com/SABIR7718)

</div>

---

# 📜 License

```text
© 2026 SeXyxeon (VOIDSEC)

All Rights Reserved.

Unauthorized copying, modification,
re-uploading, selling, or redistribution
without permission is strictly prohibited.
```

---

<div align="center">

# ❤️ Made For Stability & Automation

### ⚡ Powered By VOIDSEC

</div>
