// handlers/messageHandler.js
const config = require('../config');
const { getUser, createUser, updateUser, addExp } = require('../userDatabase');
const { getActivePremium } = require('../premiumManager');
// const fs = require('fs/promises'); // fs/promises tidak digunakan lagi setelah RineAI dihapus, kecuali ada keperluan lain
// const path = require('path'); // path tidak digunakan lagi setelah RineAI dihapus, kecuali ada keperluan lain

const handleMessageUpsert = async (sock, commands, m) => {
    try {
        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key && msg.key.remoteJid === 'status@broadcast') return;
        if (msg.key.fromMe) return;
        if (msg.key.remoteJid.endsWith('@newsletter')) return;

        const jid = msg.key.remoteJid;
        const senderJid = msg.key.participant || jid;
        let user = await getUser(senderJid);

        if (!user) {
            const waUsername = await sock.getWaUsername(msg, senderJid);
            await createUser(senderJid, waUsername);
            user = await getUser(senderJid); // Ambil data user yang baru dibuat
            console.log(`User baru dibuat: ${senderJid} dengan username: ${waUsername}`);
        } else {
            const waUsername = await sock.getWaUsername(msg, senderJid);
            if (waUsername && user.username !== waUsername) {
                await updateUser(senderJid, { username: waUsername });
                user = await getUser(senderJid); // Ambil data user yang baru diupdate
                console.log(`Username user ${senderJid} diperbarui menjadi: ${waUsername}`);
            }
        }

        // Pastikan 'user' tidak null sebelum mencoba mengakses propertinya
        if (!user) {
            console.warn(`[messages.upsert] User ${senderJid} tidak ditemukan setelah proses create/update. Skipping.`);
            return;
        }

        const { isActive, tier, multiplier } = getActivePremium(user);

        // Ambil pesan
        const type = Object.keys(msg.message)[0];
        let text = '';

        if (type === 'conversation') {
            text = msg.message.conversation;
        } else if (type === 'extendedTextMessage') {
            text = msg.message.extendedTextMessage.text;
        } else if (type === 'imageMessage' && msg.message.imageMessage.caption) {
            text = msg.message.imageMessage.caption;
            console.log(`[messages.upsert] Pesan adalah caption gambar: ${text}`);
        } else if (type === 'videoMessage' && msg.message.videoMessage.caption) {
            text = msg.message.videoMessage.caption;
            console.log(`[messages.upsert] Pesan adalah caption video: ${text}`);
        }

        console.log(`[messages.upsert] Pesan diterima: ${text || '*Pesan media tanpa teks*'}, Tipe: ${type}, Dari: ${senderJid}`);

        // Cek apakah pesan dari tombol
        let commandName = null;
        if (text) { // Hanya proses parsing JSON jika text ada
            try {
                const parsedData = JSON.parse(text);
                if (parsedData && parsedData.command) { // Tambah pengecekan parsedData
                    commandName = parsedData.command.toLowerCase();
                    console.log(`[messages.upsert] Pesan dari tombol, command: ${commandName}`);
                }
            } catch (error) {
                // Bukan pesan tombol atau JSON tidak valid, biarkan saja
            }
        }


        // Proses Command
        if (commandName || (text && text.startsWith(config.botPrefix))) {
            if (!commandName) {
                commandName = text.slice(config.botPrefix.length).split(' ')[0].toLowerCase();
            }
            const command = commands.get(commandName);

            if (command) {
                console.log(`[messages.upsert] Command ditemukan: ${commandName}`);
                try {
                    if (typeof command.execute === 'function') {
                        console.log(`[messages.upsert] Memanggil command.execute untuk: ${commandName}`);
                        await command.execute(sock, msg, commands, { isActive, tier, multiplier, mediaType: type });
                        console.log(`[messages.upsert] command.execute berhasil dieksekusi: ${commandName}`);
                    } else {
                        console.warn(`[messages.upsert] command.execute bukan fungsi untuk: ${commandName}`);
                        await sock.sendMessage(jid, { text: `Terjadi kesalahan: command.execute bukan fungsi untuk ${commandName}` });
                    }
                } catch (error) {
                    console.error(`[messages.upsert] Error handling command '${commandName}':`, error);
                    await sock.sendMessage(jid, { text: `Terjadi kesalahan saat memproses perintah ${commandName}: ${error.message || error}` });
                }
            } else {
                console.log(`[messages.upsert] Command tidak ditemukan: ${commandName}`);
                await sock.sendMessage(jid, { text: `Command "${commandName}" tidak ditemukan. Ketik ${config.botPrefix}menu untuk melihat daftar command.` });
            }
        } else {
            // Ini adalah blok untuk pesan biasa (bukan command)
            // Tidak ada lagi logic RineAI di sini.
            // Bisa ditambahkan logic lain jika perlu, misal auto-reply atau logging khusus.
            if (text && text.trim().length > 0) { // Hanya log jika ada teks
                 console.log(`[messages.upsert] Pesan biasa diterima (bukan command): "${text}" dari ${senderJid}`);
            }
            // Jika mau ada balasan otomatis atau apa, bisa ditaruh di sini.
            // Contoh:
            // if (text === 'halo') {
            //     await sock.sendMessage(jid, { text: 'Halo juga!' });
            // }
        }

        // Tambahkan EXP setiap pesan diterima (jika user valid)
        if (user && senderJid) { // Pastikan senderJid juga ada
            const expGain = 0.000010; // Sesuaikan jika perlu
            const leveledUp = await addExp(senderJid, expGain);
            if (leveledUp) {
                const updatedUser = await getUser(senderJid); // Ambil data user terbaru setelah naik level
                if (updatedUser) { // Pastikan user masih ada
                    const levelUpMessage = `🎉 Selamat @${senderJid.split('@')[0]}! Anda naik level menjadi *Level ${updatedUser.level}*!\nAnda mendapatkan 🪙50 coin dan ⚡25 energy!`;
                    await sock.sendMessage(senderJid, { // Kirim ke senderJid (personal)
                        text: levelUpMessage,
                        mentions: [senderJid]
                    });
                }
            }
        }

    } catch (error) {
        console.error("Error in messages.upsert:", error);
        // Pertimbangkan untuk tidak mengirim pesan error ke user di sini, karena bisa jadi error sistemik.
        // Cukup log saja, atau kirim notifikasi ke admin.
    }
};

module.exports = { handleMessageUpsert };module.exports = { handleMessageUpsert };
