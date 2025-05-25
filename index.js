// index.js
// Bagian import modern (seperti yang Anda minta)
const os = require('os');
const process = require('process');
const fs = require('node:fs/promises');
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    Browsers,
    DEFAULT_CONNECTION_CONFIG // Dipertahankan untuk kelengkapan
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom'); // Dipertahankan untuk error handling yang lebih baik
const pino = require('pino');
const readline = require('readline'); // Import readline seperti di kode lama

// --- KONFIGURASI & VARIABEL GLOBAL DARI KODE LAMA ANDA ---
const AUTH_FOLDER = 'auth_info_baileys'; // Sesuaikan jika nama folder di kode lama berbeda
global.WA_VERSION = null;
global.BAILEY_VERSION = null;

// readline dibuat di scope atas seperti di kode lama Anda
let rl = null; // Menggunakan 'rl' atau nama variabel yang Anda gunakan di kode lama

// Fungsi helper untuk menutup readline (jika ada di kode lama, atau ini praktik yang baik)
const closeRl = () => {
    if (rl) {
        rl.close();
        rl = null;
    }
};
// --- AKHIR BAGIAN GLOBAL KODE LAMA ---

// Ini dari struktur baru Anda, akan dipertahankan di luar logika auth
const config = require('./config');
const { handleMessageUpsert } = require('./handlers/messageHandler');
const loadCommands = require('./utils/loadCommands');
const watchCommands = require('./utils/watchCommands');
// const { createUser, getUser, updateUser, getAllUsers, addExp } = require('./userDatabase'); // Jika ada di kode lama
// const { useCommand } = require('./commandManager'); // Jika ada di kode lama
// const { getActivePremium } = require('./premiumManager'); // Jika ada di kode lama
// const captionMessageHandler = require('./handlers/captionMessageHandler'); // Jika ada di kode lama
// const { readDatabase, writeDatabase } = require('./utils/utils'); // Jika ada di kode lama


