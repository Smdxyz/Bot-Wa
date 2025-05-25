// index.js
const os = require('os');
const process = require('process');
const fs = require('node:fs/promises');
// const path = require('node:path'); // Tidak digunakan secara langsung, bisa dihapus
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    Browsers,
    DEFAULT_CONNECTION_CONFIG
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
// const qrcodeTerminal = require('qrcode-terminal'); // <<== DIHAPUS
const readline = require('readline');

const config = require('./config');
const { handleMessageUpsert } = require('./handlers/messageHandler');
const loadCommands = require('./utils/loadCommands');
const watchCommands = require('./utils/watchCommands');

const AUTH_FOLDER_PATH = 'auth_info_baileys';
global.WA_VERSION = null;
global.BAILEY_VERSION = null;

// State untuk mengelola proses autentikasi interaktif
let authProcessState = {
    expectingQR: false,
    pairingCodeRequested: false,
    pairingCodeDisplayed: false,
    readlineInstance: null
};

// Fungsi untuk menutup readline dengan aman dan mereset state terkait
const closeAuthReadline = () => {
    if (authProcessState.readlineInstance) {
        authProcessState.readlineInstance.close();
        authProcessState.readlineInstance = null;
    }
};

const resetAuthProcessFlags = () => {
    authProcessState.expectingQR = false;
    authProcessState.pairingCodeRequested = false;
    authProcessState.pairingCodeDisplayed = false;
};

// Fungsi untuk meminta pairing code melalui input terminal
async function requestPairingCodeViaTerminalInput(sockInstance, rlInstance) {
    try {
        const phoneNumber = await new Promise((resolve) => {
            rlInstance.question('Masukkan nomor HP Anda untuk Pairing Code (contoh: 6281234567890): ', resolve);
        });

        if (!phoneNumber || !phoneNumber.trim()) {
            console.log('Nomor HP tidak dimasukkan. Proses pairing code manual dibatalkan.');
            return false;
        }

        if (sockInstance && (sockInstance.ws.isOpen || sockInstance.ws.isConnecting) && !sockInstance.authState.creds.me) {
            console.log(`Meminta pairing code untuk nomor: ${phoneNumber}...`);
            authProcessState.pairingCodeRequested = true; // Tandai pairing code diminta
            await sockInstance.requestPairingCode(phoneNumber); // Akan memicu 'creds.update'
            return true;
        } else if (sockInstance.authState.creds.me) {
             console.log('Sesi sudah ada. Tidak meminta pairing code baru.');
             return false;
        } else {
            console.warn('Socket tidak tersedia atau tidak terbuka untuk requestPairingCode.');
            return false;
        }
    } catch (error) {
        console.error('Gagal mendapatkan pairing code manual:', error.message);
        // authProcessState.pairingCodeRequested = false; // Dikelola oleh pemanggil jika perlu reset
        return false;
    }
}


