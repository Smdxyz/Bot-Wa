// commands/remini.js
const axios = require('axios');
const uploadImage = require('../utils/uploadImage');
const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  NamaFitur: 'Remini AI Enhancer',
  Callname: 'remini',
  Kategori: 'Media',
  SubKategori: 'Enhance',
  ReqEnergy: 5,
  ReqTier: null,
  ReqCoin: 'n',
  CostCoin: 0,
  Deskripsi: 'Meningkatkan kualitas gambar dengan AI (enhance, recolor, atau dehaze).',
  async execute(sock, msg, commands, { mediaType, isActive, tier, multiplier, apiKey }) {
    const jid = msg.key.remoteJid;
    const messageType = getContentType(msg.message);
    const replyMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const args = msg.message?.conversation?.split(' ') || [];
    const method = args[1] || 'enhance'; // Default ke "enhance" jika tidak ada metode

    console.log(`[remini] Processing method: ${method}`);

    let imageUrl = null;
    let uploadUrl = null; // URL gambar yang diupload ke hosting

    if (replyMsg && getContentType(replyMsg) === 'imageMessage') {
      // Jika mereply gambar
      try {
        const stream = await downloadContentFromMessage(replyMsg.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        uploadUrl = await uploadImage(buffer); // Upload ke hosting dan dapatkan URL
      } catch (error) {
        console.error('[remini] Error downloading image:', error);
        return await sock.sendMessage(jid, { text: '❌ Gagal mengambil gambar dari pesan yang direply.' });
      }
    } else if (messageType === 'imageMessage') {
      // Jika user mengirim gambar langsung
      try {
        const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        uploadUrl = await uploadImage(buffer); // Upload ke hosting dan dapatkan URL
      } catch (error) {
        console.error('[remini] Error downloading user image:', error);
        return await sock.sendMessage(jid, { text: '❌ Gagal mengunggah gambar yang dikirim.' });
      }
    } else if (args.length > 1 && args[1].startsWith('http')) {
      // Jika pengguna langsung memberikan URL gambar
      uploadUrl = args[1]; // Anggap sebagai URL yang sudah diupload
    } else {
      return await sock.sendMessage(jid, { text: '❌ Silakan kirim gambar, reply gambar, atau berikan URL gambar.' });
    }

    if (!uploadUrl) {
      return await sock.sendMessage(jid, { text: '❌ Gagal mendapatkan URL gambar.' });
    }

    // Kirim pesan awal (⏳ Memproses...)
    let processingMessage = await sock.sendMessage(jid, { text: `⏳ Memproses...` });

    // Animasi Gacor
    const updateProgress = async (text) => {
      const animationFrames = ['(⌐■_■)', '(•_• )', '( >_>)', '(•_• )', '(⌐■_■)'];
      let currentFrame = 0;
      let textArray = text.split('');

        for (let i = 0; i < textArray.length; i++) {
            const frame = animationFrames[currentFrame];
            const newText = textArray.slice(0, i + 1).join('');
            const fullText = `${frame} ${newText}`;

            processingMessage = await sock.sendMessage(jid, {
                edit: processingMessage.key,
                text: fullText,
            });

            currentFrame = (currentFrame + 1) % animationFrames.length;
            await new Promise((resolve) => setTimeout(resolve, 75)); // Delay 75ms
        }

        return processingMessage;
    };

    try {
      const progressText = `✨ Memproses gambar dengan metode *${method}* ✨`;
      processingMessage = await updateProgress(progressText);

      await sock.sendMessage(jid, {
        edit: processingMessage.key,
        text: `⬆️ Mengirim gambar ke Remini AI...`,
      });

      // Kirim URL yang *sudah* diupload ke API Remini
      const apiUrl = `https://sannpanel.my.id/remini?url=${encodeURIComponent(uploadUrl)}&method=${method}`;
       let enhancedImageUrl = null;
        try {
            const response = await axios.get(apiUrl, {
                headers: { 'x-api-key': 'ramadhan7' } // Tambahkan header API Key
            });
            enhancedImageUrl = response.data.url;
        } catch (apiError) {
            console.error(`[remini] Remini API Error: ${apiError}`);
            await sock.sendMessage(jid, {
            edit: processingMessage.key,
                text: `❌ API Remini bermasalah`,
            });
            return;
        }

      if (enhancedImageUrl) {

        // Kirim gambar hasil Remini sebagai gambar langsung
        await sock.sendMessage(jid, {
          image: { url: enhancedImageUrl },
          caption: `✅ *Gambar berhasil diproses dengan metode ${method}* ✅`,
        });

        // Hapus pesan progres setelah selesai
        await sock.sendMessage(jid, { delete: processingMessage.key });

      } else {
        await sock.sendMessage(jid, {
          edit: processingMessage.key,
          text: `❌ Gagal memproses gambar.`,
        });
      }
    } catch (error) {
      console.error(`[remini] Error: ${error}`);
      await sock.sendMessage(jid, {
        edit: processingMessage.key,
        text: `❌ Terjadi kesalahan saat memproses gambar.`,
      });
    }
  },
};