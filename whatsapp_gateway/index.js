const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 18789;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up file uploads for media in a local uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });

let qrCodeData = null;
let connectionStatus = 'INITIALIZING'; // 'INITIALIZING', 'QR_READY', 'CONNECTED', 'DISCONNECTED', 'AUTHENTICATING'

// Recursive lock cleaner to prevent stale Chromium launches from failing in Docker volumes
const deleteSingletonLock = (dir) => {
    if (!fs.existsSync(dir)) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                deleteSingletonLock(filePath);
            } else if (file === 'SingletonLock') {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`[WHATSAPP GATEWAY] Deleted stale Chromium lock: ${filePath}`);
                } catch (err) {
                    console.error(`[WHATSAPP GATEWAY] Failed to delete lock: ${err.message}`);
                }
            }
        }
    } catch (err) {
        console.error(`[WHATSAPP GATEWAY] Directory read error during lock cleanup: ${err.message}`);
    }
};

const authDir = path.join(__dirname, '.wwebjs_auth');
deleteSingletonLock(authDir);

console.log('[WHATSAPP GATEWAY] Starting embedded WhatsApp engine...');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: authDir
    }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('[WHATSAPP GATEWAY] New QR Code generated.');
    try {
        qrCodeData = await qrcode.toDataURL(qr);
        connectionStatus = 'QR_READY';
    } catch (err) {
        console.error('[WHATSAPP GATEWAY] Failed to render QR as data URL:', err);
    }
});

client.on('ready', () => {
    console.log('[WHATSAPP GATEWAY] Connection established! Client is ready.');
    connectionStatus = 'CONNECTED';
    qrCodeData = null;
});

client.on('authenticated', () => {
    console.log('[WHATSAPP GATEWAY] Authenticated successfully.');
    connectionStatus = 'AUTHENTICATING';
});

client.on('auth_failure', (msg) => {
    console.error('[WHATSAPP GATEWAY] Authentication failure:', msg);
    connectionStatus = 'DISCONNECTED';
});

client.on('disconnected', (reason) => {
    console.log('[WHATSAPP GATEWAY] Client logged out or disconnected:', reason);
    connectionStatus = 'DISCONNECTED';
    qrCodeData = null;
    // Re-initialize client after disconnection
    console.log('[WHATSAPP GATEWAY] Re-initializing WhatsApp Web client...');
    client.initialize().catch(err => console.error('[WHATSAPP GATEWAY] Re-initialization failed:', err));
});

// Initialize client
client.initialize().catch(err => {
    console.error('[WHATSAPP GATEWAY] Failed to initialize client:', err);
    connectionStatus = 'DISCONNECTED';
});

// HTTP REST API

// GET /status: fetch current gateway connection state
app.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        hasQr: !!qrCodeData
    });
});

// GET /qr: fetch current QR code base64 image data
app.get('/qr', (req, res) => {
    if (qrCodeData) {
        res.json({ qr: qrCodeData });
    } else {
        res.status(404).json({ error: 'QR Code not ready or client is already connected.' });
    }
});

// POST /api/send: sends message with optional media, mimicking OpenClaw contract
app.post('/api/send', upload.single('media'), async (req, res) => {
    const { phone, message } = req.body;
    const mediaFile = req.file;

    if (!phone || !message) {
        return res.status(400).json({ error: 'Missing phone or message in payload.' });
    }

    if (connectionStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp Gateway is offline. Please scan the QR code in settings.' });
    }

    // Convert phone number to WhatsApp ID format (e.g. "919876543210@c.us")
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = '91' + cleanPhone.substring(1);
    }
    if (!cleanPhone.endsWith('@c.us')) {
        cleanPhone = `${cleanPhone}@c.us`;
    }

    console.log(`[WHATSAPP GATEWAY] Outgoing message to: ${cleanPhone}`);

    try {
        let response;
        if (mediaFile) {
            const mediaPath = mediaFile.path;
            const mimeType = mediaFile.mimetype;
            const filename = mediaFile.originalname;
            
            const media = new MessageMedia(
                mimeType,
                fs.readFileSync(mediaPath).toString('base64'),
                filename
            );
            
            response = await client.sendMessage(cleanPhone, media, { caption: message });
            
            // Delete temp file after dispatch
            fs.unlinkSync(mediaPath);
            console.log(`[WHATSAPP GATEWAY] Media message successfully sent to ${cleanPhone}`);
        } else {
            response = await client.sendMessage(cleanPhone, message);
            console.log(`[WHATSAPP GATEWAY] Text message successfully sent to ${cleanPhone}`);
        }
        
        res.json({ success: true, messageId: response.id.id });
    } catch (err) {
        console.error('[WHATSAPP GATEWAY] Failed to dispatch message:', err);
        if (mediaFile && fs.existsSync(mediaFile.path)) {
            fs.unlinkSync(mediaFile.path);
        }
        res.status(500).json({ error: `Message delivery failed: ${err.message}` });
    }
});

// POST /logout: force disconnect/logout
app.post('/logout', async (req, res) => {
    try {
        if (connectionStatus === 'CONNECTED') {
            await client.logout();
            console.log('[WHATSAPP GATEWAY] Client logged out manually via dashboard.');
            res.json({ success: true, message: 'Successfully logged out device.' });
        } else {
            res.status(400).json({ error: 'Gateway is not currently connected.' });
        }
    } catch (err) {
        console.error('[WHATSAPP GATEWAY] Logout failed:', err);
        res.status(500).json({ error: `Logout operation failed: ${err.message}` });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WHATSAPP GATEWAY] Server is listening on http://localhost:${PORT}`);
});