async function startBot() {
    // Pastikan folder auth ada
    try {
        await fs.mkdir(AUTH_FOLDER_PATH, { recursive: true });
    } catch (e) {
        console.error(`Tidak dapat membuat direktori ${AUTH_FOLDER_PATH}:`, e);
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER_PATH);

    const { version: waVersion, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan versi WA: v${waVersion.join('.')}, Versi terbaru: ${isLatest}`);
    global.WA_VERSION = waVersion.join('.');
    global.BAILEY_VERSION = require('@whiskeysockets/baileys/package.json').version;

    let sessionExists = !!(state.creds && state.creds.me && state.creds.me.id && state.creds.registered === true);

    // Tentukan apakah Baileys harus mencoba mencetak QR ke terminal.
    // Ini akan true jika:
    // 1. Tidak ada sesi yang tersimpan (`!sessionExists`)
    // 2. DAN kita TIDAK dalam mode autoAuth dengan nomor telepon yang sudah dikonfigurasi
    //    (karena dalam kasus itu, kita akan memprioritaskan pairing code otomatis dan tidak ingin QR muncul tiba-tiba).
    const shouldPrintQRInTerminalByBaileys = !sessionExists && !(config.autoAuth && config.botPhoneNumber);

    if (sessionExists) {
        console.log("Sesi autentikasi valid ditemukan. Mencoba menghubungkan...");
    } else {
        if (config.autoAuth && config.botPhoneNumber) {
            console.log("Belum ada sesi valid. Mode Auto-Auth (Pairing Code) akan dicoba secara otomatis.");
        } else {
            console.log("Belum ada sesi valid. Diperlukan autentikasi manual.");
            if (shouldPrintQRInTerminalByBaileys) {
                console.log("INFO: Jika memilih opsi QR, Baileys akan mencoba menampilkannya di terminal jika diperlukan server.");
            } else {
                console.log("INFO: printQRInTerminal Baileys dinonaktifkan karena konfigurasi autoAuth dengan nomor atau sesi sudah ada.");
            }
        }
    }

    const sock = makeWASocket({
        ...DEFAULT_CONNECTION_CONFIG,
        version: waVersion,
        logger: pino({ level: config.logLevel || 'silent' }),
        printQRInTerminal: shouldPrintQRInTerminalByBaileys, // <<== DIUBAH
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: Browsers.appropriate(config.botName || 'MyWhatsAppBot'),
        msgRetryCounterCache: new Map(),
        generateHighQualityLinkPreview: true,
        shouldIgnoreJid: jid => jid && jid.endsWith('@newsletter'),
        shouldSyncHistory: false,
        linkPreviewImageThumbnailWidth: 192,
    });

    // Helper untuk mendapatkan username
    sock.getWaUsername = async (msg, jid) => {
        try {
            let waUsername = sock.pushName || (msg && msg.pushName) || '';
            if (!waUsername || waUsername.trim() === "") {
                const contact = sock.contacts && sock.contacts[jid];
                waUsername = contact?.notify || contact?.name || jid.split('@')[0];
            }
            return waUsername || jid.split('@')[0];
        } catch (error) {
            console.error("Gagal mendapatkan username WA:", error);
            return jid.split('@')[0];
        }
    };

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr: newQr } = update;

        if (connection === 'open') {
            console.log('Koneksi berhasil terbuka! Bot siap digunakan.');
            const botJid = sock.authState.creds.me.id;
            const botUsername = await sock.getWaUsername(null, botJid);
            console.log(`Bot terhubung sebagai: ${botUsername} (${botJid})`);
            
            closeAuthReadline();
            resetAuthProcessFlags();
            sessionExists = true; // Update status sesi global
        }

        // Logika untuk newQr tanpa qrcode-terminal
        if (newQr) {
            if (authProcessState.expectingQR && !sessionExists && !authProcessState.pairingCodeRequested) {
                // Jika printQRInTerminal di makeWASocket adalah true, Baileys yang akan menampilkannya.
                // Kita tidak perlu melakukan apa-apa di sini selain memberi info.
                console.log('INFO: Server mengirim QR code.');
                if (!shouldPrintQRInTerminalByBaileys) { // Jika Baileys tidak dikonfigurasi untuk print QR
                     console.log('      Namun, printQRInTerminal Baileys tidak aktif saat startup. QR mungkin tidak muncul di terminal.');
                     console.log('      Pastikan perangkat sudah terhubung atau gunakan metode pairing code jika tersedia.');
                } else {
                     console.log('      Jika printQRInTerminal Baileys aktif, QR seharusnya muncul di terminal.');
                }
            } else if (authProcessState.pairingCodeRequested) {
                // Abaikan QR jika kita sedang menunggu pairing code
                console.log('INFO: QR diterima dari server, tetapi diabaikan karena sedang dalam proses pairing code.');
            }
            // Jika tidak expectingQR dan tidak pairingCodeRequested, QR bisa muncul dari Baileys 
            // jika printQRInTerminal di makeWASocket adalah true dan server mengirimkannya. Ini adalah perilaku default Baileys.
        }

        if (connection === 'close') {
            const oldSessionExistsStatus = sessionExists; // Simpan status sesi sebelum direset
            sessionExists = false; // Tandai sesi tidak ada lagi saat koneksi ditutup
            closeAuthReadline(); 
            
            const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : lastDisconnect?.error?.output?.statusCode || 500;
            const reason = DisconnectReason[statusCode] || `Tidak diketahui (${statusCode})`;
            console.log(`Koneksi terputus. Alasan: ${reason}, Kode: ${statusCode}`);

            resetAuthProcessFlags(); 

            const criticalErrorCodes = [
                DisconnectReason.loggedOut,
                DisconnectReason.badSession,
                DisconnectReason.multideviceMismatch,
                DisconnectReason.connectionReplaced
            ];

            if (criticalErrorCodes.includes(statusCode)) {
                console.log(`Alasan diskonek (${reason}) memerlukan sesi baru. Menghapus folder auth...`);
                try {
                    await fs.rm(AUTH_FOLDER_PATH, { recursive: true, force: true });
                    console.log(`Folder ${AUTH_FOLDER_PATH} berhasil dihapus.`);
                } catch (e) {
                    console.error(`Gagal menghapus folder ${AUTH_FOLDER_PATH}. Hapus manual dan restart.`, e);
                    process.exit(1);
                }
                console.log("Merestart bot untuk sesi baru...");
                startBot(); 
            } else if (statusCode === DisconnectReason.restartRequired) {
                console.log("Restart diperlukan oleh Baileys, merestart bot...");
                startBot();
            } else if (oldSessionExistsStatus && (statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.connectionClosed)) {
                console.log("Koneksi terputus saat sesi aktif. Baileys akan mencoba reconnect otomatis.");
            } else if (!oldSessionExistsStatus && (statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.connectionClosed)){
                console.log("Gagal terhubung (timeout/lost/closed) pada percobaan koneksi awal. Periksa jaringan atau coba lagi.");
                // Di sini bisa dipertimbangkan untuk memanggil initiateAuthenticationProcess() lagi setelah delay
                // jika ingin menawarkan opsi auth kembali secara otomatis.
            } else {
                console.log("Koneksi ditutup. Jika masalah persisten, coba restart bot.");
            }
        }
    });

    sock.ev.on('creds.update', async (creds) => {
        if (creds.pairingCode && creds.registered === false && !authProcessState.pairingCodeDisplayed) {
            console.log(`\n========================================`);
            console.log(`   Kode Pairing Anda: ${creds.pairingCode}`);
            console.log(`========================================`);
            console.log("Silakan masukkan kode ini di WhatsApp Anda pada perangkat yang ingin dihubungkan.");
            authProcessState.pairingCodeDisplayed = true;
            closeAuthReadline(); 
        }
        if (creds.registered === true) {
            // Hanya tampilkan pesan "Autentikasi berhasil" jika ini adalah hasil dari proses auth aktif
            if(authProcessState.pairingCodeRequested || authProcessState.expectingQR) {
                 // Dan hanya jika sesi sebelumnya tidak ada (artinya ini benar-benar auth baru)
                 if(sessionExists === false) { 
                    console.log("Autentikasi berhasil dan terdaftar!");
                 }
            }
            resetAuthProcessFlags();
            closeAuthReadline();
            sessionExists = true; // Pastikan status sesi diperbarui
        }
        await saveCreds();
    });

    let commands = new Map();
    try { commands = await loadCommands(); }
    catch (error) { console.error('Gagal memuat command awal:', error); process.exit(1); }

    const setCommands = (newCommands) => { commands = newCommands; };
    if (process.env.NODE_ENV === 'development' || config.enableCommandWatcher) {
        watchCommands(commands, setCommands).then(() => console.log("Command watcher aktif.")).catch(e => console.error("Gagal memulai command watcher:", e));
    } else {
        console.log("Command watcher tidak aktif.");
    }

    sock.ev.on('messages.upsert', async (m) => {
        await handleMessageUpsert(sock, commands, m);
    });

    // Beri Baileys sedikit waktu untuk mencoba koneksi awal dengan sesi yang ada
    await delay(process.env.NODE_ENV === 'test' ? 500 : 3000);

    if (!sock.authState.creds.me?.id) { // Jika belum terautentikasi penuh
        console.log("Belum terautentikasi sepenuhnya. Memulai proses autentikasi...");
        await initiateAuthenticationProcess(sock, state, shouldPrintQRInTerminalByBaileys);
    } else {
        console.log("Bot sudah terautentikasi atau sedang mencoba konek dengan sesi yang ada.");
        closeAuthReadline(); 
        resetAuthProcessFlags();
    }
}

async function initiateAuthenticationProcess(sock, state, willBaileysPrintQR) {
    // Cek apakah sudah ada pairing code dari sesi sebelumnya yang belum terpakai
    if (state.creds.pairingCode && state.creds.registered === false && !authProcessState.pairingCodeDisplayed) {
        console.log("INFO: Menampilkan pairing code yang sudah ada dari sesi sebelumnya.");
        console.log(`\n========================================`);
        console.log(`   Kode Pairing Tersimpan: ${state.creds.pairingCode}`);
        console.log(`========================================`);
        console.log("Gunakan kode pairing di atas. Jika tidak valid, hapus folder 'auth_info_baileys' dan restart.");
        authProcessState.pairingCodeDisplayed = true;
        authProcessState.pairingCodeRequested = true;
        return;
    }

    // Jika auto-auth dikonfigurasi dan ada nomor telepon
    if (config.autoAuth && config.botPhoneNumber) {
        console.log(`Mode Auto-Auth: Mencoba meminta pairing code untuk ${config.botPhoneNumber}...`);
        try {
            authProcessState.pairingCodeRequested = true;
            await sock.requestPairingCode(config.botPhoneNumber);
            // 'creds.update' akan menampilkan kode pairing
        } catch (e) {
            console.error("Gagal meminta pairing code otomatis:", e.message);
            console.log("Auto-auth gagal. Jika bot tidak terhubung, Anda mungkin perlu autentikasi manual atau periksa konfigurasi.");
            authProcessState.pairingCodeRequested = false;
             // Pertimbangkan fallback ke manual di sini jika diinginkan
        }
        return; 
    }

    // Jika tidak ada TTY (misalnya berjalan di server tanpa input interaktif) dan butuh auth manual
    if (!process.stdin.isTTY) {
        console.error("Autentikasi manual diperlukan tetapi tidak ada terminal interaktif (TTY) yang tersedia.");
        console.error("Silakan konfigurasikan auto-auth dengan nomor telepon atau jalankan di lingkungan dengan TTY.");
        if (willBaileysPrintQR) {
            console.error("Jika QR Code diperlukan, Baileys mungkin telah mencoba mencetaknya. Periksa log.");
        }
        process.exit(1);
    }

    // Jika sampai sini, berarti perlu autentikasi manual dan ada TTY
    if (authProcessState.readlineInstance) closeAuthReadline();
    authProcessState.readlineInstance = readline.createInterface({ input: process.stdin, output: process.stdout });
    const askQuestion = (query) => new Promise(resolve => authProcessState.readlineInstance.question(query, resolve));

    console.log("\nPilih metode autentikasi:");
    console.log("1. Pairing Code (Disarankan)");
    console.log("2. QR Code (Jika diaktifkan di Baileys, akan muncul di terminal jika server mengirimkannya)");
    const choice = await askQuestion("Pilihan Anda (1 atau 2): ");

    if (choice === '1') {
        authProcessState.expectingQR = false; // Tidak mengharapkan QR
        authProcessState.pairingCodeRequested = true; // Tandai sebelum memanggil
        const success = await requestPairingCodeViaTerminalInput(sock, authProcessState.readlineInstance);
        if (!success && authProcessState.pairingCodeRequested && !authProcessState.pairingCodeDisplayed) {
            console.log("Permintaan pairing code manual tidak berhasil atau dibatalkan.");
            authProcessState.pairingCodeRequested = false; // Reset jika benar-benar gagal tanpa kode ditampilkan
        }
        // Readline akan ditutup oleh event lain atau jika error di dalam fungsi
    } else if (choice === '2') {
        authProcessState.pairingCodeRequested = false; // Tidak sedang dalam proses pairing
        authProcessState.expectingQR = true;         // Sekarang kita mengharapkan QR
        console.log("Menunggu server mengirim QR code...");
        if (willBaileysPrintQR) {
            console.log("Jika 'printQRInTerminal' Baileys aktif, QR akan muncul di terminal ini jika diterima.");
        } else {
            console.log("Opsi 'printQRInTerminal' Baileys tidak aktif saat startup. QR mungkin tidak akan muncul di terminal ini.");
            console.log("Jika Anda memerlukan QR, pastikan tidak ada sesi aktif atau coba hubungkan perangkat dari WhatsApp di ponsel Anda.");
        }
        // Jika 'printQRInTerminal' di makeWASocket adalah true, Baileys seharusnya sudah menangani pencetakan QR.
        // Tidak ada tindakan lebih lanjut di sini selain menunggu event 'qr'.
    } else {
        console.log("Pilihan tidak valid. Silakan restart bot.");
        closeAuthReadline();
        process.exit(1);
    }
}

startBot().catch(err => {
    console.error("Gagal memulai bot secara keseluruhan:", err);
    closeAuthReadline(); 
    resetAuthProcessFlags();
    process.exit(1);
});

// Handle sinyal keluar untuk membersihkan readline
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => process.on(signal, () => {
    console.log(`\n${signal} diterima. Menutup bot...`);
    closeAuthReadline();
    if (typeof sock !== 'undefined' && sock && typeof sock.end === 'function') {
        // sock.end(new Error(`Proses dihentikan dengan sinyal ${signal}`));
    }
    process.exit(0);
}));