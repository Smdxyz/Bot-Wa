// premiumManager.js
const { getUser, updateUser, addCoin } = require('./userDatabase');
const config = require('./config');
const { generateRandomId } = require('./utils/utils');

const redeemCodes = new Map();

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

    await updateUser(jid, {
        premiumTier: tierName,
        premiumEndTime: endTime.toISOString()
    });
    return { success: true, message: `Premium tier ${tierName} activated for ${durationInDays} days` }
}

async function generateRedeemCode(tierName, durationInDays, items = {}) {
    const code = generateRandomId();

    redeemCodes.set(code, {
        tierName,
        durationInDays,
        items
    });
    return { code, tierName, durationInDays, items };
}

async function redeemCode(jid, code) {
    const redeemData = redeemCodes.get(code);

    if (!redeemData) {
        return { success: false, message: "Invalid redeem code" };
    }
    await applyPremium(jid, redeemData.tierName, redeemData.durationInDays);

    if (redeemData.items && redeemData.items.coin) {
        await addCoin(jid, redeemData.items.coin);
    }

    redeemCodes.delete(code);
    return { success: true, message: "Code redeemed successfully", tier: redeemData.tierName };
}

function getActivePremium(user) {
    if (!user || !user.premiumEndTime) return { isActive: false, tier: "Super Kere", multiplier: 1 };
    const endTime = new Date(user.premiumEndTime);
    const now = new Date();
    if (now >= endTime) {
        return { isActive: false, tier: "Super Kere", multiplier: 1 };
    }
    return { isActive: true, tier: user.premiumTier, multiplier: config.premiumTiers[user.premiumTier].multiplier };
}

module.exports = {
    applyPremium,
    generateRedeemCode,
    redeemCode,
    getActivePremium,
};