/*
 * © 2026 SeXyxeon (VOIDSEC)
 *
 * ⚠️ COPYRIGHT NOTICE
 * This source code is protected under copyright law.
 * Any form of re-uploading, recoding, modification,
 * selling, or redistribution WITHOUT explicit permission
 * from the original author is strictly prohibited.
 *
 * ❌ NO CREDIT = NO PERMISSION
 * ❌ DO NOT CLAIM THIS CODE AS YOUR OWN
 *
 * ✔️ Usage or modification is allowed ONLY
 * with prior permission and proper credit.
 *
 * OFFICIAL LINKS (ONLY):
 * YouTube   : https://youtube.com/@voidsec7718
 * Instagram : sabir._7718
 * Telegram  : https://t.me/SABIR7718
 * GitHub    : https://github.com/SABIR7718
 * WhatsApp  : +91 73650 85213
 *
 * Violations may result in DMCA takedown
 * or termination of the Telegram bot.
 */

require('dotenv').config();
const {
    spawn,
    execSync,
    exec
} = require('child_process');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { log } = require('@sabir7718/log');
const path = require('path');
const https = require('https');
const http = require('http');
const archiver = require('archiver');
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const DEB_FILE = process.env.DEB_FILE;
const PROFILE_PATH = process.env.PROFILE_PATH || path.resolve(__dirname, 'chrome-profile');
const STATUS_FILE = process.env.STATUS_FILE;
const IDX_URL = process.env.IDX_URL;
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL) || 60000;

if (!BOT_TOKEN || !CHAT_ID) {
    log('error', 'ENV', 'Missing BOT_TOKEN or CHAT_ID in .env file');
    process.exit(1);
}

let lastUpdateId = 0;
let refreshTimer = null;
let page = null;
let browser = null;
let xvfbProcess = null;

process.on('uncaughtException', (err) => log('error', 'CRITICAL', err.message));
process.on('unhandledRejection', (reason) => log('error', 'CRITICAL', reason));

async function saveToFirebase(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
    log('info', 'SESSION', `💾 Session saved with fileId: ${data.fileId}`);
}

function isProfileValid() {
    if (!fs.existsSync(PROFILE_PATH)) return false;
    const files = fs.readdirSync(PROFILE_PATH);
    return files.length > 20 && files.includes('Default');
}

function tgRequest(method, data = {}) {
    return new Promise((resolve) => {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
        const body = JSON.stringify(data);
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => resolve(JSON.parse(resData)));
        });
        req.on('error', (e) => log('error', 'TELEGRAM', `[TG ERROR]: ${e.message}`));
        req.write(body);
        req.end();
    });
}

function uploadToTelegram(filePath) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath);

        const form = {
            chat_id: CHAT_ID,
            document: fileStream
        };

        const req = https.request({
            hostname: "api.telegram.org",
            path: `/bot${BOT_TOKEN}/sendDocument`,
            method: "POST"
        }, (res) => {
            let body = "";
            res.on("data", d => body += d);
            res.on("end", () => {
                const json = JSON.parse(body);
                resolve(json.result.document.file_id);
            });
        });

        const boundary = "----NODEFORM";
        req.setHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

        req.write("--" + boundary + "\r\n");
        req.write(`Content-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}\r\n`);
        req.write("--" + boundary + "\r\n");
        req.write(`Content-Disposition: form-data; name="document"; filename="profile.zip"\r\n\r\n`);

        fileStream.on("data", chunk => req.write(chunk));
        fileStream.on("end", () => {
            req.write("\r\n--" + boundary + "--");
            req.end();
        });

        req.on("error", reject);
    });
}

async function saveSession(fileId) {
    const data = {
        loggedIn: true,
        fileId: fileId,
        updated: new Date().toISOString()
    };

    await saveToFirebase(data);
}

