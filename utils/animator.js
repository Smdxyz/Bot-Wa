// utils/animator.js
const { delay } = require('@whiskeysockets/baileys');
const config = require('../config'); // Untuk default delay

/**
 * Mengirim pesan dengan animasi edit.
 * @param {object} sock Instance Baileys socket.
 * @param {string} jid JID tujuan.
 * @param {Array<string>} frames Array string yang berisi setiap frame animasi.
 * @param {object} initialMessageOptions Opsi untuk pesan pertama (bisa berisi image, caption, text, contextInfo).
 * @param {object} quoteMsg Objek pesan yang akan di-quote.
 * @param {number} [animationDelay] Delay antar frame (override config).
 * @returns {Promise<object|null>} Objek pesan pertama yang terkirim atau null jika gagal.
 */
async function sendAnimatedMessage(sock, jid, frames, initialMessageOptions = {}, quoteMsg, animationDelay) {
    if (!frames || frames.length === 0) {
        console.warn("[Animator] Tidak ada frame untuk dianimasikan.");
        // Kirim pesan error atau default jika perlu
        // await sock.sendMessage(jid, { text: "Konten animasi tidak tersedia." }, { quoted: quoteMsg });
        return null;
    }

    const animDelay = animationDelay || config.menuAnimationDelay || 700; // Ambil dari config atau default
    let messagePayload = { ...initialMessageOptions }; // Salin opsi awal

    // Jika initialMessageOptions tidak punya text atau caption, dan ada frame, gunakan frame pertama
    // Ini penting agar pesan pertama memiliki konten teks jika hanya media yang diset di initialMessageOptions
    if (!messagePayload.text && !messagePayload.caption && frames.length > 0) {
        if (messagePayload.image || messagePayload.video || messagePayload.document) {
            messagePayload.caption = frames[0];
        } else {
            messagePayload.text = frames[0];
        }
    } else if (frames.length > 0 && (messagePayload.image || messagePayload.video || messagePayload.document) && !messagePayload.caption) {
        // Jika ada media tapi tidak ada caption, dan ada frame, frame pertama jadi caption
        messagePayload.caption = frames[0];
    } else if (frames.length > 0 && !messagePayload.text && !messagePayload.caption) {
        // Jika tidak ada media, text, atau caption di opsi awal, gunakan frame pertama sebagai teks
        messagePayload.text = frames[0];
    }


    let sentMsg;
    try {
        sentMsg = await sock.sendMessage(jid, messagePayload, { quoted: quoteMsg });
    } catch (sendError) {
        console.error("[Animator] Gagal mengirim pesan awal animasi:", sendError);
        return null; // Gagal mengirim pesan awal
    }

    let messageKeyForEdit = (sentMsg && sentMsg.key && sentMsg.key.id) ? sentMsg.key : null;

    if (!messageKeyForEdit && frames.length > 1) {
        console.warn("[Animator] Gagal mendapatkan key dari pesan pertama, animasi edit dibatalkan.");
        return sentMsg; // Kembalikan pesan pertama yang (mungkin) terkirim
    }

    if (messageKeyForEdit && frames.length > 1) { // Hanya lakukan loop edit jika ada key dan lebih dari 1 frame
        for (let i = 1; i < frames.length; i++) { // Mulai dari frame kedua (indeks 1)
            await delay(animDelay);
            try {
                let editOptions = {
                    text: frames[i], // Konten teks/caption baru
                    edit: messageKeyForEdit,
                };

                // Coba pertahankan mentions dari pesan awal jika ada dan frame baru mengandung '@'
                if (messagePayload.contextInfo && messagePayload.contextInfo.mentionedJid && frames[i].includes('@')) {
                    editOptions.contextInfo = { mentionedJid: messagePayload.contextInfo.mentionedJid };
                }

                await sock.sendMessage(jid, editOptions);
            } catch (editError) {
                console.warn(`[Animator] Gagal mengedit pesan ke frame ${i}:`, editError.message);
                // Pertimbangkan untuk tidak menghentikan animasi sepenuhnya jika satu frame gagal,
                // kecuali jika errornya fatal (misal, pesan dihapus oleh user).
                // Untuk sekarang, kita hentikan jika ada error edit.
                break;
            }
        }
    }
    return sentMsg; // Kembalikan objek pesan pertama yang terkirim
}

module.exports = { sendAnimatedMessage };