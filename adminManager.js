// adminManager.js
const { generateRedeemCode } = require('./premiumManager');
const { getAllUsers, updateUser } = require('./userDatabase');
const { readDatabase, writeDatabase } = require('./utils/utils');

async function generateAdminCode(tierName, durationInDays, items = {}) {
    return await generateRedeemCode(tierName, durationInDays, items);
}

async function getAllUserStats() {
    return await getAllUsers();
}

async function getBotStats() {
    const db = await readDatabase();
    return db.bot || {};
}

async function giveUserCoin(jid, amount) {
    if (!jid) {
        console.warn("[giveUserCoin] JID is null or undefined. Aborting giveUserCoin.");
        return null;
    }
    if (typeof amount !== 'number' || amount <= 0) {
        console.warn(`[giveUserCoin] Invalid coin amount: ${amount}. Must be a positive number.`);
        return null;
    }

    const user = await updateUser(jid, { coin: amount });
    return user;
}

async function giveUserEnergy(jid, amount) {
    if (!jid) {
        console.warn("[giveUserEnergy] JID is null or undefined. Aborting giveUserEnergy.");
        return null;
    }
    if (typeof amount !== 'number' || amount <= 0) {
        console.warn(`[giveUserEnergy] Invalid energy amount: ${amount}. Must be a positive number.`);
        return null;
    }

    const user = await updateUser(jid, { energy: amount });
    return user;
}

module.exports = {
    generateAdminCode,
    getAllUserStats,
    getBotStats,
    giveUserCoin,
    giveUserEnergy,
};