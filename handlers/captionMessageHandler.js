// handlers/captionMessageHandler.js
const { getUser } = require('../userDatabase');
const config = require('../config'); // <<--- Tambahkan import ini

module.exports = async (sock, msg, commands, { isActive, tier, multiplier }) => {
    let caption = "";

    if (msg.message.imageMessage) {
        caption = msg.message.imageMessage?.caption || "";
    } else if (msg.message.videoMessage) {
        caption = msg.message.videoMessage?.caption || "";
    }

    if (caption.startsWith(config.botPrefix)) {
       // Sudah diproses di index.js
       return;
    }
    // Proses pesan dengan caption biasa (bukan command) di sini (jika diperlukan)
};