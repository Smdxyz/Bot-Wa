// handlers/messageHandler.js
const config = require('../config');
const { getUser, createUser, updateUser, addExp } = require('../userDatabase');
const { getActivePremium } = require('../premiumManager');
const { executeCommand } = require('../commandManager');
const { checkAndGrantAchievements } = require('../achievementManager');
const { regenerateUserCoins } = require('../coinRegenManager');
const { regenerateUserEnergy } = require('../energyRegenManager');

const handleMessageUpsert = async (sock, commands, m) => {
    try {
        const msg = m.messages[0];
        if (!msg.message ||
            (msg.key && msg.key.remoteJid === 'status@broadcast') ||
            (msg.key.fromMe && !config.processOwnMessages) ||
            (msg.key.remoteJid && msg.key.remoteJid.endsWith('@newsletter'))
           ) {
            return;
        }

        const jid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid; // participant untuk grup, remoteJid untuk PC
        const senderId = senderJid.split('@')[0];

        // Logika untuk mode 'self'
        if (config.botMode === 'self') {
            const ownerNumbers = config.adminNumber.split(',').map(num => num.trim());
            if (!ownerNumbers.includes(senderId)) {
                // console.log(`[MessageHandler] Mode 'self': Pesan dari ${senderId} (${senderJid}) diabaikan.`);
                return; // Abaikan pesan jika bukan dari owner
            }
        }

        let user = await getUser(senderJid);
        if (!user) {
            const waUsername = await sock.getWaUsername(msg, senderJid);
            user = await createUser(senderJid, waUsername);
            if (!user) {
                console.error(`[MessageHandler] Gagal membuat user untuk ${senderJid}.`);
                return;
            }
            if (config.enableAdReply && config.adReplyConfig && Object.keys(config.adReplyConfig).length > 0) {
                let welcomeText = `👋 Wih, ada anak baru nih, *${user.username}*!\nSelamat datang di *${config.botName}*.\nKetik *${config.botPrefix}menu* buat liat ada apa aja disini!`;
                let welcomeOptions = {
                    text: welcomeText,
                    contextInfo: { externalAdReply: config.adReplyConfig }
                };
                // Kirim ke PC user baru, bukan ke grup jika pesan dari grup
                await sock.sendMessage(senderJid.endsWith('@g.us') ? senderJid : jid, welcomeOptions);
            }
        } else {
            const currentWaUsername = await sock.getWaUsername(msg, senderJid);
            if (user.username !== currentWaUsername && currentWaUsername && !currentWaUsername.includes('@s.whatsapp.net')) {
                await updateUser(senderJid, { username: currentWaUsername });
                user.username = currentWaUsername;
            }
        }

        if (user.isBanned) {
            // Kirim pesan bahwa user dibanned jika mereka mencoba command
            // Untuk pesan biasa, biarkan saja (tidak ada respons)
            // Pesan ban akan dikirim oleh commandManager jika user mencoba command
            return;
        }

        if (config.coinRegenSettings.enabled) await regenerateUserCoins(senderJid);
        if (config.energyRegenSettings && config.energyRegenSettings.enabled) await regenerateUserEnergy(senderJid);
        
        const refreshedUser = await getUser(senderJid);
        if (!refreshedUser) { 
            console.error(`[MessageHandler] User ${senderJid} hilang setelah regenerasi.`); 
            return; 
        }
        user = refreshedUser;

        const now = new Date();
        let userUpdates = {
            messagesSent: (user.messagesSent || 0) + 1,
            lastMessageTime: now.toISOString()
        };
        const currentHour = now.getHours();
        if (currentHour >= 0 && currentHour < 4) {
            userUpdates.commandsUsedCountInNightTime = (user.commandsUsedCountInNightTime || 0) + 1;
        }
        await updateUser(senderJid, userUpdates);
        user = { ...user, ...userUpdates };

        const type = Object.keys(msg.message)[0];
        let text = '';
        let userArgs = [];
        if (type === 'conversation') text = msg.message.conversation;
        else if (type === 'extendedTextMessage') text = msg.message.extendedTextMessage.text;
        else if (type === 'imageMessage' && msg.message.imageMessage.caption) text = msg.message.imageMessage.caption;
        else if (type === 'videoMessage' && msg.message.videoMessage.caption) text = msg.message.videoMessage.caption;
        else if (type === 'buttonsResponseMessage') text = msg.message.buttonsResponseMessage.selectedButtonId;
        else if (type === 'listResponseMessage') text = msg.message.listResponseMessage.singleSelectReply?.selectedRowId || '';
        
        text = text ? text.trim() : "";
        const fullTextArgument = text.split(/ +/).slice(1).join(" ");

        if (text.startsWith(config.botPrefix)) {
            const commandParts = text.slice(config.botPrefix.length).trim().split(/ +/);
            const commandName = commandParts.shift().toLowerCase();
            userArgs = commandParts;
            const command = commands.get(commandName);

            if (command) {
                // Cek ban di commandManager saja, agar pesan ban hanya muncul saat mencoba command
                // const isAdminBot = config.adminNumber.split(',').map(n => n.trim()).includes(senderId); // senderId sudah di-split
                const isAdminBot = config.adminNumber.split(',').map(n => n.trim()).includes(senderId);


                if (command.AdminOnly && !isAdminBot) {
                    await sock.sendMessage(jid, { text: config.adminOnlyMessage }, { quoted: msg }); return;
                }
                if (command.OwnerOnly && !config.adminNumber.split(',').map(n => n.trim())[0] === senderId) { // Hanya owner pertama di config
                    await sock.sendMessage(jid, { text: config.ownerOnlyMessage }, { quoted: msg }); return;
                }
                if (command.GroupOnly && !jid.endsWith('@g.us')) {
                    await sock.sendMessage(jid, { text: config.groupOnlyMessage }, { quoted: msg }); return;
                }
                if (command.PCOnly && jid.endsWith('@g.us')) {
                    await sock.sendMessage(jid, { text: config.pcOnlyMessage }, { quoted: msg }); return;
                }

                const cmdExecutionResult = await executeCommand(sock, msg, command, senderJid, userArgs);
                if (cmdExecutionResult.success) {
                    try {
                        const premiumInfo = getActivePremium(cmdExecutionResult.user || user);
                        const groupMetadata = jid.endsWith('@g.us') ? await sock.groupMetadata(jid).catch(() => null) : null;
                        const senderIsGroupAdmin = groupMetadata ? groupMetadata.participants.find(p => p.id === senderJid)?.admin?.endsWith('admin') || false : false;

                        await command.execute(sock, msg, {
                            args: userArgs, text: fullTextArgument, commandName, jid, senderJid,
                            user: cmdExecutionResult.user || user,
                            commands, isGroup: jid.endsWith('@g.us'),
                            isAdminGroup: senderIsGroupAdmin, isAdminBot: isAdminBot, premiumInfo, mediaType: type,
                        });
                    } catch (execError) {
                        console.error(`[MessageHandler] Error eksekusi '${commandName}' oleh ${senderJid}:`, execError);
                        await sock.sendMessage(jid, { text: config.errorMessage });
                    }
                } else {
                    let replyMsg = cmdExecutionResult.message;
                    if (replyMsg.includes("Energi tidak mencukupi")) replyMsg = config.notEnoughEnergyMessage;
                    else if (replyMsg.includes("Coin tidak mencukupi")) replyMsg = config.notEnoughCoinMessage;
                    else if (replyMsg.includes("membutuhkan tier premium")) replyMsg = config.premiumOnlyMessage;
                    else if (replyMsg.includes("telah diblokir")) replyMsg = config.userBannedMessage.replace("Alasan: Tidak ada alasan", `Alasan: ${cmdExecutionResult.user?.banReason || 'Tidak ada alasan'}`);

                    await sock.sendMessage(jid, { text: replyMsg }, { quoted: msg });
                }
            }
        }

        if (user && senderJid) {
            const expGain = config.expPerMessage || 0.2;
            if (expGain > 0 && text.length > 3) { // Hanya beri EXP jika pesan lebih dari 3 karakter
                const expResult = await addExp(senderJid, expGain);
                if (expResult.leveledUp) {
                    const updatedUserAfterLevelUp = await getUser(senderJid);
                    if (updatedUserAfterLevelUp) {
                        const levelUpMessage = `🎉 Asiiik, @${senderJid.split('@')[0]}! Loe naik ke *Level ${updatedUserAfterLevelUp.level}*! Hadiah meluncurrr...`;
                        await sock.sendMessage(jid, { text: levelUpMessage, mentions: [senderJid] });
                    }
                }
            }
        }
        await checkAndGrantAchievements(sock, senderJid, { currentTime: new Date() });

    } catch (error) {
        console.error("[MessageHandler] Error fatal di messages.upsert:", error);
    }
};

module.exports = { handleMessageUpsert };