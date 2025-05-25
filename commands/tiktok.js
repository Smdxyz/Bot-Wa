// commands/tiktok.js
const axios = require('axios');
const config = require('../config');
const { getMasterApiKey } = require('../utils/apiKeyManager');
const { sendAnimatedMessage } = require('../utils/animator'); // Impor animator
const { delay } = require('@whiskeysockets/baileys');

module.exports = {
    Callname: 'ttdl',
    Kategori: 'Downloader',
    SubKategori: 'TikTok',
    Deskripsi: 'Mengunduh video atau foto dari TikTok tanpa watermark.',
    Usage: 'ttdl <url_tiktok>',
    ReqEnergy: 5,

    async execute(sock, msg, options) {
        const { args, jid } = options;
        const prefix = config.botPrefix;

        if (args.length === 0) {
            return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}${this.Callname} <url_tiktok>` }, { quoted: msg });
        }

        const url = args[0];
        if (!url.includes('tiktok.com')) {
            return sock.sendMessage(jid, { text: '⚠️ URL tidak valid. Hanya menerima URL dari TikTok.' }, { quoted: msg });
        }

        const apiKey = await getMasterApiKey();
        if (!apiKey) {
            return sock.sendMessage(jid, { text: `Fitur ini memerlukan konfigurasi API Key oleh admin.` }, { quoted: msg });
        }

        const waitFrames = [
            "⏳ Memproses permintaan TikTok Anda...",
            "🔄 Menghubungi server TikTok...",
            "🔗 Mencari link tanpa watermark...",
            "📥 Siap-siap download!"
        ];
        let processingMsg = await sendAnimatedMessage(sock, jid, waitFrames, { text: waitFrames[0] }, msg);
        if (!processingMsg) {
             processingMsg = await sock.sendMessage(jid, { text: config.waitMessage || "⏳ Memproses..." }, { quoted: msg });
        }

        try {
            const apiUrl = `https://szyrineapi.biz.id/download/tiktok?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, {
                headers: { 'X-API-Key': apiKey },
                timeout: 45000
            });

            if (processingMsg && processingMsg.key) {
                await sock.sendMessage(jid, { delete: processingMsg.key });
            }

            const data = response.data;

            if (!data || !data.status || !data.result) {
                const errMsg = data && data.message ? data.message : "Gagal mengambil data dari API TikTok.";
                return sock.sendMessage(jid, { text: `🚫 Error: ${errMsg}` }, { quoted: msg });
            }

            const result = data.result;
            let captionText = `🎵 *Judul:* ${result.title || 'Tidak ada judul'}\n`;
            if (result.author && result.author.nickname) {
                captionText += `👤 *Author:* ${result.author.nickname} (@${result.author.fullname || result.author.id})\n`;
            }
            if (result.taken_at) {
                captionText += `📅 *Tanggal:* ${result.taken_at}\n`;
            }
            if (result.stats) {
                captionText += `\n👀 Views: ${result.stats.views || 0} | ❤️ Likes: ${result.stats.likes || 0} | 💬 Comments: ${result.stats.comment || 0}`;
            }
            captionText += `\n\n${result.watermark || `API by Sann`} - ${config.watermark || ''}`;


            let mediaSent = false;
            if (result.data && result.data.length > 0) {
                const videoHd = result.data.find(m => m.type === 'nowatermark_hd');
                const videoNoWm = result.data.find(m => m.type === 'nowatermark');
                const videoToDownload = videoHd || videoNoWm;

                if (videoToDownload) {
                    await sock.sendMessage(jid, {
                        video: { url: videoToDownload.url },
                        caption: captionText,
                        mimetype: 'video/mp4',
                        contextInfo: result.cover ? {
                            externalAdReply: {
                                title: result.title || "TikTok Video",
                                body: `Video oleh @${result.author?.nickname || 'Unknown'}`,
                                thumbnailUrl: result.cover,
                                mediaType: 2,
                                mediaUrl: url,
                                sourceUrl: url,
                                showAdAttribution: true
                            }
                        } : undefined
                    }, { quoted: msg, mediaUploadTimeoutMs: 60000 * 5 });
                    mediaSent = true;
                } else {
                    const photos = result.data.filter(m => m.type === 'photo');
                    if (photos.length > 0) {
                        await sock.sendMessage(jid, { text: `${captionText}\n\n🖼️ Mengirim ${photos.length} foto...` }, { quoted: msg });
                        for (let i = 0; i < photos.length; i++) {
                            try {
                                await sock.sendMessage(jid, {
                                    image: { url: photos[i].url },
                                    caption: i === 0 ? `Foto ${i + 1}/${photos.length}\n\n${captionText}` : `Foto ${i + 1}/${photos.length}`
                                }, { quoted: msg, mediaUploadTimeoutMs: 60000 * 2 });
                                await delay(1000);
                            } catch (imgErr) {
                                console.error(`[${this.Callname}] Gagal mengirim foto ${photos[i].url}:`, imgErr);
                                await sock.sendMessage(jid, { text: `Gagal mengirim foto #${i+1}`}, {quoted: msg});
                            }
                        }
                        mediaSent = true;
                    }
                }
            }

            if (!mediaSent) {
                await sock.sendMessage(jid, { text: "Tidak ditemukan media video atau foto yang bisa diunduh dari link tersebut." }, { quoted: msg });
            }

        } catch (error) {
            if (processingMsg && processingMsg.key) {
                await sock.sendMessage(jid, { delete: processingMsg.key }).catch(delErr => console.warn("Gagal hapus pesan progres ttdl:", delErr));
            }
            console.error(`[${this.Callname}] Error:`, error.message);
            let userErrorMessage = `Waduh, ada error pas jalanin command ${this.Callname}.`;
            if (error.response && error.response.data && (error.response.data.message || error.response.data.error)) {
                userErrorMessage = `Error dari API: ${error.response.data.message || error.response.data.error}`;
            } else if (error.code === 'ECONNABORTED') {
                userErrorMessage = `Server API kelamaan jawab nih, coba lagi nanti.`;
            }
            await sock.sendMessage(jid, { text: userErrorMessage }, { quoted: msg });
        }
    }
};