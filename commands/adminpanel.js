// commands/admin/adminpanel.js
const config = require('../config'); // Sesuaikan path
const { getUser, updateUser, addCoin, addEnergy, getAllUsers } = require('../userDatabase'); // Sesuaikan path
const { applyPremium, generateRedeemCode } = require('../premiumManager'); // Sesuaikan path
const { readDatabase, writeDatabase } = require('../utils/utils'); // Sesuaikan path
const os = require('os');
const moment = require('moment-timezone');

module.exports = {
    Callname: "adminpanel",
    Kategori: "Admin",
    SubKategori: "Panel Kontrol",
    Deskripsi: "Panel kontrol super untuk admin bot.",
    Usage: "adminpanel <subcommand> [options]",
    AdminOnly: true, // Hanya admin bot yang bisa pakai

    async execute(sock, msg, options) {
        const { args, jid, senderJid, user } = options;
        const prefix = config.botPrefix;

        if (args.length === 0) {
            let panelText = `👑 *ADMIN PANEL ${config.botName}* 👑\n\n`;
            panelText += `Halo Big Boss ${user.username}!\nApa yang mau kita oprek hari ini?\n\n`;
            panelText += `*Sub-Perintah Tersedia:*\n`;
            panelText += `  ◦ ${prefix}adminpanel genkode <tier> <durasi_hari> [jumlah_koin]\n`;
            panelText += `  ◦ ${prefix}adminpanel addcoin <@user/jid> <jumlah>\n`;
            panelText += `  ◦ ${prefix}adminpanel addenergy <@user/jid> <jumlah>\n`;
            panelText += `  ◦ ${prefix}adminpanel settier <@user/jid> <tier> <durasi_hari>\n`;
            panelText += `  ◦ ${prefix}adminpanel setmode <public/private/self>\n`;
            panelText += `  ◦ ${prefix}adminpanel ban <@user/jid> [alasan]\n`;
            panelText += `  ◦ ${prefix}adminpanel unban <@user/jid>\n`;
            panelText += `  ◦ ${prefix}adminpanel listbanned\n`;
            panelText += `  ◦ ${prefix}adminpanel broadcast <pesan_broadcast>\n`;
            panelText += `  ◦ ${prefix}adminpanel stats\n`;
            panelText += `  ◦ ${prefix}adminpanel listusers [page]\n`;
            panelText += `  ◦ ${prefix}adminpanel restart\n`;

            await sock.sendMessage(jid, { text: panelText }, { quoted: msg });
            return;
        }

        const subCommand = args[0].toLowerCase();
        const subArgs = args.slice(1);

        try {
            switch (subCommand) {
                case 'genkode': {
                    // !adminpanel genkode <tier> <durasi_hari> [jumlah_koin]
                    if (subArgs.length < 2) return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}adminpanel genkode <tier> <durasi_hari> [jumlah_koin]` }, { quoted: msg });
                    const tier = subArgs[0];
                    const duration = parseInt(subArgs[1]);
                    const coinAmount = subArgs[2] ? parseInt(subArgs[2]) : 0;

                    if (!config.premiumTiers[tier]) return sock.sendMessage(jid, { text: `Tier "${tier}" kaga ada, bos.` }, { quoted: msg });
                    if (isNaN(duration) || duration <= 0) return sock.sendMessage(jid, { text: "Durasi hari harus angka positif." }, { quoted: msg });
                    if (isNaN(coinAmount) || coinAmount < 0) return sock.sendMessage(jid, { text: "Jumlah koin harus angka positif atau 0." }, { quoted: msg });

                    const items = {};
                    if (coinAmount > 0) items.coin = coinAmount;

                    const redeem = await generateRedeemCode(tier, duration, items);
                    await sock.sendMessage(jid, { text: `✅ Kode Redeem Berhasil Dibuat!\nTier: *${redeem.tierName}*\nDurasi: *${redeem.durationInDays} hari*\nKoin: *${items.coin || 0}*\n\nKode: \`\`\`${redeem.code}\`\`\`` }, { quoted: msg });
                    break;
                }

                case 'addcoin':
                case 'addenergy': {
                    // !adminpanel addcoin <@user/jid> <jumlah>
                    if (subArgs.length < 2) return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}adminpanel ${subCommand} <@user/jid> <jumlah>` }, { quoted: msg });
                    
                    let targetJid = subArgs[0];
                    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    } else {
                        targetJid = targetJid.replace('@', '') + '@s.whatsapp.net';
                    }
                    
                    const amount = parseInt(subArgs[1]);
                    if (isNaN(amount)) return sock.sendMessage(jid, { text: "Jumlah harus angka." }, { quoted: msg });

                    const targetUser = await getUser(targetJid);
                    if (!targetUser) return sock.sendMessage(jid, { text: `User ${targetJid} kaga ketemu.` }, { quoted: msg });

                    let success;
                    let resourceName = "";
                    if (subCommand === 'addcoin') {
                        success = await addCoin(targetJid, amount);
                        resourceName = "koin";
                    } else {
                        success = await addEnergy(targetJid, amount);
                        resourceName = "energi";
                    }

                    if (success) {
                        const updatedTargetUser = await getUser(targetJid);
                        await sock.sendMessage(jid, { text: `✅ Berhasil ${amount > 0 ? 'nambahin' : 'ngurangin'} ${Math.abs(amount)} ${resourceName} ke ${targetUser.username}.\nSekarang dia punya: ${subCommand === 'addcoin' ? updatedTargetUser.coin : updatedTargetUser.energy} ${resourceName}.` }, { quoted: msg });
                    } else {
                        await sock.sendMessage(jid, { text: `Gagal update ${resourceName} buat ${targetUser.username}.` }, { quoted: msg });
                    }
                    break;
                }

                case 'settier': {
                    // !adminpanel settier <@user/jid> <tier> <durasi_hari>
                    if (subArgs.length < 3) return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}adminpanel settier <@user/jid> <tier> <durasi_hari>` }, { quoted: msg });
                    
                    let targetJid = subArgs[0];
                    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    } else {
                        targetJid = targetJid.replace('@', '') + '@s.whatsapp.net';
                    }

                    const tier = subArgs[1];
                    const duration = parseInt(subArgs[2]);

                    if (!config.premiumTiers[tier]) return sock.sendMessage(jid, { text: `Tier "${tier}" kaga ada, bos.` }, { quoted: msg });
                    if (isNaN(duration) || duration <= 0) return sock.sendMessage(jid, { text: "Durasi hari harus angka positif." }, { quoted: msg });

                    const targetUser = await getUser(targetJid);
                    if (!targetUser) return sock.sendMessage(jid, { text: `User ${targetJid} kaga ketemu.` }, { quoted: msg });

                    const result = await applyPremium(targetJid, tier, duration);
                    if (result.success) {
                        await sock.sendMessage(jid, { text: `✅ Mantap! ${targetUser.username} sekarang jadi *${tier}* selama ${duration} hari.` }, { quoted: msg });
                    } else {
                        await sock.sendMessage(jid, { text: `Gagal upgrade tier: ${result.message}` }, { quoted: msg });
                    }
                    break;
                }

                case 'setmode': {
                    // !adminpanel setmode <public/private/self>
                    if (subArgs.length < 1) return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}adminpanel setmode <public/private/self>` }, { quoted: msg });
                    const newMode = subArgs[0].toLowerCase();
                    if (!['public', 'private', 'self'].includes(newMode)) return sock.sendMessage(jid, { text: "Mode cuma bisa public, private, atau self." }, { quoted: msg });

                    // Ini hanya contoh, Anda perlu menyimpan mode ini di database atau file config yang bisa diubah runtime
                    // Untuk sekarang, kita anggap config.js bisa di-reload atau ini hanya efek sementara
                    config.botMode = newMode; // Ini tidak akan mengubah config.js secara permanen kecuali Anda punya mekanisme save
                    // Idealnya: simpan ke database.json bagian bot
                    const db = await readDatabase();
                    db.bot.mode = newMode;
                    await writeDatabase(db);

                    await sock.sendMessage(jid, { text: `✅ Mode bot sekarang diubah jadi *${newMode}*.\n(Perubahan permanen jika disimpan ke database)` }, { quoted: msg });
                    break;
                }
                
                case 'ban':
                case 'unban': {
                    if (subArgs.length < 1) return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}adminpanel ${subCommand} <@user/jid> [alasan_ban]` }, { quoted: msg });
                    let targetJid = subArgs[0];
                    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    } else {
                        targetJid = targetJid.replace('@', '') + '@s.whatsapp.net';
                    }
                    const reason = subCommand === 'ban' ? subArgs.slice(1).join(" ") || "Gak ada alasan spesifik." : null;

                    const targetUser = await getUser(targetJid);
                    if (!targetUser && subCommand === 'ban') { // Untuk unban, user mungkin tidak ada jika belum pernah interaksi
                         await createUser(targetJid, targetJid.split('@')[0]); // Buat user jika belum ada untuk diban
                    } else if (!targetUser && subCommand === 'unban') {
                        return sock.sendMessage(jid, { text: `User ${targetJid} kaga ketemu di database.` }, { quoted: msg });
                    }


                    if (config.adminNumber.split(',').map(n => n.trim()).includes(targetJid.split('@')[0])) {
                        return sock.sendMessage(jid, { text: "Gabisa nge-ban admin laen atau diri sendiri, bos!" }, { quoted: msg });
                    }

                    await updateUser(targetJid, { isBanned: subCommand === 'ban', banReason: reason, bannedAt: subCommand === 'ban' ? new Date().toISOString() : null });
                    await sock.sendMessage(jid, { text: `✅ User ${targetJid.split('@')[0]} berhasil di-*${subCommand}*.${subCommand === 'ban' ? `\nAlasan: ${reason}` : ''}` }, { quoted: msg });
                    break;
                }

                case 'listbanned': {
                    const allDbUsers = await getAllUsers();
                    const bannedUsers = Object.values(allDbUsers).filter(u => u.isBanned);
                    if (bannedUsers.length === 0) return sock.sendMessage(jid, { text: "Aman, gak ada user yang kena ban." }, { quoted: msg });

                    let listText = "🚫 *DAFTAR USER KENA BAN* 🚫\n\n";
                    bannedUsers.forEach(u => {
                        listText += ` • @${u.jid.split('@')[0]} (${u.username})\n   Alasan: ${u.banReason}\n   Sejak: ${moment(u.bannedAt).tz('Asia/Jakarta').format('DD MMM YYYY, HH:mm')}\n\n`;
                    });
                    await sock.sendMessage(jid, { text: listText, mentions: bannedUsers.map(u => u.jid) }, { quoted: msg });
                    break;
                }

                case 'broadcast': {
                    // !adminpanel broadcast <pesan>
                    if (subArgs.length === 0) return sock.sendMessage(jid, { text: `Penggunaan: ${prefix}adminpanel broadcast <pesan>` }, { quoted: msg });
                    const broadcastMessage = subArgs.join(" ");
                    const allDbUsers = await getAllUsers();
                    const allUserJids = Object.keys(allDbUsers);
                    let sentCount = 0;
                    let errorCount = 0;

                    await sock.sendMessage(jid, { text: `📢 Memulai broadcast ke ${allUserJids.length} user...` }, { quoted: msg });

                    for (const targetUserJid of allUserJids) {
                        try {
                            // Tambahkan AdReply ke broadcast
                            let messageOptions = { text: `*📢 PESAN BROADCAST DARI ADMIN 📢*\n\n${broadcastMessage}` };
                            if (config.enableAdReply) {
                                messageOptions.contextInfo = { externalAdReply: config.adReplyConfig };
                            }
                            await sock.sendMessage(targetUserJid, messageOptions);
                            sentCount++;
                            await delay(300); // Delay biar gak kena rate limit WhatsApp
                        } catch (e) {
                            console.error(`[Broadcast] Gagal kirim ke ${targetUserJid}:`, e.message);
                            errorCount++;
                        }
                    }
                    await sock.sendMessage(jid, { text: `📢 Broadcast Selesai!\nBerhasil terkirim: ${sentCount} user.\nGagal: ${errorCount} user.` }, { quoted: msg });
                    break;
                }
                
                case 'stats': {
                    const db = await readDatabase();
                    const botStats = db.bot || {};
                    const totalUsers = Object.keys(db.users || {}).length;
                    const activePremiums = Object.values(db.users || {}).filter(u => {
                        const prem = premiumManager.getActivePremium(u);
                        return prem.isActive;
                    }).length;

                    let statsText = `📊 *STATISTIK BOT ${config.botName}*\n\n`;
                    statsText += ` • Total Pengguna Terdaftar: ${totalUsers}\n`;
                    statsText += ` • Total Pengguna Premium Aktif: ${activePremiums}\n`;
                    statsText += ` • Total Perintah Digunakan: ${botStats.totalCommandsUsed || 0}\n`;
                    statsText += ` • Bot Aktif Sejak: ${moment(botStats.startTime).tz('Asia/Jakarta').format('DD MMM YYYY, HH:mm')}\n`;
                    statsText += ` • Mode Bot Saat Ini: ${db.bot.mode || config.botMode}\n`;
                    // Spek VPS
                    const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
                    const freeMemGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
                    statsText += `\n💻 *Info Server:*\n`;
                    statsText += ` • Platform: ${os.platform()} (${os.arch()})\n`;
                    statsText += ` • CPU: ${os.cpus()[0].model} (${os.cpus().length} cores)\n`;
                    statsText += ` • RAM: ${freeMemGB}GB Free / ${totalMemGB}GB Total\n`;
                    statsText += ` • Uptime Server: ${formatTime(os.uptime())}\n`; // Uptime OS, bukan bot

                    await sock.sendMessage(jid, { text: statsText }, { quoted: msg });
                    break;
                }

                case 'listusers': {
                    const page = parseInt(subArgs[0]) || 1;
                    const usersPerPage = 10;
                    const allDbUsers = Object.values(await getAllUsers()).sort((a,b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)); // Urutkan berdasarkan interaksi terakhir
                    
                    const startIndex = (page - 1) * usersPerPage;
                    const endIndex = page * usersPerPage;
                    const paginatedUsers = allDbUsers.slice(startIndex, endIndex);

                    if (paginatedUsers.length === 0) return sock.sendMessage(jid, { text: `Gak ada user di halaman ${page}.`}, { quoted: msg });

                    let listText = `👥 *DAFTAR PENGGUNA (Hal ${page} / ${Math.ceil(allDbUsers.length / usersPerPage)})*\n\n`;
                    paginatedUsers.forEach((u, index) => {
                        const prem = premiumManager.getActivePremium(u);
                        listText += `${startIndex + index + 1}. @${u.jid.split('@')[0]} (${u.username})\n`;
                        listText += `   Tier: ${prem.tier} ${prem.isActive ? '(Aktif)' : ''}\n`;
                        listText += `   Koin: ${u.coin}, Energi: ${u.energy}\n`;
                        listText += `   Level: ${u.level}, EXP: ${u.exp}\n`;
                        listText += `   Terakhir Aktif: ${moment(u.lastMessageTime).tz('Asia/Jakarta').fromNow()}\n\n`;
                    });
                    listText += `Ketik ${prefix}adminpanel listusers ${page + 1} untuk halaman selanjutnya.`;
                    await sock.sendMessage(jid, { text: listText, mentions: paginatedUsers.map(u => u.jid) }, { quoted: msg });
                    break;
                }

                case 'restart': {
                    await sock.sendMessage(jid, { text: "🚀 Siap, bos! Bot lagi di-restart..." }, { quoted: msg });
                    console.log("[AdminPanel] Perintah restart diterima. Merestart bot...");
                    await delay(2000);
                    process.exit(1); // PM2 atau sistem serupa akan merestart
                    break;
                }

                default:
                    await sock.sendMessage(jid, { text: `Sub-perintah "${subCommand}" kaga dikenal. Ketik ${prefix}adminpanel buat liat listnya.` }, { quoted: msg });
            }
        } catch (error) {
            console.error(`[AdminPanel] Error di subcommand ${subCommand}:`, error);
            await sock.sendMessage(jid, { text: `Waduh, ada error pas jalanin ${subCommand}: ${error.message}` }, { quoted: msg });
        }
    }
};