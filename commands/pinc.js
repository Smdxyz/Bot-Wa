// commands/pinc.js
const axios = require('axios');
const config = require('../config');
const { getMasterApiKey } = require('../utils/apiKeyManager');
const { sendAnimatedMessage } = require('../utils/animator'); // Impor animator
const {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');

module.exports = {
    Callname: 'pinc',
    Kategori: 'Pencarian',
    SubKategori: 'Gambar',
    Deskripsi: 'Mencari gambar dari Pinterest berdasarkan query.',
    Usage: 'pinc <query> [--geser <jumlah>]',
    ReqEnergy: 2,

    async execute(sock, msg, options) {
        const { args, jid, text: fullArgsText } = options;
        const prefix = config.botPrefix;

        if (args.length === 0 && !fullArgsText.includes(this.Callname)) { // Perbaikan untuk cek argumen kosong
             return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}${this.Callname} <query> [--geser <jumlah>]` }, { quoted: msg });
        }


        const apiKey = await getMasterApiKey();
        if (!apiKey) {
            return sock.sendMessage(jid, { text: `Fitur ini memerlukan konfigurasi API Key oleh admin.` }, { quoted: msg });
        }

        let query = args[0];
        let amount = 5;
        let useCarousel = false;

        const queryParts = fullArgsText.replace(prefix + this.Callname, "").trim().split("--geser");
        query = queryParts[0].trim();

        if (queryParts.length > 1 && queryParts[1].trim() !== "") {
            useCarousel = true;
            const amountStr = queryParts[1].trim();
            if (amountStr && !isNaN(parseInt(amountStr))) {
                amount = parseInt(amountStr);
            }
            amount = Math.max(1, Math.min(amount || 5, 10));
        } else if (queryParts.length > 1 && queryParts[1].trim() === "") { // Jika ada --geser tapi tidak ada angka
            useCarousel = true; // Default amount (5) akan digunakan
        }


        if (!query) {
             return sock.sendMessage(jid, { text: `Masukkan query pencarian!\nContoh: ${prefix}${this.Callname} kucing lucu` }, { quoted: msg });
        }

        const waitFrames = [
            `🔎 Mencari "${query}" di Pinterest...`,
            `🔄 Mengumpulkan hasil terbaik...`,
            `🖼️ Menyiapkan gambar untukmu...`,
            `✨ Hampir selesai!`
        ];
        let processingMsg = await sendAnimatedMessage(sock, jid, waitFrames, { text: waitFrames[0] }, msg);
         if (!processingMsg) {
             processingMsg = await sock.sendMessage(jid, { text: config.waitMessage || "⏳ Mencari..." }, { quoted: msg });
        }

        try {
            const apiUrl = `https://szyrineapi.biz.id/download/pinterest-search-v2?query=${encodeURIComponent(query)}&limit=${amount}`;
            const response = await axios.get(apiUrl, {
                headers: { 'X-API-Key': apiKey },
                timeout: 20000
            });
            
            if (processingMsg && processingMsg.key) {
                await sock.sendMessage(jid, { delete: processingMsg.key });
            }

            const data = response.data;

            if (!data || !data.status || !data.result || !Array.isArray(data.result.pins) || data.result.pins.length === 0) {
                return sock.sendMessage(jid, { text: "🚫 Gambar tidak ditemukan atau format respons API tidak sesuai." }, { quoted: msg });
            }

            const pins = data.result.pins;

            if (useCarousel) {
                let cards = [];
                for (let i = 0; i < pins.length; i++) {
                    const pin = pins[i];
                    if (pin.media && pin.media.images && pin.media.images.orig && pin.media.images.orig.url) {
                        try {
                            const media = await prepareWAMessageMedia({ image: { url: pin.media.images.orig.url } }, { upload: sock.waUploadToServer, timeout: 20000 });
                            cards.push({
                                header: { imageMessage: media.imageMessage, hasMediaAttachment: true },
                                body: { text: `#${i + 1} - ${pin.title || "Gambar Pinterest"}` },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                            name: "cta_url",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "Lihat di Pinterest",
                                                url: pin.pin_url || `https://pinterest.com/pin/${pin.id}`
                                            }),
                                        },
                                    ],
                                },
                            });
                        } catch (err) {
                            console.warn(`[${this.Callname}] Gagal memuat gambar untuk carousel: ${pin.media.images.orig.url}`, err);
                        }
                    }
                }

                if (cards.length === 0) {
                    return sock.sendMessage(jid, { text: "⚠️ Semua gambar gagal dimuat untuk carousel." }, { quoted: msg });
                }

                const msgContent = generateWAMessageFromContent(jid, {
                    interactiveMessage: {
                        body: { text: `📸 Hasil pencarian untuk: "${query.trim()}" (${cards.length} gambar)` },
                        header: { title: `Pinterest: ${query.trim()}`, subtitle: `${config.botName}`, hasMediaAttachment: false },
                        carouselMessage: { cards: cards, messageVersion: 1 },
                    },
                }, { quoted: msg });
                await sock.relayMessage(jid, msgContent.message, { messageId: msgContent.key.id });

            } else {
                const randomPin = pins[Math.floor(Math.random() * pins.length)];
                if (randomPin.media && randomPin.media.images && randomPin.media.images.orig && randomPin.media.images.orig.url) {
                    await sock.sendMessage(jid, {
                        image: { url: randomPin.media.images.orig.url },
                        caption: `🔍 *${randomPin.title || "Gambar Pinterest"}*\n\n🔗 [Lihat di Pinterest](${randomPin.pin_url || `https://pinterest.com/pin/${randomPin.id}`})\n\n${config.watermark || ''}`
                    }, { quoted: msg, mediaUploadTimeoutMs: 60000 * 2 });
                } else {
                    await sock.sendMessage(jid, { text: "Gagal mendapatkan URL gambar dari pin acak." }, { quoted: msg });
                }
            }

        } catch (error) {
            if (processingMsg && processingMsg.key) {
                await sock.sendMessage(jid, { delete: processingMsg.key }).catch(delErr => console.warn("Gagal hapus pesan progres pinc:", delErr));
            }
            console.error(`[${this.Callname}] Error:`, error.message);
            let userErrorMessage = `Waduh, ada error pas jalanin command ${this.Callname}.`;
            if (error.response && error.response.data && (error.response.data.message || error.response.data.error) ) {
                userErrorMessage = `Error dari API: ${error.response.data.message || error.response.data.error}`;
            } else if (error.code === 'ECONNABORTED') {
                userErrorMessage = `Server API kelamaan jawab nih, coba lagi nanti.`;
            }
            await sock.sendMessage(jid, { text: userErrorMessage }, { quoted: msg });
        }
    }
};