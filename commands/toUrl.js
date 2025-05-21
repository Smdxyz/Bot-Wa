// commands/toUrl.js
const uploadImage = require('../utils/uploadImage');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    NamaFitur: 'toUrl',
    Callname: 'toUrl',
    Kategori: 'Media',
    SubKategori: 'Konversi',
    ReqEnergy: 2, // Contoh: membutuhkan 2 energi
    ReqTier: null,
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Mengonversi gambar/video menjadi URL (hanya gambar yang diupload ke ImgBB).',
    execute: async function (sock, msg, commands, { mediaType, isActive, tier, multiplier }) {
        const jid = msg.key.remoteJid;
        const messageType = getContentType(msg.message);
        const caption = msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';

        console.log(`[toUrl] Message Type: ${messageType}`);
        console.log(`[toUrl] Caption: ${caption}`);
        console.log(`[toUrl] Premium Data: { isActive: ${isActive}, tier: ${tier}, multiplier: ${multiplier} }`);

        if (messageType === 'imageMessage' || messageType === 'videoMessage') {
            try {
                const buffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                    {
                        logger: sock.logger,
                        reuploadRequest: sock.updateMediaMessage,
                    }
                );
                if (buffer) {
                    try {
                        // Create media folder if it doesn't exist
                        const mediaPath = path.join(__dirname, '../media');
                        await fs.mkdir(mediaPath, { recursive: true });

                        // Generate unique file name
                        const timestamp = Date.now();
                        const fileExtension = messageType === 'imageMessage' ? 'jpg' : 'mp4'; // Sesuaikan ekstensi berdasarkan jenis pesan
                        const fileName = `media_${timestamp}.${fileExtension}`;
                        const filePath = path.join(mediaPath, fileName);

                        // Save media to disk
                        await fs.writeFile(filePath, buffer);

                        let imageUrl = "";
                        if (messageType === "imageMessage") {
                            // Upload image
                            imageUrl = await uploadImage(buffer);
                        } else {
                            imageUrl = filePath; // Untuk video, simpan path lokal
                        }
                        // Delete temporary file after upload
                        if (messageType === "imageMessage") {
                            await fs.unlink(filePath);
                        }

                        if (imageUrl) {
                            const response = caption ? `${imageUrl}\n\n*Caption:*\n${caption}` : imageUrl;
                            await sock.sendMessage(jid, {
                                text: response,
                                contextInfo: {
                                    externalAdReply: {
                                        showAdAttribution: true,
                                    },
                                },
                            });
                        } else {
                            await sock.sendMessage(jid, { text: 'Failed to upload image/video' });
                        }
                    } catch (uploadError) {
                        console.error('[toUrl] Error uploading image/video:', uploadError);
                        await sock.sendMessage(jid, { text: 'Error uploading image/video' });
                    }
                } else {
                    await sock.sendMessage(jid, { text: 'Failed to download image/video' });
                }
            } catch (downloadError) {
                console.error('[toUrl] Error handling media message:', downloadError);
                await sock.sendMessage(jid, { text: 'Error processing image/video.' });
            }
        }
        else {
            await sock.sendMessage(jid, { text: "Please send a video or image with a caption." });
        }
    },
};