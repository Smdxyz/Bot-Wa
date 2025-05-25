// commands/menu.js
const config = require('../config');
const { formatSuperMenuTextFrames } = require('../utils/formatUtils');
const fs = require('fs'); // Menggunakan fs sinkronus untuk readFileSync
const { delay } = require('@whiskeysockets/baileys');

module.exports = {
    Callname: "menu",
    Kategori: "Informasi",
    SubKategori: "Utama",
    Deskripsi: "Menampilkan Super Menu bot dengan animasi edit pesan.",
    Usage: "menu",
    ReqEnergy: 0,

    async execute(sock, msg, options) {
        const { jid, senderJid, user, commands, isAdminBot } = options;
        const botName = config.botName || "MyBot";
        const ownerNumbers = config.adminNumber.split(',');

        try {
            const menuFrames = await formatSuperMenuTextFrames(botName, user, commands, {
                totalFrames: config.menuAnimationFrames,
                isAdminBot: isAdminBot
            });

            if (!menuFrames || menuFrames.length === 0) {
                throw new Error("Gagal membuat frame menu, bosku.");
            }

            const mentions = [senderJid];
            if (ownerNumbers.length > 0 && ownerNumbers[0].trim()) {
                mentions.push(`${ownerNumbers[0].trim()}@s.whatsapp.net`);
            }

            let initialMessageOptions = {};
            let messageKeyForEdit = null;

            // Menentukan konten pesan awal (gambar+caption atau teks)
            if (config.botLogoPath && fs.existsSync(config.botLogoPath) && (config.useAnimatedMenu || (!config.useAnimatedMenu && config.sendMenuWithImage))) {
                try {
                    initialMessageOptions.image = fs.readFileSync(config.botLogoPath);
                    initialMessageOptions.caption = menuFrames[0];
                } catch (readError) {
                    console.warn(`[MenuCommand] Gagal membaca file logo di ${config.botLogoPath}: ${readError.message}. Menggunakan teks saja.`);
                    initialMessageOptions.text = menuFrames[0];
                }
            } else {
                if (config.botLogoPath && !(config.useAnimatedMenu || (!config.useAnimatedMenu && config.sendMenuWithImage))) {
                    // Kondisi ini berarti path ada tapi tidak digunakan karena konfigurasi
                } else if (config.botLogoPath) { // Path ada tapi fs.existsSync(config.botLogoPath) false
                    console.warn(`[MenuCommand] File logo di ${config.botLogoPath} tidak ditemukan atau tidak dapat diakses. Menggunakan teks saja.`);
                }
                initialMessageOptions.text = menuFrames[0];
            }

            // Membangun contextInfo
            let contextInfoPayload = {};
            if (mentions.length > 0) {
                contextInfoPayload.mentionedJid = mentions;
            }

            if (config.enableAdReply && config.adReplyConfig) {
                 contextInfoPayload.externalAdReply = {
                    title: config.adReplyConfig.title,
                    body: config.adReplyConfig.body,
                    mediaUrl: config.adReplyConfig.mediaUrl || undefined,
                    sourceUrl: config.adReplyConfig.sourceUrl,
                    mediaType: config.adReplyConfig.mediaType,
                    renderLargerThumbnail: config.adReplyConfig.renderLargerThumbnail,
                    showAdAttribution: true,
                 };
                 if (config.adReplyConfig.localThumbnailPath && fs.existsSync(config.adReplyConfig.localThumbnailPath)) {
                    try {
                        contextInfoPayload.externalAdReply.thumbnail = fs.readFileSync(config.adReplyConfig.localThumbnailPath);
                    } catch (readThumbError) {
                        console.warn(`[MenuCommand] Gagal membaca file thumbnail AdReply di ${config.adReplyConfig.localThumbnailPath}: ${readThumbError.message}. Fallback ke URL jika ada.`);
                        if (config.adReplyConfig.thumbnailUrl) {
                            contextInfoPayload.externalAdReply.thumbnailUrl = config.adReplyConfig.thumbnailUrl;
                        }
                    }
                 } else if (config.adReplyConfig.localThumbnailPath) {
                    console.warn(`[MenuCommand] File thumbnail AdReply di ${config.adReplyConfig.localThumbnailPath} tidak ditemukan. Fallback ke URL jika ada.`);
                    if (config.adReplyConfig.thumbnailUrl) {
                        contextInfoPayload.externalAdReply.thumbnailUrl = config.adReplyConfig.thumbnailUrl;
                    }
                 } else if (config.adReplyConfig.thumbnailUrl) { // Jika local path tidak ada, langsung pakai URL
                    contextInfoPayload.externalAdReply.thumbnailUrl = config.adReplyConfig.thumbnailUrl;
                 }
            }

            if (config.newsletterJidForMenu && config.newsletterNameForMenu) {
                contextInfoPayload.forwardedNewsletterMessageInfo = {
                    newsletterName: config.newsletterNameForMenu,
                    newsletterJid: config.newsletterJidForMenu,
                };
                if (contextInfoPayload.externalAdReply) {
                    contextInfoPayload.externalAdReply.title = config.newsletterNameForMenu; // Override title AdReply dengan nama newsletter
                } else {
                    contextInfoPayload.externalAdReply = {
                        title: config.newsletterNameForMenu,
                        body: config.botName,
                        mediaType: 1,
                        showAdAttribution: true,
                    };
                    if (config.adReplyConfig && config.adReplyConfig.localThumbnailPath && fs.existsSync(config.adReplyConfig.localThumbnailPath)) {
                        try {
                            contextInfoPayload.externalAdReply.thumbnail = fs.readFileSync(config.adReplyConfig.localThumbnailPath);
                        } catch (readThumbError) {
                             console.warn(`[MenuCommand] Gagal membaca file thumbnail AdReply (newsletter) di ${config.adReplyConfig.localThumbnailPath}: ${readThumbError.message}. Fallback ke URL jika ada.`);
                             if (config.adReplyConfig.thumbnailUrl) {
                                contextInfoPayload.externalAdReply.thumbnailUrl = config.adReplyConfig.thumbnailUrl;
                            }
                        }
                    } else if (config.adReplyConfig?.localThumbnailPath) {
                         console.warn(`[MenuCommand] File thumbnail AdReply (newsletter) di ${config.adReplyConfig.localThumbnailPath} tidak ditemukan. Fallback ke URL jika ada.`);
                         if (config.adReplyConfig.thumbnailUrl) {
                            contextInfoPayload.externalAdReply.thumbnailUrl = config.adReplyConfig.thumbnailUrl;
                        }
                    } else if (config.adReplyConfig?.thumbnailUrl) {
                        contextInfoPayload.externalAdReply.thumbnailUrl = config.adReplyConfig.thumbnailUrl;
                    }
                }
                contextInfoPayload.forwardingScore = 5; // Nilai umum untuk tampilan "Forwarded many times"
                contextInfoPayload.isForwarded = true;
            }

            if (Object.keys(contextInfoPayload).length > 0) {
                initialMessageOptions.contextInfo = contextInfoPayload;
            }

            const sentMsg = await sock.sendMessage(jid, initialMessageOptions, { quoted: msg });

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                messageKeyForEdit = sentMsg.key;
            } else {
                console.warn("[MenuCommand] Gagal mendapatkan key dari pesan pertama, animasi edit mungkin gagal.");
                if (!config.useAnimatedMenu) console.log(`[MenuCommand] Menu (non-animasi) dikirim ke ${jid}`);
                return;
            }

            if (config.useAnimatedMenu && messageKeyForEdit && menuFrames.length > 1) {
                const editDelay = config.menuAnimationDelay || 700;
                for (let i = 1; i < menuFrames.length; i++) {
                    await delay(editDelay);
                    try {
                        let editOptions = { text: menuFrames[i], edit: messageKeyForEdit };
                        if (contextInfoPayload.mentionedJid) {
                            editOptions.contextInfo = { mentionedJid: contextInfoPayload.mentionedJid };
                        }
                        await sock.sendMessage(jid, editOptions);
                    } catch (editError) {
                        console.warn(`[MenuCommand] Gagal mengedit menu ke frame ${i}:`, editError.message);
                        break;
                    }
                }
                console.log(`[MenuCommand] Super Menu animasi selesai dikirim ke ${jid}`);
            } else if (!config.useAnimatedMenu) {
                 console.log(`[MenuCommand] Menu (non-animasi) dikirim ke ${jid}`);
            }

        } catch (error) {
            console.error(`[MenuCommand] Gagal total saat mengirim menu:`, error);
            await sock.sendMessage(jid, { text: config.errorMessage }, { quoted: msg });
        }
    }
};