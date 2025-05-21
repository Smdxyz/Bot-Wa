const { formatTime, formatMenu } = require('../utils/formatUtils');
const { getBotStats } = require('../adminManager');
const { readDatabase } = require('../utils/utils');
const { getUser } = require('../userDatabase');
const config = require('../config');
const { delay, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Ambil daftar admin dari config
const adminNumbers = config.adminNumber.split(',').map(number => number.trim().split('@')[0]);

module.exports = {
    NamaFitur: 'Menu',
    Callname: 'menu',
    Kategori: 'Info',
    SubKategori: 'Bot',
    ReqEnergy: 0,
    ReqTier: null,
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Menampilkan menu dan informasi bot dengan tampilan yang lebih menarik.',
    execute: async function (sock, msg) {
        const jid = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const userNumber = userId.split('@')[0];

        console.log(`[menu.js] START - userId: ${userId}`);

        if (config.botMode === 'private' && !adminNumbers.includes(userNumber)) {
            await sock.sendMessage(jid, { text: "Maaf, bot ini dalam mode pribadi. Hanya admin yang dapat menggunakan." });
            console.log(`[menu.js] User not admin.`);
            return;
        }

        let user = await getUser(userId);
        if (!user) {
            await sock.sendMessage(jid, { text: "Pengguna tidak ditemukan. Silakan gunakan bot terlebih dahulu." });
            console.log(`[menu.js] User not found.`);
            return;
        }

        const now = moment().tz('Asia/Jakarta');
        const hour = now.hour();
        let greeting, emoji;

        if (hour >= 5 && hour < 11) {
            greeting = config.greetingMorning;
            emoji = "";
        } else if (hour >= 11 && hour < 15) {
            greeting = config.greetingAfternoon;
            emoji = "";
        } else if (hour >= 15 && hour < 18) {
            greeting = config.greetingEvening;
            emoji = "";
        } else if (hour >= 18 && hour < 22) {
            greeting = config.greetingNight;
            emoji = "";
        } else {
            greeting = config.greetingMidnight;
            emoji = "";
        }

        const tagUser = `@${userNumber}`;
        const newsletterJid = '120363285859178588@newsletter'; // Ganti dengan JID saluran WhatsApp Anda
        const newsletterName = 'Sann X '; // Nama saluran yang akan muncul biru

        const loadingEmojis = ["", "", "", ""];
        let loadingIndex = 0;
        let loadingMessage;

        try {
            // Kirim pesan loading
            loadingMessage = await sock.sendMessage(jid, {
                text: `Memuat menu... ${loadingEmojis[loadingIndex]} \n\n${greeting} ${tagUser}! ${emoji}`,
                mentions: [`${userNumber}@s.whatsapp.net`]
            });

            let loadingInterval = setInterval(async () => {
                try {
                    loadingIndex = (loadingIndex + 1) % loadingEmojis.length;
                    await sock.sendMessage(jid, {
                        edit: loadingMessage.key,
                        text: `Memuat menu... ${loadingEmojis[loadingIndex]} \n\n${greeting} ${tagUser}! ${emoji}`,
                        mentions: [`${userNumber}@s.whatsapp.net`]
                    });
                } catch (error) {
                    console.error("Error dalam animasi loading:", error);
                    clearInterval(loadingInterval);
                }
            }, 800);

            await delay(2500); // Waktu delay sebelum menu tampil
            clearInterval(loadingInterval);
        } catch (error) {
            console.error("Error saat mengirim pesan loading:", error);
        }

        const startTime = process.hrtime();
        const botStats = await getBotStats();
        const endTime = process.hrtime(startTime);

        const db = await readDatabase();
        console.log(`[menu.js] Database read successfully.`);

        const popularCommands = Object.entries(db.users).reduce((acc, [userId, userData]) => {
            if (userData.commandsUsed && typeof userData.commandsUsed === 'object') {
                for (const commandName in userData.commandsUsed) {
                    const count = userData.commandsUsed[commandName];
                    const existingCommand = acc.find(cmd => cmd.name === commandName);
                    if (existingCommand) {
                        existingCommand.count += count;
                    } else {
                        acc.push({ name: commandName, count });
                    }
                }
            }
            return acc;
        }, []);

        popularCommands.sort((a, b) => b.count - a.count);

        const watermark = config.watermark;
        const botName = config.botName;
        const prefix = config.botPrefix; // Prefix dari config.js
        const menuText = await formatMenu(botName, botStats, popularCommands, watermark, user, prefix);

        const imagePath = config.menuImage || path.join(__dirname, '..', 'assets', 'menu_image.jpg');
        const menuMessage = generateWAMessageFromContent(jid, proto.Message.fromObject({
            extendedTextMessage: {
                text: menuText,
                footer: watermark,
                contextInfo: {
                    mentionedJid: [`${userNumber}@s.whatsapp.net`],
                    forwardingScore: 99, //  Wajib untuk label "Diteruskan"
                    isForwarded: true,   //  Wajib untuk trigger tulisan biru
                    forwardedNewsletterMessageInfo: {
                        newsletterName: newsletterName,  //  Nama saluran (biru otomatis)
                        newsletterJid: newsletterJid    //  JID saluran @newsletter
                    },
                    externalAdReply: {
                        title: `${botName} Menu`,
                        body: "Szyrine Bots Api",
                        thumbnail: fs.readFileSync(imagePath),
                        sourceUrl: `https://wa.me/${newsletterJid}`,  // Fallback jika teks biru gagal
                        mediaUrl: `https://wa.me/${newsletterJid}`,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                        mediaType: 1,
                    },
                },
            },
        }), {});

        try {
            // Tampilkan menu utama
            await sock.relayMessage(jid, menuMessage.message, { messageId: menuMessage.key.id });

            // Hapus pesan loading setelah menu ditampilkan
            if (loadingMessage) {
                await sock.sendMessage(jid, { delete: loadingMessage.key });
                console.log(`[menu.js] Pesan loading dihapus.`);
            }

            console.log(`[menu.js] Menu berhasil dikirim dan loading dihapus.`);
        } catch (error) {
            console.error("Error saat mengirim atau menghapus pesan menu:", error);
        }

        console.log(`[menu.js] END`);
    },
};