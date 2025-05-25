// commands/ytmp3.js
const axios = require('axios');
const config = require('../config');
const { getMasterApiKey } = require('../utils/apiKeyManager');
const { sendAnimatedMessage } = require('../utils/animator'); // Impor animator

module.exports = {
    Callname: 'ytmp3',
    Kategori: 'Downloader',
    SubKategori: 'YouTube',
    Deskripsi: 'Download audio dari YouTube dalam format MP3.',
    Usage: 'ytmp3 <url_youtube>',
    ReqEnergy: 3,

    async execute(sock, msg, options) {
        const { args, jid } = options;
        const prefix = config.botPrefix;

        if (args.length === 0) {
            return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}${this.Callname} <url_youtube>` }, { quoted: msg });
        }

        const url = args[0];
        if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
            return sock.sendMessage(jid, { text: '⚠️ URL YouTube tidak valid.' }, { quoted: msg });
        }

        const apiKey = await getMasterApiKey();
        if (!apiKey) {
            return sock.sendMessage(jid, { text: `Fitur ini memerlukan konfigurasi API Key oleh admin.` }, { quoted: msg });
        }

        const waitFrames = [
            "🎧 Mencari lagu YouTube Anda...",
            "🔄 Mengkonversi ke format MP3...",
            "🎶 Menyiapkan file audio...",
            "✅ Hampir selesai, audio segera dikirim!"
        ];
        let processingMsg = await sendAnimatedMessage(sock, jid, waitFrames, { text: waitFrames[0] }, msg);
        if (!processingMsg) {
             processingMsg = await sock.sendMessage(jid, { text: config.waitMessage || "⏳ Memproses..." }, { quoted: msg });
        }

        try {
            const apiUrl = `https://szyrineapi.biz.id/download/ytmp3-v4?url=${encodeURIComponent(url)}&format=mp3`;
            const response = await axios.get(apiUrl, {
                headers: { 'X-API-Key': apiKey },
                timeout: 60000 * 2 // Timeout 2 menit, konversi bisa lama
            });

            if (processingMsg && processingMsg.key) {
                await sock.sendMessage(jid, { delete: processingMsg.key });
            }

            const data = response.data;

            if (!data || !data.status || !data.result) {
                const errMsg = data && data.message ? data.message : "Gagal mengambil data dari API YouTube MP3.";
                return sock.sendMessage(jid, { text: `🚫 Error: ${errMsg}` }, { quoted: msg });
            }

            const result = data.result;

            if (result.type !== 'audio' || result.format !== 'mp3' || !result.download) {
                return sock.sendMessage(jid, { text: "🚫 Gagal mendapatkan link download MP3 dari API." }, { quoted: msg });
            }

            let caption = `🎧 *${result.title || 'Audio YouTube'}*\n\n`;
            caption += `Format: MP3\n`;
            caption += `Kualitas: ${result.quality || 'Standar'} kbps\n`;
            caption += `Durasi: ${result.duration ? formatDuration(result.duration) : 'Tidak diketahui'}\n\n`;
            caption += `Mengirim audio, mohon tunggu...\n${config.watermark || ''}`;

            await sock.sendMessage(jid, { text: caption }, { quoted: msg });

            await sock.sendMessage(jid, {
                audio: { url: result.download },
                mimetype: 'audio/mpeg',
                fileName: `${(result.title || 'youtube_audio').replace(/[<>:"/\\|?*]+/g, '')}.mp3`, // Sanitasi nama file
                ptt: false
            }, { quoted: msg, mediaUploadTimeoutMs: 60000 * 5 });

        } catch (error) {
            if (processingMsg && processingMsg.key) {
                await sock.sendMessage(jid, { delete: processingMsg.key }).catch(delErr => console.warn("Gagal hapus pesan progres ytmp3:", delErr));
            }
            console.error(`[${this.Callname}] Error:`, error.message);
            let userErrorMessage = `Waduh, ada error pas jalanin command ${this.Callname}.`;
            if (error.response && error.response.data && (error.response.data.message || error.response.data.error)) {
                userErrorMessage = `Error dari API: ${error.response.data.message || error.response.data.error}`;
            } else if (error.code === 'ECONNABORTED') {
                userErrorMessage = `Server API kelamaan jawab nih atau ukuran file terlalu besar, coba lagi nanti.`;
            }
            await sock.sendMessage(jid, { text: userErrorMessage }, { quoted: msg });
        }
    }
};

function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) return 'Tidak diketahui';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
        h > 0 ? h : null,
        m > 0 ? (h > 0 && m < 10 ? '0' + m : m) : (h > 0 ? '00' : '0'),
        (s < 10 ? '0' : '') + s
    ].filter(val => val !== null).join(':');
}