const { spawn, execSync, exec } = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- ⚙️ CONFIGURATION ---
const BOT_TOKEN = '8796142496:AAFPISn8X8xlHfr8EZEmP50xkHyOOOHpBwM'; 
const CHAT_ID = '1401470950';
const DEB_FILE = './google-chrome-stable_current_amd64.deb';
const PROFILE_PATH = path.resolve(__dirname, 'chrome-profile');
const STATUS_FILE = './login_status.json';
const IDX_URL = 'https://idx.google.com/vpssy-89529048';
const REFRESH_INTERVAL = 60000;

let lastUpdateId = 0;
let refreshTimer = null;
let page = null;
let browser = null;
let xvfbProcess = null;

// --- 🛠️ LOGGING & TELEGRAM HELPERS ---
function tgRequest(method, data = {}) {
    return new Promise((resolve) => {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
        const body = JSON.stringify(data);
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => resolve(JSON.parse(resData)));
        });
        req.on('error', (e) => console.error(`[TG ERROR]: ${e.message}`));
        req.write(body);
        req.end();
    });
}

async function logAll(text) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] 🤖 ${text}`);
    return await tgRequest('sendMessage', { chat_id: CHAT_ID, text: `🤖: ${text}` });
}

async function getTgMessage() {
    try {
        const res = await tgRequest('getUpdates', { offset: lastUpdateId + 1, timeout: 20 });
        if (res.ok && res.result.length > 0) {
            lastUpdateId = res.result[res.result.length - 1].update_id;
            const msg = res.result[res.result.length - 1].message.text;
            console.log(`[INCOMING] Message from Telegram: "${msg}"`);
            return msg;
        }
    } catch (e) {
        console.error("Polling Error:", e.message);
    }
    return null;
}

// 📸 NAYA FUNCTION: Screenshot bhejne ke liye (Zero Dependency)
function sendTgPhoto(imagePath) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const fileData = fs.readFileSync(imagePath);
        
        let postDataStart = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="chat_id"\r\n\r\n` +
            `${CHAT_ID}\r\n` +
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="photo"; filename="screenshot.png"\r\n` +
            `Content-Type: image/png\r\n\r\n`
        );
        let postDataEnd = Buffer.from(`\r\n--${boundary}--\r\n`);
        
        const req = https.request({
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendPhoto`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': postDataStart.length + fileData.length + postDataEnd.length
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        
        req.on('error', reject);
        req.write(postDataStart);
        req.write(fileData);
        req.write(postDataEnd);
        req.end();
    });
}

// --- 🔍 SYSTEM & DISPLAY HELPERS ---
function setupVPSEnvironment() {
    console.log("🔍 Checking system dependencies for VPS...");
    
    // 1. Check/Install Chrome
    try {
        execSync('google-chrome --version', { stdio: 'ignore' });
        console.log("✅ Chrome detected.");
    } catch (e) {
        console.log("⚠️ Chrome NOT found. Installing...");
        if (!fs.existsSync(DEB_FILE)) {
            console.error(`❌ FATAL: ${DEB_FILE} not found!`);
            process.exit(1);
        }
        try { 
            execSync(`sudo dpkg -i ${DEB_FILE}`, { stdio: 'ignore' }); 
        } catch (err) { 
            execSync('sudo apt-get install -f -y', { stdio: 'ignore' }); 
        }
        console.log("✅ Chrome installed!");
    }

    // 2. Check/Install Xvfb (Virtual Screen)
    try {
        execSync('which Xvfb', { stdio: 'ignore' });
        console.log("✅ Xvfb detected.");
    } catch (e) {
        console.log("⚠️ Xvfb (Virtual Display) NOT found. Installing...");
        execSync('sudo apt-get update && sudo apt-get install -y xvfb', { stdio: 'inherit' });
        console.log("✅ Xvfb installed!");
    }
}

async function startVirtualDisplay() {
    console.log("🖥️ Starting Virtual Display (DISPLAY=:99)...");
    xvfbProcess = spawn('Xvfb', [':99', '-screen', '0', '1280x800x24']);
    process.env.DISPLAY = ':99';
    await new Promise(r => setTimeout(r, 2000));
    console.log("✅ Virtual Display ready!");
}

function saveLoginStatus(status) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ loggedIn: status, lastUpdate: new Date() }));
    console.log(`💾 Login status saved as: ${status}`);
}

function getLoginStatus() {
    if (!fs.existsSync(STATUS_FILE)) return false;
    const data = JSON.parse(fs.readFileSync(STATUS_FILE));
    return data.loggedIn;
}

