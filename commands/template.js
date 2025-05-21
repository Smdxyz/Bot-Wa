// commands/namaCommand.js
module.exports = {
    NamaFitur: 'Nama Fitur Command',
    Callname: 'namaCommand', // Nama yang digunakan untuk memanggil command
    Kategori: 'Kategori Command',
    SubKategori: 'Sub Kategori Command',
    ReqEnergy: 1, // Jumlah energi yang dibutuhkan untuk menggunakan command
    ReqTier: 'Super Kere', // Tier premium yang dibutuhkan (atau null jika tidak ada)
    ReqCoin: 'n', // Apakah command membutuhkan coin? (y/n)
    CostCoin: 0, // Jumlah coin yang dibutuhkan (jika ReqCoin = 'y')
    Deskripsi: 'Deskripsi lengkap tentang command ini.',
    execute: async function (sock, msg, commands, { isActive, tier, multiplier, mediaType }) {
        const jid = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

        console.log(`[${this.Callname}] Premium Data: { isActive: ${isActive}, tier: ${tier}, multiplier: ${multiplier} }`);

        try {
            // Tambahkan logika command di sini
            await sock.sendMessage(jid, {
                text: 'Ini adalah command baru!',
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                    },
                },
            });
        } catch (error) {
            console.error(`[${this.Callname}] Error : ${error}`)
            await sock.sendMessage(jid, { text: 'Error when processing this command' });
        }
    }
}