async function startBot() {
    // Pastikan folder auth ada (logika dari kode lama mungkin tidak seketat ini, tapi ini aman)
    try {
        await fs.mkdir(AUTH_FOLDER, { recursive: true });
    } catch (e) {
        // Kode lama mungkin tidak punya ini, tapi ini mencegah error jika folder tidak bisa dibuat
        console.error(`Tidak dapat membuat direktori ${AUTH_FOLDER}:`, e);
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion(); // 'version' seperti di kode lama
    console.log(`Versi WA yang dipake: v${version.join('.')}, udah paling baru nih: ${isLatest}`); // Log dari kode lama
    // const baileysVersion = version; // Ini ada di kode lama Anda, tapi 'version' sudah cukup

    global.WA_VERSION = version.join('.');
    global.BAILEY_VERSION = require('@whiskeysockets/baileys/package.json').version;

    console.log(`Versi WhatsApp: ${global.WA_VERSION}`); // Log dari kode lama
    console.log(`Versi Baileys: ${global.BAILEY_VERSION}`); // Log dari kode lama

    const sock = makeWASocket({
        ...DEFAULT_CONNECTION_CONFIG, // Dipertahankan
        version, // 'version' dari kode lama
        logger: pino({ level: 'silent' }), // 'silent' seperti di kode lama
        printQRInTerminal: true, // INTI DARI KODE LAMA
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        // msgRetryCounterCache: new Map(), // Ini dari Baileys baru, kode lama mungkin tidak ada
        // generateHighQualityLinkPreview: true, // Ini dari Baileys baru
        // browser: Browsers.appropriate(config.botName || 'MyWhatsAppBot'), // Ini dari Baileys baru
    });

    // Fungsi buat ngambil username (ANDA MINTA INI BOLEH DARI KODE BARU JIKA BEDA)
    // Jika Anda ingin persis seperti kode lama, ganti ini dengan implementasi getWaUsername dari kode lama Anda.
    // Saya akan gunakan versi yang lebih robust dari diskusi kita sebelumnya, yang mirip dengan kode baru.
    const getWaUsername = async (msg, jid) => {
        try {
            let waUsername = sock.pushName || (msg && msg.pushName) || '';
            if (!waUsername || waUsername.trim() === "") {
                const contact = sock.contacts && sock.contacts[jid]; // Baileys baru mungkin punya ini
                if (contact) {
                     waUsername = contact.notify || contact.name || jid.split('@')[0];
                } else {
                    waUsername = jid.split('@')[0]; // Fallback jika tidak ada info kontak
                }
            }
            return waUsername || jid.split('@')[0];
        } catch (error) {
            console.error("Gagal dapet username:", error); // Log dari kode lama
            return jid.split('@')[0]; // Fallback
        }
    };
    sock.getWaUsername = getWaUsername; // Tempelkan ke instance sock

    // const updateExistingUsernames = async () => { ... }; // Jika ada di kode lama, masukkan di sini

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update; // 'qr' dari kode lama

        if (connection === 'open') {
            console.log('Wih, udah konek nih!'); // Log dari kode lama
            await delay(2000); // Delay dari kode lama

            const botJid = sock.authState.creds.me.id;
            // const msg = { pushName: sock.pushName }; // Ini ada di kode lama Anda
            const botUsername = await sock.getWaUsername(null, botJid); // Menggunakan getWaUsername yang sudah ada

            if (botUsername && botUsername !== botJid.split('@')[0]) { // Sedikit penyesuaian untuk cek username valid
                console.log(`Username bot udah dapet: ${botUsername}`); // Log dari kode lama
            } else {
                console.warn("Waduh, username bot gagal dimuat."); // Log dari kode lama
            }
            // await updateExistingUsernames(); // Jika ada di kode lama
            closeRl(); // Tutup readline jika terbuka
        }

        if (qr && !sock.authState.creds.me?.id) { // Cek agar tidak muncul jika sudah login
            console.log('Scan QR code ini buat login ya!'); // Log dari kode lama
        }

        if (connection === 'close') {
            closeRl(); // Tutup readline jika terbuka
            const statusCode = lastDisconnect?.error?.output?.statusCode; // Ambil status code seperti di kode lama
            const reason = DisconnectReason[statusCode] || "Gak tau kenapa"; // Log dari kode lama
            console.log(`Koneksi putus nih. Alesannya: ${reason}, Kodenya: ${statusCode}`); // Log dari kode lama

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("Reconnect..."); // Log dari kode lama
                startBot(); // Panggil fungsi buat nyalain bot lagi (dari kode lama)
            } else {
                console.log(`Udah logout. Hapus folder ${AUTH_FOLDER} terus restart ya!`); // Log dari kode lama
            }
        }
    });

    sock.ev.on('creds.update', saveCreds); // Ini standar Baileys, kode lama Anda juga pasti punya ini atau sejenisnya

    // --- BAGIAN COMMANDS DAN MESSAGE HANDLER (DARI STRUKTUR BARU ANDA, SESUAI PERMINTAAN) ---
    let commands = new Map();
    try { commands = await loadCommands(); }
    catch (error) { console.error('Gagal memuat command awal:', error); process.exit(1); }

    function setCommands(newCommands) { commands = newCommands; } // Dari kode lama Anda

    // const watcher = await watchCommands(commands, setCommands); // Ini dari kode baru, jika kode lama tidak ada, hapus
    // Jika kode lama Anda punya cara lain untuk watch, gunakan itu. Jika tidak, bisa pakai ini atau hapus.
    if (process.env.NODE_ENV === 'development' || config.enableCommandWatcher) { // Ini dari kode baru
        watchCommands(commands, setCommands).then(() => console.log("Command watcher aktif.")).catch(e => console.error("Gagal memulai command watcher:", e));
    } else {
        console.log("Command watcher tidak aktif.");
    }


    sock.ev.on('messages.upsert', async (m) => {
        await handleMessageUpsert(sock, commands, m); // Panggil fungsi yang udah diimport (dari kode baru)
    });
    // --- AKHIR BAGIAN COMMANDS ---


    // --- LOGIKA AUTENTIKASI INTI DARI KODE LAMA ANDA ---
    const authDir = `./${AUTH_FOLDER}`; // Variabel dari kode lama
    // Tunggu bentar biar koneksi stabil (dari kode lama)
    await delay(15000); // Atau lebih, sesuaikan sama koneksi lo (dari kode lama)

    // Cek koneksi udah oke apa belom (dari kode lama)
    // Di Baileys v6+, sock.ws.socket tidak langsung tersedia.
    // Kode lama Anda mungkin menggunakan cara lain atau versi Baileys yang berbeda.
    // Untuk sekarang, kita akan skip pengecekan readyState ini jika menyebabkan error,
    // dan langsung ke pengecekan folder auth.
    /*
    if (sock.ws.socket.readyState !== 1) { // INI MUNGKIN ERROR DI BAILEYS MODERN
        console.log("Koneksi belom siap. Nunggu dulu..."); // Log dari kode lama
        await delay(5000); // Tunggu lagi (dari kode lama)
        if (sock.ws.socket.readyState !== 1) { // INI MUNGKIN ERROR
            console.error("Koneksi gagal mulu nih. Cek internet lo ya!"); // Log dari kode lama
            return; // Berhenti aja deh (dari kode lama)
        }
    }
    */

    let filesInAuthDir = [];
    try {
        filesInAuthDir = await fs.readdir(authDir);
    } catch (e) {
        if (e.code !== 'ENOENT') { // Jika error bukan karena folder tidak ada
            console.error('Error pas ngecek folder auth:', e); // Log dari kode lama
        }
        // Jika ENOENT, filesInAuthDir akan tetap kosong, logika di bawah akan jalan
    }

    // Cek folder kosong ATAU creds.me belom ada (LOGIKA KUNCI DARI KODE LAMA)
    if (filesInAuthDir.length === 0 || !sock.authState.creds.me?.id) {
        console.log('Data auth gak ketemu atau creds belom lengkap. Minta pairing code nih...'); // Log dari kode lama

        // Fungsi buat minta nomer HP (dari kode lama)
        const askForPhoneNumber = () => {
            return new Promise((resolve) => {
                // Inisialisasi readline jika belum, seperti di kode lama Anda
                if (!rl) {
                    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                }
                rl.question('Masukin nomer HP lo (contoh: 6281234567890): ', (phoneNumber) => { // Log dari kode lama
                    resolve(phoneNumber.trim()); // Ditambah trim untuk kebersihan
                });
            });
        };

        const phoneNumber = await askForPhoneNumber();
        if (phoneNumber) {
            console.log(`Nomer HP yang dimasukin: ${phoneNumber}`); // Log dari kode lama

            // Fungsi pairingCode (DARI KODE LAMA ANDA, DITULIS ULANG SEAKURAT MUNGKIN)
            const pairingCode = async (jid) => {
                // Di kode lama Anda: if (!sock.authState.creds.me)
                // Di Baileys modern, lebih aman cek !sock.authState.creds.me?.id
                if (!sock.authState.creds.me?.id) {
                    try {
                        // INI ADALAH ASUMSI UTAMA DARI KODE LAMA ANDA:
                        // BAHWA `requestPairingCode` LANGSUNG MENGEMBALIKAN KODE.
                        // INI TIDAK AKAN BEKERJA DENGAN BAILEYS MODERN STANDAR.
                        console.log(`Meminta pairing code untuk ${jid}... (logika kode lama)`);
                        const code = await sock.requestPairingCode(jid); // ASUMSI KODE LAMA
                        
                        // JIKA `code` DI ATAS `undefined` (KARENA BAILEYS MODERN), PESAN INI AKAN ANEH.
                        console.log(` kode pairingnya: ${code}`); // LOG DARI KODE LAMA ANDA
                        
                        // Jika kode lama Anda tidak punya ini, hapus.
                        // Ini hanya tambahan untuk kejelasan jika kode benar-benar muncul.
                        if (code) {
                             console.log("   Silakan masukkan kode ini di WhatsApp Anda.");
                        } else {
                             console.log("   Tidak ada kode pairing yang diterima langsung (mungkin perlu cek 'creds.update' jika menggunakan Baileys modern).");
                        }
                        closeRl(); // Tutup readline setelah selesai
                    } catch (error) {
                        console.error('Gagal dapet pairing code:', error.message); // Log dari kode lama
                        closeRl(); // Tutup readline jika error
                    }
                } else {
                    console.log('Udah ke-auth nih. Skip pairing code ya!'); // Log dari kode lama
                    closeRl();
                }
            };
            await pairingCode(phoneNumber);
        } else {
            console.log('Nomer HP gak dimasukin. Gak bisa ke-auth deh.'); // Log dari kode lama
            closeRl();
        }
    } else {
        console.log("Data auth udah ada. Skip pairing code!"); // Log dari kode lama
        closeRl(); // Pastikan readline ditutup jika tidak dipakai
    }
    // --- AKHIR LOGIKA AUTENTIKASI KODE LAMA ---
}

startBot().catch(err => {
    console.error("Gagal memulai bot secara keseluruhan:", err); // Log dari kode lama (mungkin sedikit beda)
    closeRl(); // Pastikan readline ditutup
    process.exit(1); // Kode lama mungkin tidak exit, tapi ini lebih aman
});

// Penanganan sinyal keluar (dari struktur baru Anda, ini bagus)
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => process.on(signal, () => {
    console.log(`\n${signal} diterima. Menutup bot...`);
    closeRl();
    process.exit(0);
}));

// Komentar dari kode lama Anda:
// Perhatiin bagian readline.close() di atas, gue kasih komen tambahan.
// Soal readline, ada baiknya instance `readline` dibuat hanya saat mau `askForPhoneNumber` dan di-close setelahnya.
// Tapi untuk perubahan minimal, gue comment aja dulu.
// --> Saya sudah mencoba mengikuti ini dengan membuat `rl` saat dibutuhkan dan menutupnya via `closeRl()`.
