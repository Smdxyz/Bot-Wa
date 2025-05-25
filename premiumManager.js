// premiumManager.js
const { getUser, updateUser, addCoin } = require('./userDatabase');
const config = require('./config');
const { generateRandomId } = require('./utils/utils'); // Pastikan utils.js mengekspor ini

const redeemCodes = new Map(); // Simpan di memori, atau pertimbangkan database untuk persistensi

async function applyPremium(jid, tierName, durationInDays) {
    const user = await getUser(jid);

    if (!user) {
        return { success: false, message: "User not found" };
    }
    const tier = config.premiumTiers[tierName];
    if (!tier) {
        return { success: false, message: "Invalid Tier" };
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + durationInDays * 24 * 60 * 60 * 1000);

    const updates = {
        premiumTier: tierName,
        premiumEndTime: endTime.toISOString(),
        maxEnergy: tier.maxEnergy, // Update maxEnergy sesuai tier
    };

    // Jika tier juga mempengaruhi properti lain di user (misal, maxCoinRegen), tambahkan di sini
    // if (tier.maxRegenCoin !== undefined) {
    //     updates.maxRegenCoin = tier.maxRegenCoin; // Contoh jika ada
    // }

    await updateUser(jid, updates);

    // Sesuaikan energi user saat ini jika melebihi maxEnergy baru dari tier
    const updatedUser = await getUser(jid); // Ambil user terbaru setelah update
    if (updatedUser && updatedUser.energy > tier.maxEnergy) {
        await updateUser(jid, { energy: tier.maxEnergy });
    }

    return { success: true, message: `Premium tier ${tierName} activated for ${durationInDays} days` };
}

async function generateRedeemCode(tierName, durationInDays, items = {}) {
    const code = generateRandomId(12); // Buat kode lebih panjang dan acak

    redeemCodes.set(code, {
        tierName,
        durationInDays,
        items,
        createdAt: new Date().toISOString() // Tambahkan info kapan dibuat
    });
    console.log(`[PremiumManager] Redeem code generated: ${code} for tier ${tierName}, duration ${durationInDays} days, items: ${JSON.stringify(items)}`);
    return { code, tierName, durationInDays, items };
}

async function redeemCode(jid, code) {
    const redeemData = redeemCodes.get(code);

    if (!redeemData) {
        return { success: false, message: "Invalid or expired redeem code" };
    }

    // Opsional: Tambahkan validasi waktu untuk redeem code (misal, hanya valid 1 minggu setelah dibuat)
    // const createdAt = new Date(redeemData.createdAt);
    // const expiryDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000); // Contoh: valid 7 hari
    // if (new Date() > expiryDate) {
    //     redeemCodes.delete(code); // Hapus kode yang sudah expired
    //     return { success: false, message: "Redeem code has expired" };
    // }

    const premiumResult = await applyPremium(jid, redeemData.tierName, redeemData.durationInDays);
    if (!premiumResult.success) {
        return premiumResult; // Kembalikan pesan error dari applyPremium
    }

    let message = `Code redeemed successfully! You are now ${redeemData.tierName} for ${redeemData.durationInDays} days.`;

    if (redeemData.items && redeemData.items.coin) {
        await addCoin(jid, redeemData.items.coin);
        message += ` You also received ${redeemData.items.coin} coins.`;
    }
    // Tambahkan item lain jika ada

    redeemCodes.delete(code); // Hapus kode setelah berhasil diredeem
    return { success: true, message: message, tier: redeemData.tierName };
}

function getActivePremium(user) {
    const superKereTier = "Super Kere";
    const defaultTierSettings = config.premiumTiers[superKereTier] || {};
    const globalDefaultMaxEnergy = config.defaultMaxEnergy || 100;

    if (!user || !user.premiumTier || !user.premiumEndTime) {
        const userMaxEnergy = user?.maxEnergy;
        const tierMaxEnergy = defaultTierSettings.maxEnergy;
        return {
            isActive: false,
            tier: superKereTier,
            multiplier: defaultTierSettings.multiplier || 1,
            maxEnergy: userMaxEnergy ?? tierMaxEnergy ?? globalDefaultMaxEnergy
        };
    }

    const endTime = new Date(user.premiumEndTime);
    const now = new Date();

    if (now >= endTime) {
        // Premium expired
        // updateUser(user.jid, { premiumTier: superKereTier, premiumEndTime: null, maxEnergy: defaultTierSettings.maxEnergy ?? globalDefaultMaxEnergy }); // JANGAN UPDATE DB DI SINI
        const tierMaxEnergy = defaultTierSettings.maxEnergy;
        return {
            isActive: false,
            tier: superKereTier,
            multiplier: defaultTierSettings.multiplier || 1,
            maxEnergy: tierMaxEnergy ?? globalDefaultMaxEnergy,
            endTime: user.premiumEndTime // Bisa tetap endTime lama atau null
        };
    }

    const tierData = config.premiumTiers[user.premiumTier];
    return {
        isActive: true,
        tier: user.premiumTier,
        multiplier: tierData?.multiplier || 1,
        maxEnergy: user.maxEnergy, // user.maxEnergy seharusnya sudah di-set dengan benar oleh applyPremium
        endTime: user.premiumEndTime
    };
}

module.exports = {
    applyPremium,
    generateRedeemCode,
    redeemCode,
    getActivePremium,
};