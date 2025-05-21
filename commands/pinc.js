const axios = require('axios');
const {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');

module.exports = {
    NamaFitur: 'Pencarian Gambar Pinterest V2',
    Callname: 'pinc',
    Kategori: 'Pencarian',
    SubKategori: 'Gambar',
    ReqEnergy: 1,
    ReqTier: 'Super Kere',
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Mencari gambar dari Pinterest (Versi 2) berdasarkan query yang diberikan dan menampilkan dalam format carousel.',

    execute: async function (sock, msg, commands, { isActive, tier, multiplier, mediaType, apiKey }) {
        const jid = msg.key.remoteJid;
        const rawQuery = msg.message?.conversation?.split(" ").slice(1).join(" ") || '';

        if (!rawQuery.trim()) {
            await sock.sendMessage(jid, { text: "⚠️ Masukkan kata kunci untuk mencari gambar di Pinterest!" }, { quoted: msg });
            return;
        }

        const [query, geser] = rawQuery.split('--geser').map(part => part.trim());
        let amount = parseInt(geser?.split(" ")?.[1] || 5);
        amount = Math.max(1, Math.min(amount, 5));

        console.log(`[${this.Callname}] Mencari gambar (v2): ${query}`);

        await sock.sendPresenceUpdate('composing', jid);

        try {
            const apiUrl = `https://sannpanel.my.id/pinterest-search-v2?query=${encodeURIComponent(query)}&limit=${amount}`; // Gunakan endpoint baru dan limit
            const { data } = await axios.get(apiUrl, {
                timeout: 10000,
                headers: { 'x-api-key': 'ramadhan7' }
            });

            if (!data || !data.status || !Array.isArray(data.result) || data.result.length === 0) { // Periksa struktur respons
                await sock.sendMessage(jid, { text: "🚫 Gambar tidak ditemukan." }, { quoted: msg });
                return;
            }

            const images = data.result.map(item => ({ // Gunakan data.result
                url: item.url, //Sesuaikan properti url
                title: item.title || "Gambar Pinterest", //sesuaikan properti title
                link: "https://whatsapp.com/channel/0029VafhW708aKvCHyexCe3y"
            }));

            if (typeof geser === "string") {
                let cards = [];
                for (let [index, image] of images.entries()) {
                    try {
                        const media = await prepareWAMessageMedia({ image: { url: image.url } }, { upload: sock.waUploadToServer });
                        cards.push({
                            header: { imageMessage: media.imageMessage, hasMediaAttachment: true },
                            body: { text: `#${index + 1} - ${image.title}` },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: "cta_url",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Lihat di WhatsApp Channel",
                                            url: image.link
                                        }),
                                    },
                                ],
                            },
                        });
                    } catch (err) {
                        console.warn(`❗ Gagal memuat gambar: ${image.url}`, err);
                    }
                }

                if (cards.length === 0) {
                    await sock.sendMessage(jid, { text: "⚠️ Semua gambar gagal dimuat." }, { quoted: msg });
                    return;
                }

                const msgContent = generateWAMessageFromContent(jid, {
                    interactiveMessage: {
                        body: { text: `📸 Hasil pencarian untuk: "${query.trim()}"` },
                        carouselMessage: {
                            cards: cards,
                            messageVersion: 1,
                        },
                    },
                }, {});

                await sock.relayMessage(jid, msgContent.message, { messageId: msgContent.key.id });

            } else {
                let randomImage = images[Math.floor(Math.random() * images.length)];
                await sock.sendMessage(jid, {
                    image: { url: randomImage.url },
                    caption: `🔍 *${randomImage.title}*\n\n[Jangan lupa follow  WhatsApp Channel Gw](${randomImage.link})`
                }, { quoted: msg });
            }

        } catch (error) {
            console.error(`[${this.Callname}] Error:`, error.message || error);
            let errorMessage = "⚠️ Terjadi kesalahan saat mengambil data.";

           if (error.response) {
                errorMessage = `⚠️ Error dari server: ${error.response.status} - ${error.response.data.error || error.response.statusText}`;
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = "⚠️ Waktu tunggu permintaan ke API habis.";
            }
            await sock.sendMessage(jid, { text: errorMessage }, { quoted: msg });
        } finally {
            await sock.sendPresenceUpdate('paused', jid);
        }
    },
};