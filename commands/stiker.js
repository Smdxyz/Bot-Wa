const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    NamaFitur: 'Image to Sticker with Ownership Info',
    Callname: 'sticker',
    Kategori: 'Sticker',
    SubKategori: 'Image',
    ReqEnergy: 5,
    ReqTier: null,
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Converts an image to a sticker and adds ownership/creator information.',
    
    execute: async function (sock, msg, commands, { isActive, tier, multiplier, mediaType }) {
        const jid = msg.key.remoteJid;
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        console.log(`[${this.Callname}] Premium Data: { isActive: ${isActive}, tier: ${tier}, multiplier: ${multiplier} }`);

        let imageMessage;

        if (quotedMessage?.imageMessage) {
            imageMessage = quotedMessage.imageMessage;
        } else if (msg.message?.imageMessage) {
            imageMessage = msg.message.imageMessage;
        } else {
            return await sock.sendMessage(jid, { text: 'Silakan kirim atau balas pesan dengan gambar.' });
        }

        // Fungsi Download Media dari remini.js
        async function downloadMedia(msg, mediaType) {
            try {
                const stream = await downloadContentFromMessage(msg, mediaType.split('Message')[0]);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer;
            } catch (error) {
                console.error(`[Download] Error downloading media:`, error);
                throw new Error('Gagal mengunduh media.');
            }
        }

        try {
            const buffer = await downloadMedia(imageMessage, 'imageMessage');

            const ownerInfo = `Szyrine By Sann(Susanto)`;

            const stickerData = new Sticker(buffer, {
                pack: 'Created with',
                author: ownerInfo,
                type: StickerTypes.FULL,
                quality: 100
            });

            await sock.sendMessage(jid, { sticker: await stickerData.toBuffer() });

        } catch (error) {
            console.error(`[${this.Callname}] Error : ${error}`);
            await sock.sendMessage(jid, { text: 'Terjadi kesalahan saat memproses gambar menjadi stiker. Coba lagi.' });
        }
    }
};