const axios = require('axios');
const {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');

module.exports = {
    NamaFitur: 'Instagram Downloader',
    Callname: 'igdl',
    Kategori: 'Media',
    SubKategori: 'Download',
    ReqEnergy: 5,
    ReqTier: null,
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Mengunduh gambar atau video dari Instagram.',

    execute: async function (sock, msg, commands, { isActive, tier, multiplier, mediaType, apiKey }) {
        const jid = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const args = text.split(' ');
        const url = args[1];

        if (!url) {
            return await sock.sendMessage(jid, { text: '❌ Silakan masukkan URL postingan Instagram.' });
        }

        if (!url.includes('instagram.com')) {
            return await sock.sendMessage(jid, { text: '⚠️ URL tidak valid. Hanya menerima URL dari Instagram.' });
        }

        // Kirim pesan awal (⏳ Memproses...)
        let processingMessage = await sock.sendMessage(jid, { text: '⏳ Memproses permintaan Anda...' });

        try {
            const apiUrl = `https://sannpanel.my.id/instagram?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, {
                timeout: 10000,
                headers: { 'x-api-key': ramadhan7 } // Tambahkan header API Key
            });
            const data = response.data;

            if (data.msg) {
                await sock.sendMessage(jid, { text: `❌ ${data.msg}` }, { quoted: msg });
                return;
            }

            // Pisahkan media berdasarkan jenis
            let mediaItems = data.download_links.map((media, index) => ({
                url: media.url,
                type: media.type,
                index: index + 1,
            }));

            const captionText = `📸 *Author:* ${data.author}\n📝 *Caption:* ${data.caption || 'Tidak ada caption'}\n\n🔗 *Sumber:* [Instagram](${url})`;

            // Jika hanya ada satu media, kirim langsung tanpa carousel
            if (mediaItems.length === 1) {
                const media = mediaItems[0];
                if (media.type === 'image') {
                    await sock.sendMessage(jid, {
                        image: { url: media.url },
                        caption: captionText,
                    }, { quoted: msg });
                } else if (media.type === 'video') {
                    await sock.sendMessage(jid, {
                        video: { url: media.url },
                        caption: captionText,
                        mimetype: 'video/mp4',
                    }, { quoted: msg });
                }
            } else {
                // Pisahkan media gambar dan video
                const imageItems = mediaItems.filter(m => m.type === 'image');
                const videoItems = mediaItems.filter(m => m.type === 'video');

                // Jika ada gambar, buat carousel untuk gambar
                if (imageItems.length > 0) {
                    let cards = [];
                    for (let media of imageItems) {
                        try {
                            const mediaMessage = await prepareWAMessageMedia({ image: { url: media.url } }, { upload: sock.waUploadToServer });
                            cards.push({
                                header: { imageMessage: mediaMessage.imageMessage, hasMediaAttachment: true },
                                body: { text: `#${media.index} dari ${mediaItems.length}` },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                            name: "cta_url",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "Lihat di WhatsApp Channel",
                                                url: "https://whatsapp.com/channel/0029VafhW708aKvCHyexCe3y"
                                            }),
                                        },
                                    ],
                                },
                            });
                        } catch (err) {
                            console.warn(`❗ Gagal memuat gambar: ${media.url}`, err);
                        }
                    }

                    if (cards.length > 0) {
                        const msgContent = generateWAMessageFromContent(jid, {
                            interactiveMessage: {
                                body: { text: `📸 Hasil unduhan dari Instagram (gambar)` },
                                carouselMessage: {
                                    cards: cards,
                                    messageVersion: 1,
                                },
                            },
                        }, {});

                        await sock.relayMessage(jid, msgContent.message, { messageId: msgContent.key.id });
                    }
                }

                // Kirim video secara terpisah (jika ada)
                for (let media of videoItems) {
                    try {
                        await sock.sendMessage(jid, {
                            video: { url: media.url },
                            caption: captionText,
                            mimetype: 'video/mp4',
                        }, { quoted: msg });
                    } catch (err) {
                        console.warn(`❗ Gagal mengirim video: ${media.url}`, err);
                    }
                }
            }

        } catch (error) {
            console.error(`[${this.Callname}] Error:`, error.message || error);
            await sock.sendMessage(jid, { text: '❌ Terjadi kesalahan saat memproses permintaan ini.' }, { quoted: msg });
        } finally {
            await sock.sendPresenceUpdate('paused', jid);
        }
    }
};