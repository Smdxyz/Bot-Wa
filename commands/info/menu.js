// commands/info/menu.js
const fs = require('fs');
const path = require('path');
const config = require('../../config'); // Sesuaikan path jika perlu
const { formatTime } = require('../../utils/formatUtils');

module.exports = {
    Callname: "menu",
    Kategori: "Informasi",
    SubKategori: "Utama",
    Deskripsi: "Menampilkan menu utama bot dengan tombol (Template Message).",
    Usage: "menu",
    ReqEnergy: 0,

    async execute(sock, msg, options) {
        const { jid, senderJid, user } = options;
        const pushname = user.username || senderJid.split('@')[0];
        const botName = config.botName || "MyBot";
        const ownerName = config.adminNumber.split(',')[0];
        const prefix = config.botPrefix;

        const limitnya = user.limit || 0;
        const isPremium = user.premiumTier && user.premiumTier !== "Super Kere";
        const isOwner = config.adminNumber.includes(senderJid.split('@')[0]);
        const runtime = formatTime(process.uptime());

        // Teks utama menu (body)
        let menuBodyText = `👋 Hi ${pushname},\nSaya ${botName}, siap membantu Anda!\n\n`;
        menuBodyText += `┌─「 *Informasi Pengguna* 」\n`;
        menuBodyText += `│ • Limit : ${limitnya}\n`;
        menuBodyText += `│ • Status : ${isOwner ? "Owner" : "User"}\n`;
        menuBodyText += `│ • Tipe Akun : ${isPremium ? 'Premium' : 'Gratis'}\n`;
        menuBodyText += `└─────────────\n\n`;
        menuBodyText += `┌─「 *Informasi Bot* 」\n`;
        menuBodyText += `│ • Owner : @${ownerName}\n`;
        menuBodyText += `│ • Runtime : ${runtime}\n`;
        menuBodyText += `│ • Channel : ${config.linkChannel || "Belum diset"}\n`;
        menuBodyText += `└─────────────\n\n`;
        menuBodyText += `👇 *DAFTAR MENU UTAMA* 👇\n`;
        // Anda bisa menambahkan daftar kategori di sini atau membiarkannya lebih ringkas
        // dan mengandalkan tombol untuk navigasi.
        // Contoh:
        menuBodyText += ` • ${prefix}stiker [Untuk membuat stiker]\n`;
        menuBodyText += ` • ${prefix}download [Untuk download media]\n`;
        menuBodyText += ` • ${prefix}ai [Fitur Kecerdasan Buatan]\n`;
        // ... tambahkan beberapa contoh command populer ...
        menuBodyText += `\nKetik ${prefix}allmenu untuk melihat semua perintah.`;


        // Path ke dokumen yang akan dijadikan header
        // Menggunakan package.json sebagai contoh, tapi bisa file PDF, DOCX, dll.
        const documentPath = path.join(__dirname, '..', '..', 'package.json'); // Path relatif ke package.json dari root
        let documentBuffer;
        let documentOptions = {};

        try {
            if (fs.existsSync(documentPath)) {
                documentBuffer = await fs.promises.readFile(documentPath);
                documentOptions = {
                    document: documentBuffer,
                    mimetype: 'application/json', // Mimetype yang benar untuk package.json
                    fileName: `${botName} Info.json`, // Nama file yang akan ditampilkan
                    // caption: `Info Bot ${botName}` // Caption untuk dokumen jika diperlukan (biasanya tidak untuk header)
                };
            } else {
                console.warn(`[MenuCommand] Dokumen untuk header tidak ditemukan di: ${documentPath}`);
            }
        } catch (err) {
            console.error("[MenuCommand] Gagal memuat dokumen untuk header:", err.message);
        }

        // Tombol untuk Template Message
        // Ada 3 jenis tombol: quickReplyButton, urlButton, callButton
        const templateButtons = [
            { index: 1, quickReplyButton: { displayText: '👑 Owner', id: `${prefix}owner` } },
            { index: 2, quickReplyButton: { displayText: '📜 Semua Perintah', id: `${prefix}allmenu` } },
            // Contoh URL button (jika ada channel atau link penting)
            // { index: 3, urlButton: { displayText: '📢 Channel Bot', url: config.linkChannel || 'https://whatsapp.com' } }
        ];
        if (config.linkChannel) {
             templateButtons.push(
                 { index: 3, urlButton: { displayText: '📢 Channel Bot', url: config.linkChannel } }
             );
        }


        // Membuat pesan template
        // Pesan template bisa memiliki salah satu dari: text, image, video, document sebagai header.
        // Tidak bisa semuanya sekaligus.
        let messageTemplate;

        if (documentBuffer) {
            // Template dengan Document Header
            messageTemplate = {
                viewOnce: false, // Menu sebaiknya tidak viewOnce
                templateButtons,
                documentMessage: { // Menggunakan documentMessage sebagai header
                    url: undefined, // Tidak perlu URL jika mengirim buffer langsung
                    mimetype: documentOptions.mimetype,
                    title: documentOptions.fileName, // Judul dokumen
                    fileLength: documentBuffer.length,
                    jpegThumbnail: undefined, // Bisa ditambahkan thumbnail jika dokumennya mendukung (misal PDF)
                    mediaKey: undefined,
                    fileName: documentOptions.fileName,
                    caption: menuBodyText, // Teks menu utama akan jadi caption dokumen
                    directPath: undefined,
                    buffer: documentBuffer // Buffer dokumen
                }
            };
        } else {
            // Template dengan Text Header (jika dokumen gagal atau tidak ada)
            // Atau bisa juga dengan Image Header jika Anda punya gambar menu
            const menuImagePath = config.menuImage;
            let menuImageBuffer;
            if (menuImagePath && fs.existsSync(menuImagePath)) {
                try {
                    menuImageBuffer = await fs.promises.readFile(menuImagePath);
                } catch (e) { console.warn("Gagal baca gambar menu untuk template:", e.message); }
            }

            if (menuImageBuffer) {
                messageTemplate = {
                    viewOnce: false,
                    templateButtons,
                    imageMessage: {
                        url: undefined, // Tidak perlu jika pakai buffer
                        mimetype: 'image/jpeg', // atau image/png
                        caption: menuBodyText, // Teks menu jadi caption gambar
                        jpegThumbnail: menuImageBuffer, // Thumbnail bisa sama dengan gambar utama
                        buffer: menuImageBuffer
                    }
                };
            } else {
                // Fallback ke Text Message jika tidak ada dokumen atau gambar
                messageTemplate = {
                    viewOnce: false,
                    templateButtons,
                    text: menuBodyText, // Teks menu utama
                    // footer: `© ${botName} ${new Date().getFullYear()}`, // Footer bisa ditambahkan di sini
                    // contextInfo: { mentionedJid: [`${ownerName}@s.whatsapp.net`] }
                };
            }
        }


        try {
            // Mengirim pesan template
            // Cara 1: Langsung dengan sock.sendMessage (lebih simpel)
            // await sock.sendMessage(jid, messageTemplate, { quoted: msg });

            // Cara 2: Menggunakan generateWAMessageFromContent untuk lebih banyak kontrol (jika diperlukan)
            // Ini adalah cara yang lebih robust untuk template messages.
            const fullMessage = await sock.generateWAMessageFromContent(jid, {
                viewOnceMessage: { // Bungkus dengan viewOnceMessage jika ingin (tapi untuk menu biasanya tidak)
                    message: {
                        templateMessage: { // Ini adalah kuncinya
                            hydratedTemplate: messageTemplate, // hydratedTemplate adalah nama yang benar
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            }
                        }
                    }
                }
            }, { userJid: sock.authState.creds.me.id, quoted: msg });

            await sock.relayMessage(jid, fullMessage.message, { messageId: fullMessage.key.id });

            console.log(`[MenuCommand] Template Menu dikirim ke ${jid}`);

        } catch (error) {
            console.error("[MenuCommand] Gagal mengirim template menu:", error);
            // Fallback ke pesan teks biasa jika template gagal
            await sock.sendMessage(jid, { text: "Gagal menampilkan menu interaktif. Silakan coba lagi nanti atau ketik !help." + "\n\n" + menuBodyText.substring(0, 1000) }, { quoted: msg });
        }
    }
};