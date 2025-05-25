// energyRegenManager.js
const { getUser, updateUser, addEnergy } = require('./userDatabase');
const config = require('./config');
const { getActivePremium } = require('./premiumManager');

async function regenerateUserEnergy(jid) {
    if (!config.energyRegenSettings || !config.energyRegenSettings.enabled) return;

    const user = await getUser(jid);
    if (!user) return;

    const premiumInfo = getActivePremium(user);
    const tierName = premiumInfo.tier || "Super Kere";
    // Ambil pengaturan tier, fallback ke Super Kere jika tier tidak ada, lalu ke objek kosong jika Super Kere pun tidak ada
    const tierSettings = config.premiumTiers[tierName] || config.premiumTiers["Super Kere"] || {};

    const regenAmountPerInterval = tierSettings.energyRegenAmount || config.energyRegenSettings.defaultRegenAmount || 1;
    const maxEnergyForUser = user.maxEnergy || tierSettings.maxEnergy || config.defaultMaxEnergy || 100;


    if (typeof regenAmountPerInterval !== 'number' || regenAmountPerInterval <= 0) {
        return;
    }
    if (typeof maxEnergyForUser !== 'number') {
        console.warn(`[EnergyRegen] Batas maksimum energi tidak valid untuk user ${jid} (tier: ${tierName}).`);
        return;
    }

    const now = Date.now();
    const intervalMillis = (config.energyRegenSettings.intervalMinutes || 5) * 60 * 1000;
    const lastRegenTime = user.lastEnergyRegenTime ? new Date(user.lastEnergyRegenTime).getTime() : 0;

    if (now - lastRegenTime >= intervalMillis) {
        const currentEnergy = user.energy || 0;

        if (currentEnergy < maxEnergyForUser) {
            let amountToAdd = regenAmountPerInterval;
            // Jangan sampai melebihi maxEnergyForUser
            if (currentEnergy + amountToAdd > maxEnergyForUser) {
                amountToAdd = maxEnergyForUser - currentEnergy;
            }

            if (amountToAdd > 0) {
                // addEnergy sudah menghandle agar tidak melebihi maxEnergy user tersebut
                const success = await addEnergy(jid, amountToAdd);
                if (success) {
                    await updateUser(jid, { lastEnergyRegenTime: new Date().toISOString() });
                    const updatedUser = await getUser(jid); // Ambil energi terbaru
                    console.log(`[EnergyRegen] User ${jid} (Tier: ${tierName}) meregenerasi ${amountToAdd} energi. Total sekarang: ${updatedUser.energy}/${maxEnergyForUser}`);
                }
            } else {
                // Jika amountToAdd jadi 0 (karena sudah pas max), tetap update waktu
                await updateUser(jid, { lastEnergyRegenTime: new Date().toISOString() });
            }
        } else {
            // Jika sudah max, update waktu agar tidak spam cek
             await updateUser(jid, { lastEnergyRegenTime: new Date().toISOString() });
        }
    }
}

module.exports = { regenerateUserEnergy };