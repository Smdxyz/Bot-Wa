// commands/tiktok.js
const axios = require('axios');

module.exports = {
    NamaFitur: 'TikTok Downloader',
    Callname: 'ttdl',
    Kategori: 'Media',
    SubKategori: 'Download',
    ReqEnergy: 5,
    ReqTier: null,
    ReqCoin: 'n',
    CostCoin: 0,
    Deskripsi: 'Mengunduh video atau foto dari TikTok.',
    execute: async function (sock, msg, commands, { isActive, tier, multiplier, mediaType, apiKey }) {
        const jid = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const args = text.split(' ');
        const url = args[1];

        console.log(`[${this.Callname}] Premium Data: { isActive: ${isActive}, tier: ${tier}, multiplier: ${multiplier} }`);

        if (!url) {
            return await sock.sendMessage(jid, { text: '❌ Silakan masukkan URL video TikTok.' });
        }

        if (!url.includes('tiktok.com')) {
            return await sock.sendMessage(jid, { text: '⚠️ URL tidak valid. Hanya menerima URL dari TikTok.' });
        }

        // Kirim pesan awal (⏳ Memproses...)
        let processingMessage = await sock.sendMessage(jid, { text: '⏳ Memproses permintaan Anda...' });

        // Update animasi pesan progres
          const updateProgress = async (text) => {
              const animationFrames = ['(づ｡◕‿‿◕｡)づ', '(づ￣ ³￣)づ', '(づ｡◕‿‿◕｡)づ'];
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
            processingMessage = await updateProgress('🔄 Mengambil data dari TikTok...');

            const apiUrl = `https://sannpanel.my.id/tiktok?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, {
                headers: { 'x-api-key': 'ramadhan7' } // Tambahkan header API Key
            });
            const data = response.data;

            if (!data.status) {
                return await updateProgress('❌ Gagal mengambil data TikTok.');
            }

            processingMessage = await updateProgress('📥 Mengunduh media...');

            const captionText = `🎵 *Judul:* ${data.title}\n👤 *Author:* ${data.author.nickname} (@${data.author.fullname})\n📅 *Tanggal:* ${data.taken_at}\n📍 *Region:* ${data.region}\n\n👀 *Views:* ${data.stats.views}\n❤️ *Likes:* ${data.stats.likes}\n💬 *Comments:* ${data.stats.comment}\n🔄 *Shares:* ${data.stats.share}\n📥 *Downloads:* ${data.stats.download}`;

            // Kirim caption
            await sock.sendMessage(jid, { text: captionText });

            // Cek apakah post berisi video atau foto
            let mediaSent = false;
            if (data.data.length > 0) {
                for (let media of data.data) {
                    if (media.type === 'nowatermark_hd' || media.type === 'nowatermark') {
                        // Kirim video
                        await sock.sendMessage(jid, {
                            video: { url: media.url },
                            caption: captionText,
                            mimetype: 'video/mp4',
                            contextInfo: {
                                externalAdReply: {
                                    title: data.title,
                                    body: `Video oleh @${data.author.nickname}`,
                                    showAdAttribution: true,
                                    mediaType: 2,
                                    thumbnailUrl: data.cover,
                                    mediaUrl: url,
                                },
                            },
                        });
                        mediaSent = true;
                        break;
                    }
                }

                if (!mediaSent) {
                    // Kirim foto jika hanya terdapat foto
                    for (let media of data.data) {
                        if (media.type === 'photo') {
                            await sock.sendMessage(jid, { image: { url: media.url }, caption: captionText });
                            mediaSent = true;
                        }
                    }
                }
            }

            if (!mediaSent) {
                await updateProgress('❌ Tidak ditemukan media yang bisa diunduh.');
            }

            // Hapus pesan progres setelah selesai
            await sock.sendMessage(jid, { delete: processingMessage.key });

        } catch (error) {
            console.error(`[${this.Callname}] Error : ${error}`);
            await sock.sendMessage(jid, { text: '❌ Terjadi kesalahan saat memproses permintaan ini.' });
             if (processingMessage && processingMessage.key) {
                await sock.sendMessage(jid, { delete: processingMessage.key });
             }
        } finally {
            await sock.sendPresenceUpdate('paused', jid);
        }
    }
};