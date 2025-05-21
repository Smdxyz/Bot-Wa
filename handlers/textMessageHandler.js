// handlers/textMessageHandler.js
const { format } = require('util');
const { getUser } = require('../userDatabase');
const config = require('../config'); // <<--- Tambahkan import ini

module.exports = async (sock, msg, commands, { isActive, tier, multiplier }) => {
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const user = await getUser(jid);

    //if (text.startsWith(config.botPrefix)) { // Hapus baris ini
    //    // Sudah diproses di index.js
    //    return;
    //}
    // Proses pesan teks biasa (bukan command) di sini (jika diperlukan)
};