// --- 🚀 CORE LOGIC ---
async function handleFullLoginFlow() {
    await logAll("⚠️ LOGIN REQUIRED! Please send your GMAIL address on Telegram.");
    
    let email = null;
    while (!email) {
        email = await getTgMessage();
        if (!email) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`📧 Entering email: ${email}`);
    await page.goto('https://accounts.google.com/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#identifierId');
    await page.type('#identifierId', email, { delay: 100 });
    await page.keyboard.press('Enter');

    await logAll("🔑 Gmail entered. Now send your PASSWORD on Telegram:");
    
    let pass = null;
    while (!pass) {
        pass = await getTgMessage();
        if (!pass) await new Promise(r => setTimeout(r, 1000));
    }

    console.log("🔒 Typing password...");
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.type('input[type="password"]', pass, { delay: 100 });
    await page.keyboard.press('Enter');

    await logAll("📱 Password submitted! Check your phone for 2FA. When you are in, send 'OK' on Telegram.");
    
    let confirmed = null;
    while (!confirmed || confirmed.toUpperCase() !== 'OK') {
        confirmed = await getTgMessage();
        if (!confirmed) await new Promise(r => setTimeout(r, 1000));
    }

    saveLoginStatus(true);
    await logAll("🎯 Login confirmed by user. Redirecting to IDX...");
    await startIDXLoop();
}

async function startIDXLoop() {
    if (refreshTimer) clearInterval(refreshTimer);
    
    await logAll(`🌐 Opening IDX Workspace: ${IDX_URL}`);
    await page.goto(IDX_URL, { waitUntil: 'networkidle2', timeout: 90000 });
    
    await logAll("✅ Loop Active! Script will refresh every 1 minute.");

    refreshTimer = setInterval(async () => {
        try {
            const time = new Date().toLocaleTimeString();
            console.log(`[${time}] 🔄 Triggering Refresh...`);
            await page.reload({ waitUntil: 'networkidle2' });
            
            await page.mouse.move(Math.random() * 500, Math.random() * 500);
            console.log(`[${time}] ✨ Refresh Successful.`);
        } catch (e) { 
            console.error(`[REFRESH ERROR]: ${e.message}`);
        }
    }, REFRESH_INTERVAL);
}

async function main() {
    console.log("--- SCRIPT STARTING (VPS MODE) ---");
    setupVPSEnvironment();
    await startVirtualDisplay();

    console.log("🚀 Launching Chrome Process in Virtual Screen...");
    spawn('google-chrome', [
        `--remote-debugging-port=9222`, 
        `--user-data-dir=${PROFILE_PATH}`, 
        '--no-sandbox', 
        '--password-store=basic',
        '--disable-dev-shm-usage'
    ], { env: process.env }); 
    
    console.log("⏳ Waiting for Chrome to warm up (5s)...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("🔗 Connecting Puppeteer...");
    browser = await puppeteer.connect({ 
        browserURL: 'http://127.0.0.1:9222', 
        defaultViewport: null 
    });
    
    const pages = await browser.pages();
    page = pages[0];
    console.log("✅ Puppeteer connected.");

    if (getLoginStatus()) {
        await logAll("♻️ Script Restarted: Loading IDX directly...");
        await startIDXLoop();
    } else {
        await handleFullLoginFlow();
    }

    console.log("👂 Listening for Telegram commands (/stop, /view)...");
    while (true) {
        const msg = await getTgMessage();
        
        if (msg === '/stop') {
            await logAll("🛑 STOP Command Received! Logging out...");
            clearInterval(refreshTimer);
            saveLoginStatus(false);
            await page.goto('https://accounts.google.com/Logout');
            await handleFullLoginFlow();
        } 
        // 📸 NAYA LOGIC: Screenshot command check
        else if (msg === '/view') {
            await logAll("📸 Taking screenshot...");
            try {
                const screenshotPath = path.resolve(__dirname, 'screenshot.png');
                await page.screenshot({ path: screenshotPath, fullPage: false });
                await sendTgPhoto(screenshotPath);
                await logAll("🖼️ Screenshot sent successfully!");
            } catch (err) {
                await logAll("❌ Failed to take screenshot: " + err.message);
            }
        }
        
        await new Promise(r => setTimeout(r, 3000)); 
    }
}

// Ensure Xvfb is killed if the node script stops
process.on('exit', () => {
    if (xvfbProcess) xvfbProcess.kill();
});
process.on('SIGINT', () => {
    process.exit();
});

main().catch(async (e) => {
    const errorMsg = `❌ CRITICAL ERROR: ${e.message}`;
    console.error(errorMsg);
    await tgRequest('sendMessage', { chat_id: CHAT_ID, text: errorMsg });
});
