// adminManager.js
const { generateRedeemCode: generatePremiumRedeemCode } = require('./premiumManager'); // Ubah nama agar tidak konflik
const { getAllUsers, updateUser, addCoin, addEnergy, getUser } = require('./userDatabase'); // Tambah getUser
const { readDatabase, writeDatabase } = require('./utils/utils');

async function generateAdminCode(tierName, durationInDays, items = {}) {
    // Kode admin bisa jadi adalah kode redeem premium dengan item tambahan atau durasi khusus
    console.log(`[AdminManager] Generating admin (premium) code: tier ${tierName}, duration ${durationInDays}, items: ${JSON.stringify(items)}`);
    return await generatePremiumRedeemCode(tierName, durationInDays, items);
}

async function getAllUserStats() {
    return await getAllUsers();
}

async function getBotStats() {
    const db = await readDatabase();
    return db.bot || { totalUsers: 0, totalCommandsUsed: 0 }; // Pastikan ada nilai default
}

async function adminSetCoin(jid, amount) {
    if (!jid) {
        console.warn("[adminSetCoin] JID is null or undefined.");
        return null;
    }
    if (typeof amount !== 'number' || amount < 0) { // Coin tidak boleh negatif
        console.warn(`[adminSetCoin] Invalid coin amount: ${amount}. Must be a non-negative number.`);
        return null;
    }
    console.log(`[AdminManager] Setting coin for ${jid} to ${amount}`);
    return await updateUser(jid, { coin: amount });
}

async function adminAddCoin(jid, amount) {
    if (!jid) {
        console.warn("[adminAddCoin] JID is null or undefined.");
        return false;
    }
    if (typeof amount !== 'number') {
        console.warn(`[adminAddCoin] Invalid coin amount: ${amount}. Must be a number.`);
        return false;
    }
    console.log(`[AdminManager] Adding ${amount} coin to ${jid}`);
    return await addCoin(jid, amount); // Menggunakan fungsi addCoin yang sudah ada
}


async function adminSetEnergy(jid, amount) {
    if (!jid) {
        console.warn("[adminSetEnergy] JID is null or undefined.");
        return null;
    }
    if (typeof amount !== 'number' || amount < 0) { // Energi tidak boleh negatif
        console.warn(`[adminSetEnergy] Invalid energy amount: ${amount}. Must be a non-negative number.`);
        return null;
    }
    console.log(`[AdminManager] Setting energy for ${jid} to ${amount}`);
    return await updateUser(jid, { energy: amount });
}

async function adminAddEnergy(jid, amount) {
    if (!jid) {
        console.warn("[adminAddEnergy] JID is null or undefined.");
        return false;
    }
    if (typeof amount !== 'number') {
        console.warn(`[adminAddEnergy] Invalid energy amount: ${amount}. Must be a number.`);
        return false;
    }
    console.log(`[AdminManager] Adding ${amount} energy to ${jid}`);
    return await addEnergy(jid, amount); // Menggunakan fungsi addEnergy yang sudah ada
}

async function banUser(jid, reason = "No reason provided") {
    if (!jid) return { success: false, message: "JID is required." };
    console.log(`[AdminManager] Banning user ${jid}. Reason: ${reason}`);
    return await updateUser(jid, { isBanned: true, banReason: reason, bannedAt: new Date().toISOString() });
}

async function unbanUser(jid) {
    if (!jid) return { success: false, message: "JID is required." };
    console.log(`[AdminManager] Unbanning user ${jid}.`);
    return await updateUser(jid, { isBanned: false, banReason: null, bannedAt: null });
}


module.exports = {
    generateAdminCode,
    getAllUserStats,
    getBotStats,
    adminSetCoin,
    adminAddCoin,
    adminSetEnergy,
    adminAddEnergy,
    banUser,
    unbanUser,
};