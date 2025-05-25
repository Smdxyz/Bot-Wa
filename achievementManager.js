// achievementManager.js
const achievementsList = require('./achievements');
const { getUser, updateUser, addCoin, addExp } = require('./userDatabase');
const config = require('./config');

async function checkAndGrantAchievements(sock, jid) {
    const user = await getUser(jid);
    if (!user) {
        console.warn(`[AchievementManager] User ${jid} tidak ditemukan saat cek achievement.`);
        return;
    }

    let newAchievementsGrantedDetails = [];

    for (const achId in achievementsList) {
        if (user.achievements && user.achievements.includes(achId)) {
            continue; // User sudah memiliki achievement ini
        }

        const achievement = achievementsList[achId];
        try {
            if (achievement.criteria(user)) { // Panggil fungsi criteria dengan data user
                const currentAchievements = user.achievements || [];
                currentAchievements.push(achId);
                await updateUser(jid, { achievements: currentAchievements });
                user.achievements = currentAchievements; // Update local copy

                newAchievementsGrantedDetails.push(achievement);

                // Berikan reward jika ada
                let rewardMessagePart = "";
                if (achievement.reward) {
                    if (typeof achievement.reward.coin === 'number' && achievement.reward.coin > 0) {
                        await addCoin(jid, achievement.reward.coin);
                        rewardMessagePart += `  - 🪙 ${achievement.reward.coin} Coin\n`;
                    }
                    if (typeof achievement.reward.exp === 'number' && achievement.reward.exp > 0) {
                        await addExp(jid, achievement.reward.exp); // addExp akan menangani notifikasi level up jika terjadi
                        rewardMessagePart += `  - ✨ ${achievement.reward.exp} EXP\n`;
                    }
                    // Tambahkan reward lain jika ada (misalnya item, energi)
                }
                achievement.rewardMessagePart = rewardMessagePart; // Simpan untuk notifikasi
                console.log(`[AchievementManager] User ${jid} mendapatkan achievement: ${achievement.name}`);
            }
        } catch (error) {
            console.error(`[AchievementManager] Error saat memeriksa kriteria achievement '${achId}' untuk user ${jid}:`, error);
        }
    }

    if (newAchievementsGrantedDetails.length > 0 && config.achievementSettings.notifyUserOnUnlock) {
        for (const ach of newAchievementsGrantedDetails) {
            let message = `🎉 *Achievement Terbuka!* 🎉\n\n`;
            message += `Selamat @${jid.split('@')[0]}, kamu mendapatkan achievement:\n`;
            message += `*${ach.name}*\n`;
            message += `_${ach.description}_\n`;
            if (ach.rewardMessagePart && ach.rewardMessagePart.trim() !== "") {
                message += `\n*Hadiah Diterima:*\n${ach.rewardMessagePart}`;
            }
            try {
                await sock.sendMessage(jid, { // Kirim notifikasi ke JID user langsung
                    text: message,
                    mentions: [jid]
                });
            } catch (notifyError) {
                console.error(`[AchievementManager] Gagal mengirim notifikasi achievement ke ${jid}:`, notifyError);
            }
        }
    }
}

module.exports = { checkAndGrantAchievements };