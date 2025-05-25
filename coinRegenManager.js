// coinRegenManager.js
const { getUser, updateUser, addCoin } = require('./userDatabase');
const config = require('./config');
const { getActivePremium } = require('./premiumManager');

async function regenerateUserCoins(jid) {
    if (!config.coinRegenSettings || !config.coinRegenSettings.enabled) return;

    const user = await getUser(jid);
    if (!user) return;

    const premiumInfo = getActivePremium(user);
    const tierName = premiumInfo.tier || "Super Kere"; // Default ke "Super Kere"

    // Pastikan kita mendapatkan pengaturan tier yang valid
    // Jika tierName tidak ada di config.premiumTiers, fallback ke pengaturan "Super Kere"
    const tierSettings = config.premiumTiers[tierName] || config.premiumTiers["Super Kere"];

    // Jika bahkan "Super Kere" tidak ada (seharusnya tidak terjadi jika config benar),
    // maka kita tidak bisa melanjutkan regenerasi untuk koin.
    if (!tierSettings) {
        console.warn(`[CoinRegen] Pengaturan untuk tier "${tierName}" atau default "Super Kere" tidak ditemukan di config.premiumTiers.`);
        return;
    }

    const regenAmountPerInterval = tierSettings.coinRegenAmount; // Ambil langsung dari tierSettings
    const maxCoinFromThisRegen = tierSettings.maxRegenCoin;

    // Periksa apakah nilai-nilai ini valid (angka)
    if (typeof regenAmountPerInterval !== 'number' || regenAmountPerInterval <= 0) {
        // console.log(`[CoinRegen] Tidak ada regenerasi koin untuk tier "${tierName}" (jumlah regen: ${regenAmountPerInterval}).`);
        return;
    }
    if (typeof maxCoinFromThisRegen !== 'number') {
        console.warn(`[CoinRegen] Batas maksimum koin dari regenerasi tidak valid untuk tier "${tierName}".`);
        // Anda bisa memilih untuk tidak meregenerasi atau menggunakan nilai default yang sangat tinggi
        // Untuk sekarang, kita hentikan jika tidak valid.
        return;
    }


    const now = Date.now();
    const intervalMillis = (config.coinRegenSettings.intervalMinutes || 60) * 60 * 1000;
    const lastRegenTime = user.lastCoinRegenTime ? new Date(user.lastCoinRegenTime).getTime() : 0;

    if (now - lastRegenTime >= intervalMillis) {
        const currentCoins = user.coin || 0;

        if (currentCoins < maxCoinFromThisRegen) {
            let amountToAdd = regenAmountPerInterval;
            if (currentCoins + amountToAdd > maxCoinFromThisRegen) {
                amountToAdd = maxCoinFromThisRegen - currentCoins;
            }

            if (amountToAdd > 0) {
                const success = await addCoin(jid, amountToAdd);
                if (success) {
                    await updateUser(jid, { lastCoinRegenTime: new Date().toISOString() });
                    console.log(`[CoinRegen] User ${jid} (Tier: ${tierName}) meregenerasi ${amountToAdd} koin. Total sekarang: ${currentCoins + amountToAdd}/${maxCoinFromThisRegen}`);
                }
            } else {
                await updateUser(jid, { lastCoinRegenTime: new Date().toISOString() });
            }
        } else {
             await updateUser(jid, { lastCoinRegenTime: new Date().toISOString() });
        }
    }
}

module.exports = { regenerateUserCoins };