// commands/template.js
// Ganti 'template' dengan nama command Anda (misalnya, 'igdl', 'ttdl', dll.)

// Impor modul yang dibutuhkan
const axios = require('axios'); // Contoh jika Anda menggunakan axios untuk request API
const config =require('../config'); // Untuk akses prefix atau konfigurasi lain
const { getMasterApiKey } = require('../utils/apiKeyManager'); // Mengambil Master API Key

module.exports = {
    Callname: "namacommand",
    Kategori: "Downloader", // Contoh kategori
    SubKategori: "Media Sosial", // Contoh sub-kategori
    Deskripsi: "Deskripsi singkat tentang fungsi command ini (misalnya, Mengunduh video Instagram).",
    Usage: "namacommand <url_media>",
    AdminOnly: false,
    OwnerOnly: false,
    GroupOnly: false,
    PCOnly: false,
    ReqTier: false,
    ReqEnergy: 5, // Sesuaikan kebutuhan energi
    ReqCoin: 'n',
    CostCoin: 0,

    async execute(sock, msg, options) {
        const { args, text, commandName, jid, senderJid, user } = options;
        const prefix = config.botPrefix;

        if (args.length === 0) {
            return sock.sendMessage(jid, { text: `Penggunaan yang benar: ${prefix}${this.Callname} ${this.Usage.replace(this.Callname, '').trim()}` }, { quoted: msg });
        }

        const mediaUrl = args[0]; // Asumsi URL adalah argumen pertama

        // Validasi URL sederhana (Anda mungkin ingin validasi yang lebih ketat)
        if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
            return sock.sendMessage(jid, { text: 'URL yang Anda masukkan sepertinya tidak valid.' }, { quoted: msg });
        }

        // Mengambil Master API Key
        const apiKey = await getMasterApiKey();
        if (!apiKey) {
            // Pesan ini penting untuk memberitahu pengguna (dan admin) bahwa ada masalah konfigurasi
            return sock.sendMessage(jid, { text: `Fitur ini memerlukan konfigurasi API Key oleh admin. Silakan hubungi admin bot.` }, { quoted: msg });
        }

        // Kirim pesan tunggu
        await sock.sendMessage(jid, { text: config.waitMessage || "⏳ Sebentar ya, lagi diproses..." }, { quoted: msg });

        try {
            // Contoh penggunaan API pribadi Anda
            // Ganti URL_API_PRIBADI_ANDA dengan endpoint API Anda yang sesuai
            // Ganti 'endpointFitur' dengan path spesifik untuk fitur ini (misal, '/igdl', '/ttdl')
            const apiUrl = `URL_API_PRIBADI_ANDA/endpointFitur`;

            const response = await axios.get(apiUrl, {
                params: {
                    url: mediaUrl,
                    // API Anda mungkin mengharapkan API key di params atau headers
                    // apikey: apiKey, // Contoh jika di params
                },
                headers: {
                    // 'Authorization': `Bearer ${apiKey}`, // Contoh jika di header sebagai Bearer token
                    'X-API-KEY': apiKey, // Contoh jika di header sebagai X-API-KEY (sesuaikan dengan API Anda)
                },
                timeout: 30000 // Timeout 30 detik (sesuaikan)
            });

            // Proses respons dari API Anda
            if (response.data && response.data.success && response.data.downloadUrl) {
                // Contoh jika API Anda mengembalikan URL download
                // Anda mungkin perlu mengirim file video/gambar, bukan hanya link
                // Ini contoh mengirim link saja:
                let resultText = `✅ Berhasil memproses permintaan Anda!\n\n`;
                resultText += `🔗 Link Download: ${response.data.downloadUrl}\n`;
                if (response.data.title) {
                    resultText += `📝 Judul: ${response.data.title}\n`;
                }
                // Tambahkan detail lain dari respons API Anda jika ada

                // Contoh mengirim media jika API mengembalikan URL langsung ke file
                // if (response.data.isVideo) {
                //    await sock.sendMessage(jid, { video: { url: response.data.downloadUrl }, caption: response.data.title || "Ini videonya!" }, { quoted: msg });
                // } else if (response.data.isImage) {
                //    await sock.sendMessage(jid, { image: { url: response.data.downloadUrl }, caption: response.data.title || "Ini gambarnya!" }, { quoted: msg });
                // } else {
                //    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
                // }
                await sock.sendMessage(jid, { text: resultText }, { quoted: msg });

            } else {
                // Jika API Anda mengembalikan status gagal atau format respons tidak sesuai
                const errorMessageFromApi = response.data && response.data.message ? response.data.message : "Gagal memproses permintaan dari server API.";
                await sock.sendMessage(jid, { text: `🚫 Maaf, terjadi kesalahan: ${errorMessageFromApi}` }, { quoted: msg });
            }

        } catch (error) {
            console.error(`[${this.Callname.toUpperCase()}_COMMAND] Error:`, error.message); // Log error di server
            let userErrorMessage = `Waduh, ada error pas jalanin command ${this.Callname}.`;
            if (error.response && error.response.data && error.response.data.message) {
                userErrorMessage += `\nPesan dari server: ${error.response.data.message}`;
            } else if (error.code === 'ECONNABORTED') {
                userErrorMessage = `Server API kelamaan jawab nih, coba lagi nanti.`;
            }
            await sock.sendMessage(jid, { text: userErrorMessage }, { quoted: msg });
        }
    }
};