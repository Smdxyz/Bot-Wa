// commandManager.js
const { getUser, updateUser, addCoin, addEnergy } = require('./userDatabase'); // addCoin, addEnergy untuk pengurangan
const { getActivePremium } = require('./premiumManager');
const { readDatabase, writeDatabase } = require('./utils/utils');
const config = require('./config'); // Untuk default energy cost

async function executeCommand(sock, msg, command, jid, userArgs) { // Tambah sock, msg, userArgs
    try {
        let user = await getUser(jid);

        if (!user) {
            // Seharusnya user sudah dibuat di messageHandler, tapi sebagai fallback
            console.warn(`[CommandManager] User ${jid} not found during command execution. Attempting to create.`);
            const waUsername = await sock.getWaUsername(msg, jid);
            user = await createUser(jid, waUsername);
            if (!user) {
                 return { success: false, message: "User not found and failed to create." };
            }
        }

        // Cek apakah user diban
        if (user.isBanned) {
            return { success: false, message: `Anda telah diblokir dari penggunaan bot. Alasan: ${user.banReason || 'Tidak ada alasan'}` };
        }

        const { ReqEnergy, ReqTier, ReqCoin, CostCoin, Callname, Kategori } = command;
        const premiumInfo = getActivePremium(user);

        // Cek Tier Premium
        if (ReqTier) {
            const requiredTierLevel = config.premiumTiers[ReqTier]?.level || 0;
            const userTierLevel = config.premiumTiers[premiumInfo.tier]?.level || 0;
            if (userTierLevel < requiredTierLevel) {
                return { success: false, message: `Command ini membutuhkan tier premium minimal *${ReqTier}*. Tier Anda saat ini: *${premiumInfo.tier}*.` };
            }
        }

        // Cek Energi
        const energyToConsume = ReqEnergy || config.energyCostPerCommand; // Gunakan default jika ReqEnergy tidak diset
        if (user.energy < energyToConsume && energyToConsume > 0) { // Hanya cek jika energi dibutuhkan
            return { success: false, message: `Energi tidak mencukupi! Anda memerlukan ${energyToConsume} energi, tersisa ${user.energy}.` };
        }

        // Cek Coin (jika command membutuhkan pembayaran coin)
        if (ReqCoin === 'y' && CostCoin > 0) {
            if (user.coin < CostCoin) {
                return { success: false, message: `Coin tidak mencukupi! Anda memerlukan ${CostCoin} coin, tersisa ${user.coin}.` };
            }
        }

        // Pengurangan resource (Energi dan Coin)
        const updateData = {};
        if (energyToConsume > 0) {
            // await updateUser(jid, { energy: user.energy - energyToConsume }); // Cara lama
            await addEnergy(jid, -energyToConsume); // Cara baru, addEnergy menangani nilai negatif
            user.energy -= energyToConsume; // Update local copy
        }
        if (ReqCoin === 'y' && CostCoin > 0) {
            // await updateUser(jid, { coin: user.coin - CostCoin }); // Cara lama
            await addCoin(jid, -CostCoin); // Cara baru, addCoin menangani nilai negatif
            user.coin -= CostCoin; // Update local copy
        }

        // Catat penggunaan command
        const updatedCommandsUsed = { ...(user.commandsUsed || {}) };
        updatedCommandsUsed[Callname] = (updatedCommandsUsed[Callname] || 0) + 1;
        // updateData.commandsUsed = updatedCommandsUsed; // Ini akan dihandle oleh updateUser di bawah

        await updateUser(jid, { commandsUsed: updatedCommandsUsed }); // Update penggunaan command

        // Update statistik bot
        await updateBotStatsOnCommandUse();

        // Ambil data user terbaru setelah semua update
        const updatedUser = await getUser(jid);

        return { success: true, message: "Command berhasil diproses.", user: updatedUser };

    } catch (error) {
        console.error(`[CommandManager] Error executing command '${command?.Callname}' for ${jid}:`, error);
        return { success: false, message: "Terjadi kesalahan internal saat menjalankan perintah." };
    }
}

async function updateBotStatsOnCommandUse() {
    try {
        let db = await readDatabase();
        if (!db.bot) db.bot = { totalUsers: 0, totalCommandsUsed: 0 }; // Inisialisasi jika belum ada
        db.bot.totalCommandsUsed = (db.bot.totalCommandsUsed || 0) + 1;
        await writeDatabase(db);
    } catch (error) {
        console.error("[CommandManager] Error updating bot stats:", error);
    }
}


module.exports = {
    executeCommand,
};