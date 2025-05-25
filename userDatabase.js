// userDatabase.js
const { readDatabase, writeDatabase } = require('./utils/utils');
const config = require('./config');
// const premiumManager = require('./premiumManager'); // HAPUS: Untuk menghindari circular dependency

async function getUser(jid) { /* ... (sama seperti sebelumnya) ... */ if (!jid) { return null; } const db = await readDatabase(); return db.users[jid] || null; }
async function getAllUsers() { /* ... (sama seperti sebelumnya) ... */ const db = await readDatabase(); return db.users || {}; }
async function addCoin(jid, amount) { /* ... (sama seperti sebelumnya) ... */ if (!jid) return false; if (typeof amount !== 'number') return false; const user = await getUser(jid); if (user) { const newCoin = (user.coin || 0) + amount; await updateUser(jid, { coin: Math.max(0, newCoin) }); return true; } return false; }
async function addAchievement(jid, achievementId) { /* ... (sama seperti sebelumnya) ... */ if (!jid) return false; const user = await getUser(jid); if (user) { const achievements = user.achievements || []; if (!achievements.includes(achievementId)) { achievements.push(achievementId); await updateUser(jid, { achievements }); return true; } } return false; }


async function createUser(jid, username = null) {
    if (!jid) {
        console.warn("[createUser] JID null atau undefined.");
        return null;
    }
    const db = await readDatabase();
    if (db.users[jid]) {
        return db.users[jid];
    }
    const now = new Date().toISOString();
    const defaultMaxEnergyGlobal = config.defaultMaxEnergy || 100;
    const tierDefault = "Super Kere";
    const tierDefaultSettings = config.premiumTiers[tierDefault] || {};


    db.users[jid] = {
        jid: jid,
        username: username || jid.split('@')[0],
        coin: 0,
        energy: tierDefaultSettings.maxEnergy || defaultMaxEnergyGlobal,
        maxEnergy: tierDefaultSettings.maxEnergy || defaultMaxEnergyGlobal,
        level: 1,
        exp: 0,
        premiumTier: tierDefault,
        premiumEndTime: null,
        commandsUsed: {},
        score: 0,
        lastMessageTime: now,
        firstSeen: now,
        messagesSent: 0,
        achievements: [],
        lastCoinRegenTime: null,
        lastEnergyRegenTime: null,
        isBanned: false,
        banReason: null,
        bannedAt: null,
        commandsUsedCountInNightTime: 0, // Untuk achievement Night Owl
    };
    db.bot.totalUsers = (db.bot.totalUsers || 0) + 1;
    await writeDatabase(db);
    console.log(`[createUser] User baru dibuat: ${jid} (${db.users[jid].username})`);
    return db.users[jid];
}

async function updateUser(jid, update) {
    if (!jid) {
        console.warn("[updateUser] JID null atau undefined.");
        return null;
    }
    const db = await readDatabase();
    if (db.users[jid]) {
        db.users[jid] = { ...db.users[jid], ...update, lastModified: new Date().toISOString() };
        await writeDatabase(db);
        return db.users[jid];
    }
    return null;
}

async function addEnergy(jid, amount) {
    if (!jid) return false;
    if (typeof amount !== 'number') return false;

    const user = await getUser(jid);
    if (user) {
        // user.maxEnergy seharusnya sudah di-set dengan benar saat user dibuat atau tier diubah.
        // Jika user.maxEnergy tidak ada (seharusnya tidak terjadi), fallback ke default dari config.
        const currentTierSettings = config.premiumTiers[user.premiumTier] || config.premiumTiers["Super Kere"] || {};
        const maxEnergyForUser = user.maxEnergy || currentTierSettings.maxEnergy || config.defaultMaxEnergy || 100;
        
        const currentEnergy = user.energy || 0;
        let newEnergy = currentEnergy + amount;

        newEnergy = Math.max(0, Math.min(newEnergy, maxEnergyForUser)); // Pastikan antara 0 dan maxEnergyForUser

        if (newEnergy !== currentEnergy) { // Hanya update jika ada perubahan
            await updateUser(jid, { energy: newEnergy });
        }
        return true;
    }
    return false;
}

async function addExp(jid, expAmount) {
    if (!jid) return { leveledUp: false, newLevel: null };
    if (typeof expAmount !== 'number' || expAmount <= 0) return { leveledUp: false, newLevel: null };

    const user = await getUser(jid);
    if (user) {
        let currentExp = user.exp || 0;
        let currentLevel = user.level || 1;
        currentExp += expAmount;
        let leveledUp = false;
        let expForNextLevel = currentLevel * 100;

        while (currentExp >= expForNextLevel) {
            currentExp -= expForNextLevel;
            currentLevel++;
            leveledUp = true;
            const levelUpCoinReward = (config.levelUpRewards?.coinPerLevel || 50) * currentLevel;
            const levelUpEnergyReward = (config.levelUpRewards?.energyPerLevel || 25) * currentLevel;

            await addCoin(jid, levelUpCoinReward);
            await addEnergy(jid, levelUpEnergyReward); // addEnergy akan menggunakan maxEnergy user yang sudah benar
            console.log(`[addExp] User ${jid} naik ke Level ${currentLevel}! +${levelUpCoinReward} koin, +${levelUpEnergyReward} energi.`);
            expForNextLevel = currentLevel * 100;
        }
        await updateUser(jid, { exp: currentExp, level: currentLevel });
        return { leveledUp, newLevel: currentLevel, oldLevel: user.level };
    }
    return { leveledUp: false, newLevel: null };
}

module.exports = {
    getUser, createUser, updateUser, getAllUsers, addCoin, addEnergy, addExp, addAchievement,
};