function downloadFromTelegram(fileId, outputPath) {
    return new Promise((resolve) => {
        const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/`;

        tgRequest("getFile", {
            file_id: fileId
        }).then(res => {
            const filePath = res.result.file_path;
            const fullUrl = url + filePath;

            const file = fs.createWriteStream(outputPath);

            https.get(fullUrl, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve();
                });
            });
        });
    });
}

async function restoreProfile(fileId) {
    const zipPath = path.join(__dirname, "restore.zip");

    await downloadFromTelegram(fileId, zipPath);

    await new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(require('unzipper').Extract({
                path: PROFILE_PATH
            }))
            .on('close', resolve)
            .on('error', reject);
    });

    log('success', 'PROFILE_RESTORE', 'Profile restored from Telegram');
}

function zipProfile(zipPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: {
                level: 9
            }
        });

        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(PROFILE_PATH, false);
        archive.finalize();
    });
}

async function logAll(text) {
    const time = new Date().toLocaleTimeString();
    log('info', 'BOT', `[${time}] 🤖 ${text}`);
    return await tgRequest('sendMessage', {
        chat_id: CHAT_ID,
        text: `🤖: ${text}`
    });
}

async function getTgMessage() {
    try {
        const res = await tgRequest('getUpdates', {
            offset: lastUpdateId + 1,
            timeout: 20
        });
        if (res.ok && res.result.length > 0) {
            lastUpdateId = res.result[res.result.length - 1].update_id;
            const msg = res.result[res.result.length - 1].message.text;
            log('info', 'TELEGRAM_IN', `Message from Telegram: "${msg}"`);
            return msg;
        }
    } catch (e) {
        log('error', 'TELEGRAM', `Polling Error: ${e.message}`);
    }
    return null;
}

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

function setupVPSEnvironment() {
    log('info', 'SYSTEM_CHECK', 'Checking system dependencies for VPS...');

    try {
        execSync('google-chrome --version', {
            stdio: 'ignore'
        });
        log('info', 'CHROME', 'Chrome detected.');
    } catch (e) {
        log('warn', 'CHROME', 'Chrome NOT found. Installing...');
        if (!fs.existsSync(DEB_FILE)) {
            log('error', 'FATAL', `❌ DEB file not found: ${DEB_FILE}`);
            process.exit(1);
        }
        try {
            execSync(`sudo dpkg -i ${DEB_FILE}`, {
                stdio: 'ignore'
            });
        } catch (err) {
            execSync('sudo apt-get install -f -y', {
                stdio: 'ignore'
            });
        }
        log('success', 'CHROME_SETUP', 'Chrome installed!');
    }

    try {
        execSync('which Xvfb', {
            stdio: 'ignore'
        });
        log('success', 'XVFB', 'Xvfb detected.');
    } catch (e) {
        log('warn', 'XVFB', 'Xvfb (Virtual Display) NOT found. Installing...');
        execSync('sudo apt-get update && sudo apt-get install -y xvfb', {
            stdio: 'inherit'
        });
        log('success', 'XVFB', 'Xvfb installed!');
    }
}

async function startVirtualDisplay() {
    log('info', 'XVFB', 'Starting Virtual Display (DISPLAY=:99)...');
    xvfbProcess = spawn('Xvfb', [':99', '-screen', '0', '1280x800x24']);
    process.env.DISPLAY = ':99';
    await new Promise(r => setTimeout(r, 2000));
    log('success', 'DISPLAY', 'Virtual Display ready!');
}

function saveLoginStatus(status) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({
        loggedIn: status,
        lastUpdate: new Date()
    }));
    log('info', 'LOGIN_STATUS', `Login status saved as: ${status}`);
}

function getLoginStatus() {
    if (!fs.existsSync(STATUS_FILE)) return false;
    const data = JSON.parse(fs.readFileSync(STATUS_FILE));
    return data.loggedIn;
}

async function handleFullLoginFlow() {
    await logAll("⚠️ LOGIN REQUIRED! Please send your GMAIL address on Telegram.");

    let email = null;
    while (!email) {
        email = await getTgMessage();
        if (!email) await new Promise(r => setTimeout(r, 1000));
    }

    log('info', 'AUTH', `Entering email: ${email}`);
    await page.goto('https://accounts.google.com/', {
        waitUntil: 'networkidle2'
    });
    await page.waitForSelector('#identifierId');
    await page.type('#identifierId', email, {
        delay: 100
    });
    await page.keyboard.press('Enter');

    await logAll("🔑 Gmail entered. Now send your PASSWORD on Telegram:");

    let pass = null;
    while (!pass) {
        pass = await getTgMessage();
        if (!pass) await new Promise(r => setTimeout(r, 1000));
    }

    log('info', 'AUTH', 'Typing password...');
    await page.waitForSelector('input[type="password"]', {
        visible: true
    });
    await page.type('input[type="password"]', pass, {
        delay: 100
    });
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
    await page.goto(IDX_URL, {
        waitUntil: 'networkidle2',
        timeout: 90000
    });

    await logAll("✅ Loop Active! Script will refresh every 1 minute.");

    refreshTimer = setInterval(async () => {
        try {
            const time = new Date().toLocaleTimeString();
            log('info', 'REFRESH', `[${time}] Triggering refresh...`);
            await page.reload({
                waitUntil: 'networkidle2'
            });

            await page.mouse.move(Math.random() * 500, Math.random() * 500);
            log('info', 'REFRESH', `[${time}] ✨ Refresh Successful.`);
        } catch (e) {
            log('error', 'REFRESH', `ERROR: ${e.message}`);
        }
    }, REFRESH_INTERVAL);
}

async function backupProfile() {
    try {
        if (!fs.existsSync(PROFILE_PATH) || fs.readdirSync(PROFILE_PATH).length === 0) {
            log('warn', 'BACKUP', 'Profile directory empty, skipping backup');
            return null;
        }

        const zipPath = path.join(__dirname, 'profile_backup.zip');
        await zipProfile(zipPath);

        log('info', 'BACKUP', 'Uploading profile to Telegram...');
        const fileId = await uploadToTelegram(zipPath);

        await saveSession(fileId);

        log('success', 'BACKUP', 'Profile successfully backed up to Telegram');
        fs.unlinkSync(zipPath);
        return fileId;
    } catch (e) {
        log('error', 'BACKUP', `Backup failed: ${e.message}`);
        return null;
    }
}

async function restoreFromCloud() {
    try {
        let fileId = null;

        if (fs.existsSync(STATUS_FILE)) {
            const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
            fileId = status.fileId;
        }

        if (!fileId) {
            log('warn', 'RESTORE', 'No backup fileId found in status');
            return false;
        }

        log('info', 'RESTORE', 'Restoring profile from Telegram...');
        await restoreProfile(fileId);
        return true;
    } catch (e) {
        log('error', 'PROFILE_RESTORE', `Restore failed: ${e.message}`);
        return false;
    }
}

async function main() {
    log('info', 'SYSTEM', '--- SCRIPT STARTING (VPS MODE) ---');
    setupVPSEnvironment();
    await startVirtualDisplay();

    const profileExists = fs.existsSync(PROFILE_PATH) &&
        fs.readdirSync(PROFILE_PATH).length > 10;

    if (!profileExists || !getLoginStatus()) {
        log('warn', 'PROFILE', 'No valid local profile found. Trying cloud restore...');
        const restored = await restoreFromCloud();

        if (!restored) {
            log('warn', 'PROFILE_RESTORE', 'Cloud restore failed. Will do fresh login.');
        }
    }

    log('info', 'CHROME', 'Launching Chrome...');
    spawn('google-chrome', [
        `--remote-debugging-port=9222`,
        `--user-data-dir=${PROFILE_PATH}`,
        '--no-sandbox',
        '--password-store=basic',
        '--disable-dev-shm-usage'
    ], {
        env: process.env
    });

    await new Promise(r => setTimeout(r, 15000));

    browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
    });

    const pages = await browser.pages();
    page = pages.length > 0 ? pages[0] : await browser.newPage();

    log('success', 'PUPPETEER', 'Puppeteer connected.');

    if (getLoginStatus()) {
        await logAll("♻️ Restored session. Starting IDX loop...");
        await startIDXLoop();
    } else {
        await handleFullLoginFlow();
    }

    setInterval(async () => {
        if (getLoginStatus()) {
            await backupProfile();
        }
    }, 30 * 60 * 1000);

    setTimeout(() => {
        if (getLoginStatus()) backupProfile();
    }, 5 * 60 * 1000);

    log('info', 'TELEGRAM', 'Listening for commands...');
    while (true) {
        const msg = await getTgMessage();

        if (msg === '/backup') {
            await logAll("📤 Manual backup requested...");
            await backupProfile();
        }

        if (msg === '/stop') {
            ...
        }

        if (msg === '/view') {
            ...
        }

        await new Promise(r => setTimeout(r, 3000));
    }
}

const LIVE_PATH = path.join(__dirname, 'public', 'live.jpg');

if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
}

let screenshotInterval = null;
let stopTimeout = null;

function startLiveMode() {

    if (!screenshotInterval) {

        log('info', 'LIVE', 'Live mode started');

        screenshotInterval = setInterval(async () => {

            try {

                if (!page) return;

                await page.screenshot({
                    path: LIVE_PATH,
                    type: 'jpeg',
                    quality: 50,
                    fullPage: false
                });

            } catch (e) {

                log('error', 'SCREENSHOT', `Screenshot error: ${e.message}`);

            }

        }, 2000);

    }

    clearTimeout(stopTimeout);

    stopTimeout = setTimeout(() => {

        clearInterval(screenshotInterval);

        screenshotInterval = null;

        log('warn', 'LIVE', 'Live mode stopped after 1 minute');

    }, 60000);

}

http.createServer((req, res) => {

    if (req.url === '/') {

        startLiveMode();

        res.writeHead(200, {
            'Content-Type': 'text/html'
        });

        return res.end(`
<!DOCTYPE html>
<html>
<head>

<title>Live Browser</title>

<style>

body{
    margin:0;
    background:black;
    overflow:hidden;
}

img{
    width:100vw;
    height:100vh;
    object-fit:contain;
}

</style>

</head>

<body>

<img id="live" src="/live.jpg">

<script>

setInterval(() => {

    document.getElementById('live').src =
        '/live.jpg?t=' + Date.now();

}, 500);

</script>

</body>
</html>
`);
    }

    if (req.url.startsWith('/live.jpg')) {

        try {

            const img = fs.readFileSync(LIVE_PATH);

            res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });

            return res.end(img);

        } catch {

            res.writeHead(404);

            return res.end('No image');

        }

    }

    res.writeHead(404);

    res.end('404');

}).listen(PORT, () => {

    log('info', 'SERVER', 'Live stream running on port ' + PORT);

});

process.on('exit', () => {
    if (xvfbProcess) xvfbProcess.kill();
});
process.on('SIGINT', () => {
    process.exit();
});

main().catch(async (e) => {
    log('error', 'CRITICAL', `CRITICAL ERROR: ${e.message}`);
    await tgRequest('sendMessage', {
        chat_id: CHAT_ID,
        text: errorMsg
    });
});

if (process.env.URL) {

    (async () => {
        try {
            const res = await fetch(process.env.URL);
            log('info', 'PING', `Pinged: ${process.env.URL} | Status: ${res.status}`);
        } catch (err) {
            log('error', 'PING', err.message);
        }
    })();

    setInterval(async () => {
        try {
            const res = await fetch(process.env.URL);
            log('info', 'PING', `Pinged: ${process.env.URL} | Status: ${res.status}`);
        } catch (err) {
            log('error', 'PING', err.message);
        }
    }, 5 * 60 * 1000);
}
