// handlers/messageHandler.js
const config = require('../config');
const { getUser, createUser, updateUser, addExp } = require('../userDatabase');
const { getActivePremium } = require('../premiumManager');
// const { handleRineAIResponse } = require('../rineAI'); // HAPUS INI
const fs = require('fs/promises');
const path = require('path');

// const conversationHistoryDir = path.join(__dirname, 'rine_conversations'); // HAPUS INI

// // Helper function to ensure directory exists synchronously // HAPUS BLOK INI
// function ensureDirSync(dirPath) {
//     try {
//         fs.access(dirPath);
//     } catch (error) {
//         if (error.code === 'ENOENT') {
//             fs.mkdir(dirPath, { recursive: true }, (err) => {
//                 if (err) throw err;
//             });
//         } else {
//             throw error;
//         }
//     }
// }
// ensureDirSync(conversationHistoryDir); // HAPUS INI

// // Fungsi untuk mendapatkan atau membuat file riwayat percakapan // HAPUS BLOK INI
// async function getConversationHistory(adminJid) {
//     const filePath = path.join(conversationHistoryDir, `${adminJid.split('@')[0]}.json`);
//     try {
//         const data = await fs.readFile(filePath, 'utf8');
//         return JSON.parse(data);
//     } catch (error) {
//         if (error.code === 'ENOENT') {
//             console.log(`Membuat file riwayat percakapan baru untuk ${adminJid}`);
//             const initialHistory = { history: [] };
//             await fs.writeFile(filePath, JSON.stringify(initialHistory, null, 2), 'utf8');
//             return initialHistory;
//         } else {
//             console.error(`Error membaca/membuat file riwayat percakapan untuk ${adminJid}:`, error);
//             return { history: [] };
//         }
//     }
// }

// // Fungsi untuk menyimpan riwayat percakapan // HAPUS BLOK INI
// async function saveConversationHistory(adminJid, history) {
//     const filePath = path.join(conversationHistoryDir, `${adminJid.split('@')[0]}.json`);
//     try {
//         await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf8');
//     } catch (error) {
//         console.error(`Error menyimpan file riwayat percakapan untuk ${adminJid}:`, error);
//     }
// }

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
            user = await getUser(senderJid);
            console.log(`User baru dibuat: ${senderJid} dengan username: ${waUsername}`);
        } else {
            const waUsername = await sock.getWaUsername(msg, senderJid);
            if (waUsername && user.username !== waUsername) {
                await updateUser(senderJid, { username: waUsername });
                user = await getUser(senderJid);
                console.log(`Username user ${senderJid} diperbarui menjadi: ${waUsername}`);
            }
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

        console.log(`[messages.upsert] Pesan diterima: ${text}, Tipe: ${type}`);

        // Cek apakah pesan dari tombol
        let commandName = null;
        try {
            const parsedData = JSON.parse(text); // Coba parse pesan sebagai JSON
            if (parsedData.command) {
                commandName = parsedData.command.toLowerCase(); // Ambil nama command
                console.log(`[messages.upsert] Pesan dari tombol, command: ${commandName}`);
            }
        } catch (error) {
            // Bukan pesan tombol
        }

        // Proses Command
        if (commandName || (text && text.startsWith(config.botPrefix))) {
            if (!commandName) {
                // Kalau bukan dari tombol, ambil dari prefix
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
                    console.error("[messages.upsert] Error handling command:", error);
                    await sock.sendMessage(jid, { text: `Terjadi kesalahan saat memproses perintah: ${error}` });
                }
            } else {
                console.log(`[messages.upsert] Command tidak ditemukan: ${commandName}`);
                await sock.sendMessage(jid, { text: `Command "${commandName}" tidak ditemukan.` });
            }
        }
        // tambahin disini ya supaya bisa proses pesan dari rine ai dan command
        else {
-            // Cek apakah pesan dari admin dan tidak mengandung prefix command // HAPUS BLOK INI
-            const isAdmin = config.adminNumber.split(',').map(num => num.trim()).includes(senderJid.split('@')[0]);
-            if (isAdmin && !text.startsWith(config.botPrefix) && text) {
-                console.log(`[RineAI] Pesan dari admin (${senderJid}) tanpa prefix, memproses dengan Rine AI.`);
-
-                // Dapatkan riwayat percakapan dari file
-                const conversationHistoryData = await getConversationHistory(senderJid);
-                const conversationHistory = conversationHistoryData.history;
-
-                try {
-                    // Kirim pesan ke Rine AI
-                    const rineResponse = await handleRineAIResponse(text, conversationHistory); // Hapus imageUrl
-
-                    // Kirim respons Rine AI ke admin
-                    await sock.sendMessage(jid, { text: rineResponse });
-
-                    // Simpan pesan pengguna dan respons Rine AI ke dalam riwayat
-                    conversationHistory.push({ role: 'user', parts: [{ text: text }] });
-                    conversationHistory.push({ role: 'model', parts: [{ text: rineResponse }] });
-
-                    // Batasi panjang riwayat percakapan
-                    if (conversationHistory.length > 20) {
-                        conversationHistory.splice(0, conversationHistory.length - 20);
-                    }
-
-                    await saveConversationHistory(senderJid, { history: conversationHistory });
-
-                    console.log(`[RineAI] Respons dikirim ke admin (${senderJid}) dan riwayat diperbarui.`);
-                } catch (error) {
-                    console.error("[RineAI] Error memproses dengan Rine AI:", error);
-                    await sock.sendMessage(jid, { text: `Terjadi kesalahan saat memproses dengan Rine AI: ${error}` });
-                }
-            } else {
-                console.log(`[messages.upsert] Pesan bukan command: ${text}`);
-                // await sock.sendMessage(jid, { text: "Saya menerima pesan Anda!" });
-            }
+            // Blok ini tadinya buat RineAI. Sekarang udah dihapus.
+            // Kalau mau ada perlakuan khusus buat pesan biasa (bukan command), bisa ditambahin di sini.
+            // Contoh: cuma nge-log, atau kalau pesan dari admin bisa ngapain gitu.
+            // Untuk sekarang, kita biarin aja, jadi pesan biasa gak akan diapa-apain kecuali EXP.
+            console.log(`[messages.upsert] Pesan bukan command dan bukan dari admin untuk AI: ${text}`);
        }

        // Tambahkan EXP setiap pesan diterima
        const expGain = 0.000010; // Mungkin mau disesuaikan lagi biar gak terlalu kecil?
        const leveledUp = await addExp(senderJid, expGain);
        if (leveledUp) {
            user = await getUser(senderJid); // Ambil data user terbaru setelah naik level
            const levelUpMessage = `\n  Selamat @${senderJid.split('@')[0]}! Anda naik level menjadi ${user.level}!  \nAnda mendapatkan 50 coin dan 25 energy!`;
            await sock.sendMessage(senderJid, { 
                text: levelUpMessage,
                mentions: [senderJid] // Tambahin mention biar lebih personal
            });
        }
    } catch (error) {
        console.error("Error in messages.upsert:", error);
    }
};

module.exports = { handleMessageUpsert };