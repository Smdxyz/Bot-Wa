// index.js
const os = require('os');
const process = require('process');
const fs = require('node:fs/promises'); // Import fs/promises
const readline = require('readline').createInterface({ // Import readline
    input: process.stdin,
    output: process.stdout,
});
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
    makeInMemoryStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { createUser, getUser, updateUser, getAllUsers, addExp } = require('./userDatabase');
const { useCommand } = require('./commandManager');
const { getActivePremium } = require('./premiumManager');
const config = require('./config');
const { handleMessageUpsert } = require('./handlers/messageHandler'); // Import handleMessageUpsert from messageHandler
const captionMessageHandler = require('./handlers/captionMessageHandler');
const loadCommands = require('./utils/loadCommands');
const watchCommands = require('./utils/watchCommands');
const { readDatabase, writeDatabase } = require('./utils/utils')

const AUTH_FOLDER = 'auth_info_baileys';

// Global variable buat nyimpen versi WhatsApp dan Baileys
global.WA_VERSION = null;
global.BAILEY_VERSION = null;

const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Versi WA yang dipake: v${version.join('.')}, udah paling baru nih: ${isLatest}`);
    const baileysVersion = version;

    // Set global variables
    global.WA_VERSION = version.join('.');
    global.BAILEY_VERSION = require('@whiskeysockets/baileys/package.json').version;

    console.log(`Versi WhatsApp: ${global.WA_VERSION}`);
    console.log(`Versi Baileys: ${global.BAILEY_VERSION}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        msgRetryCounterCache: new Map(),
        generateHighQualityLinkPreview: true,
    });

    // Fungsi buat ngambil username
    const getWaUsername = async (msg, jid) => {
        try {
            let waUsername = sock.pushName;

            if (!waUsername || waUsername.trim() === "") {
                waUsername = msg.pushName;

                if (!waUsername || waUsername.trim() === "") {
                    waUsername = jid; // fallback
                }
            }

            return waUsername;
        } catch (error) {
            console.error("Gagal dapet username:", error);
            return jid;
        }
    };

    // Tempelin fungsi ke socket instance.
    sock.getWaUsername = getWaUsername;


    const updateExistingUsernames = async () => {
        const allUsers = await getAllUsers();
        for (const jid in allUsers) {
            try {
                const msg = { pushName: sock.pushName };
                const waUsername = await getWaUsername(msg, jid);
                if (waUsername && allUsers[jid].username !== waUsername) {
                    await updateUser(jid, { username: waUsername });
                    console.log(`[Startup] Username user ${jid} diupdate jadi: ${waUsername}`);
                }
            } catch (error) {
                console.error(`[Startup] Gagal update username buat ${jid}:`, error);
            }
        }
        console.log("[Startup] Update username user kelar!");
    };

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'open') {
            console.log('Wih, udah konek nih!');
            await delay(2000);

            const botJid = sock.authState.creds.me.id;
            const msg = { pushName: sock.pushName };
            const botUsername = await getWaUsername(msg, botJid);

            if (botUsername) {
                console.log(`Username bot udah dapet: ${botUsername}`);
            } else {
                console.warn("Waduh, username bot gagal dimuat.");
            }

            await updateExistingUsernames();
        }

        if (qr) {
            console.log('Scan QR code ini buat login ya!');
        }

        if (connection === 'close') {
            // Catet kenapa disconnect
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = DisconnectReason[statusCode] || "Gak tau kenapa";
            console.log(`Koneksi putus nih. Alesannya: ${reason}, Kodenya: ${statusCode}`);

            // Coba reconnect lagi
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("Reconnect...");
                startBot(); // Panggil fungsi buat nyalain bot lagi
            } else {
                console.log('Udah logout. Hapus folder ' + AUTH_FOLDER + ' terus restart ya!');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    let commands = new Map();
    try {
        commands = await loadCommands();
    } catch (error) {
        console.error('Gagal load command awal:', error);
        process.exit(1);
    }

    function setCommands(newCommands) {
        commands = newCommands;
    }

    const watcher = await watchCommands(commands, setCommands);

    sock.ev.on('messages.upsert', async (m) => {
        await handleMessageUpsert(sock, commands, m); // Panggil fungsi yang udah diimport
    });

    // Kalo folder auth kosong, minta pairing code
    const authDir = `./${AUTH_FOLDER}`;
    try {
        // Tunggu bentar biar koneksi stabil
        await delay(15000); // Atau lebih, sesuaikan sama koneksi lo

        // Cek koneksi udah oke apa belom
        if (sock.ws.socket.readyState !== 1) {
            console.log("Koneksi belom siap. Nunggu dulu...");
            await delay(5000); // Tunggu lagi
            if (sock.ws.socket.readyState !== 1) {
                console.error("Koneksi gagal mulu nih. Cek internet lo ya!");
                return; // Berhenti aja deh
            }
        }

        const files = await fs.readdir(authDir);
        // Cek folder kosong ATAU creds.me belom ada
        if (files.length === 0 || !sock.authState.creds.me?.id) {
            console.log('Data auth gak ketemu atau creds belom lengkap. Minta pairing code nih...');

            // Fungsi buat minta nomer HP
            const askForPhoneNumber = () => {
                return new Promise((resolve) => {
                    readline.question('Masukin nomer HP lo (contoh: 6281234567890): ', (phoneNumber) => {
                        resolve(phoneNumber);
                    });
                });
            };

            const phoneNumber = await askForPhoneNumber();
            if (phoneNumber) {
                console.log(`Nomer HP yang dimasukin: ${phoneNumber}`);

                const pairingCode = async (jid) => {
                    if (!sock.authState.creds.me) {
                        try {
                            const code = await sock.requestPairingCode(jid)
                            console.log(` kode pairingnya: ${code}`)
                        } catch (error) {
                            console.error('Gagal dapet pairing code:', error);
                        }
                    } else {
                        console.log('Udah ke-auth nih. Skip pairing code ya!');
                    }
                }

                await pairingCode(phoneNumber);
            } else {
                console.log('Nomer HP gak dimasukin. Gak bisa ke-auth deh.');
            }
        } else {
            console.log("Data auth udah ada. Skip pairing code!");
        }
    } catch (err) {
        console.error('Error pas ngecek folder auth:', err);
    } finally {
        // readline.close(); // Pastiin readline ditutup abis itu // Gue comment ini karena ada potensi readline udah diclose di tempat lain atau belum dibuka sama sekali kalau auth ada.
        // Lebih aman nge-close readline cuma pas bener-bener selesai dipake.
        // Tapi karena di sini logicnya bisa skip readline, mungkin lebih baik nge-close-nya di dalam blok if phoneNumber aja.
        // Atau, idealnya, instance readline dibuat pas dibutuhin aja.
        // Untuk sekarang, gue comment dulu biar gak error kalau readline gak pernah dibuka.
    }

};

startBot();
// Perhatiin bagian readline.close() di atas, gue kasih komen tambahan.
// Soal readline, ada baiknya instance `readline` dibuat hanya saat mau `askForPhoneNumber` dan di-close setelahnya.
// Tapi untuk perubahan minimal, gue comment aja dulu.