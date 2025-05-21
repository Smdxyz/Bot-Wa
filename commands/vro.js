const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const tempStorage = new Map(); // Penyimpanan sementara

module.exports = {
    NamaFitur: 'Bypass View Once',
    Callname: 'vro',
    Kategori: 'Media',
    SubKategori: 'Bypass',
    ReqEnergy: 0,
    ReqTier: null,
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Menyimpan & mengembalikan pesan sekali lihat.',

    execute: async function (sock, msg) {
        const jid = msg.key.remoteJid;
        const isQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const forwardedFrom = msg.message?.contextInfo?.forwardingScore; // Cek apakah pesan diteruskan

        // **1️⃣ Jika pesan sekali lihat diteruskan ke bot (dari chat pribadi atau grup)**
        if (isQuoted) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const mediaType = Object.keys(quotedMsg)[0];

            if (mediaType === 'viewOnceMessage') {
                const viewOnce = quotedMsg.viewOnceMessage.message;
                await handleViewOnceMessage(sock, jid, viewOnce, msg);
                return;
            }
        }

        // **2️⃣ Jika pesan diteruskan tanpa balasan, coba cek di storage**
        if (forwardedFrom) {
            await resendStoredMedia(sock, jid, msg);
            return;
        }

        // **3️⃣ Jika pesan baru adalah pesan sekali lihat, simpan & kirim ulang**
        const messageType = Object.keys(msg.message || {})[0];
        if (messageType === 'viewOnceMessage') {
            const viewOnce = msg.message.viewOnceMessage.message;
            await handleViewOnceMessage(sock, jid, viewOnce, msg);
        }
    }
};

// **🔥 Fungsi untuk menangani pesan sekali lihat & menyimpannya**
async function handleViewOnceMessage(sock, jid, viewOnce, msg) {
    const mediaType = Object.keys(viewOnce)[0];
    const media = viewOnce[mediaType];

    console.log(`📥 Mendeteksi pesan sekali lihat dari: ${jid}`);

    try {
        const stream = await downloadContentFromMessage(media, mediaType.includes('image') ? 'image' : 'video');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const fileType = mediaType.includes('image') ? 'jpg' : 'mp4';
        const fileName = `viewonce_${Date.now()}.${fileType}`;
        const filePath = `./temp/${fileName}`;

        // **Pastikan folder temp ada**
        if (!fs.existsSync('./temp')) {
            fs.mkdirSync('./temp');
        }

        // **Simpan file ke storage sementara**
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Pesan sekali lihat disimpan: ${filePath}`);

        // **Tambahkan ke tempStorage biar bisa diakses ulang**
        tempStorage.set(jid, filePath);

        // **Hapus file setelah 1 menit**
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ File ${fileName} dihapus (auto-cleanup).`);
                tempStorage.delete(jid);
            }
        }, 60000);

        // **Kirim ulang ke user**
        const caption = `🔓 *Pesan Sekali Lihat telah disimpan!*\n📂 *Nama File:* ${fileName}`;
        const sendOptions = { caption, quoted: msg };

        if (mediaType.includes('image')) {
            await sock.sendMessage(jid, { image: buffer, ...sendOptions });
        } else {
            await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', ...sendOptions });
        }

    } catch (err) {
        console.error(`❌ Gagal menyimpan pesan sekali lihat:`, err);
    }
}

// **🔥 Fungsi untuk mengirim ulang media yang sudah disimpan**
async function resendStoredMedia(sock, jid, msg) {
    if (!tempStorage.has(jid)) {
        await sock.sendMessage(jid, { text: "⚠️ Tidak ada media yang tersimpan untuk dikirim ulang." }, { quoted: msg });
        return;
    }

    const filePath = tempStorage.get(jid);
    if (!fs.existsSync(filePath)) {
        await sock.sendMessage(jid, { text: "❌ File sudah dihapus dari penyimpanan sementara." }, { quoted: msg });
        tempStorage.delete(jid);
        return;
    }

    const fileType = filePath.endsWith('.jpg') ? 'image' : 'video';
    const caption = `📂 *Media dari pesan sekali lihat sebelumnya.*`;

    if (fileType === 'image') {
        await sock.sendMessage(jid, { image: fs.readFileSync(filePath), caption }, { quoted: msg });
    } else {
        await sock.sendMessage(jid, { video: fs.readFileSync(filePath), caption, mimetype: 'video/mp4' }, { quoted: msg });
    }

    console.log(`🔁 Media dari View Once dikirim ulang ke: ${jid}`);
}