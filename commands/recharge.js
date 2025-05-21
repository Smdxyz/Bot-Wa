// commands/recharge.js
const { updateUser, getUser } = require('../userDatabase');
const config = require('../config');

module.exports = {
    NamaFitur: 'Reset Energy Harian',
    Callname: 'recharge',
    Kategori: 'Utility',
    SubKategori: 'Energy',
    ReqEnergy: 0,
    ReqTier: 'Super Kere',
    ReqCoin: 'n', // Tidak membutuhkan coin lagi
    CostCoin: 0, // Tidak ada biaya
    Deskripsi: 'Meriset energy yang didapatkan hari ini.',
    execute: async function (sock, msg, commands, { isActive, tier, multiplier }) {
        const jid = msg.key.remoteJid;
        const user = await getUser(jid);

        if (!user) {
            await sock.sendMessage(jid, { text: 'User tidak ditemukan.' });
            return;
        }

        // Reset energyToday
        await updateUser(jid, { energyToday: 0 });

        await sock.sendMessage(jid, { text: 'Energy harian berhasil direset!' });
    }
};