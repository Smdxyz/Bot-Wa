// userDatabase.js
const { readDatabase, writeDatabase } = require('./utils/utils');
const moment = require('moment-timezone');

async function getUser(jid) {
    if (!jid) {
        console.warn("[getUser] JID is null or undefined. Returning null.");
        return null;
    }
    const db = await readDatabase();
    return db.users[jid] || null;
}

async function createUser(jid, username = null) {
    if (!jid) {
        console.warn("[createUser] JID is null or undefined. Aborting user creation.");
        return;
    }

    const db = await readDatabase();
    const userId = jid;

    if (db.users[userId]) {
        console.warn(`[createUser] User with JID ${userId} already exists. Skipping creation.`);
        return;
    }

    db.users[userId] = {
        username: username || "Pengguna Baru",
        coin: 0,
        energy: 100,
        level: 0,
        exp: 0,
        premiumTier: "Super Kere",
        premiumEndTime: null,
        commandsUsed: {},
        score: 0,
        lastMessageTime: null,
        achievements: [],
        messagesSent: 0,
    };

    db.bot.totalUsers = (db.bot.totalUsers || 0) + 1;
    await writeDatabase(db);
    console.log(`[createUser] User baru dibuat: ${userId} dengan username: ${username}`);
}

async function updateUser(jid, update) {
    if (!jid) {
        console.warn("[updateUser] JID is null or undefined. Aborting update.");
        return null;
    }
    const db = await readDatabase();
    if (db.users[jid]) {
        db.users[jid] = { ...db.users[jid], ...update };
        await writeDatabase(db);
        return db.users[jid];
    } else {
        console.warn(`[updateUser] User with JID ${jid} not found.`);
        return null;
    }
}

async function getAllUsers() {
    const db = await readDatabase();
    return db.users || {};
}

async function addCoin(jid, amount) {
    if (!jid) {
        console.warn("[addCoin] JID is null or undefined. Aborting addCoin.");
        return false;
    }
    if (typeof amount !== 'number' || amount <= 0) {
        console.warn(`[addCoin] Invalid coin amount: ${amount}. Must be a positive number.`);
        return false;
    }

    const db = await readDatabase();
    if (db.users[jid]) {
        db.users[jid].coin = (db.users[jid].coin || 0) + amount;
        await writeDatabase(db);
        return true;
    }
    console.warn(`[addCoin] User with JID ${jid} not found.`);
    return false;
}

async function addEnergy(jid, amount) {
    if (!jid) {
        console.warn("[addEnergy] JID is null or undefined. Aborting addEnergy.");
        return false;
    }
    if (typeof amount !== 'number' || amount <= 0) {
        console.warn(`[addEnergy] Invalid energy amount: ${amount}. Must be a positive number.`);
        return false;
    }

    const db = await readDatabase();
    if (db.users[jid]) {
        db.users[jid].energy = (db.users[jid].energy || 0) + amount;
        await writeDatabase(db);
        return true;
    }
    console.warn(`[addEnergy] User with JID ${jid} not found.`);
    return false;
}

async function addExp(jid, expAmount) {
    if (!jid) {
        console.warn("[addExp] JID is null or undefined. Aborting addExp.");
        return false;
    }

    const db = await readDatabase();
    if (db.users[jid]) {
        const user = db.users[jid];
        user.exp = (user.exp || 0) + expAmount;
        let leveledUp = false;
        while (user.exp >= 100) {
            user.exp -= 100;
            user.level = (user.level || 0) + 1;
            leveledUp = true;
            user.coin = (user.coin || 0) + 50;
            user.energy = (user.energy || 0) + 25;
            console.log(`[userDatabase.js] User ${jid} naik level menjadi ${user.level}!`);
        }

        await writeDatabase(db);
        return leveledUp;
    }
    console.warn(`[addExp] User with JID ${jid} not found.`);
    return false;
}

async function addAchievement(jid, achievementId) {
    if (!jid) {
        console.warn("[addAchievement] JID is null or undefined. Aborting addAchievement.");
        return false;
    }

    const db = await readDatabase();
    if (db.users[jid]) {
        const user = db.users[jid];
        if (!user.achievements) {
            user.achievements = [];
        }
        if (!user.achievements.includes(achievementId)) {
            user.achievements.push(achievementId);
            await writeDatabase(db);
            return true;
        }
    }
    console.warn(`[addAchievement] User with JID ${jid} not found.`);
    return false;
}

module.exports = {
    getUser,
    createUser,
    updateUser,
    getAllUsers,
    addCoin,
    addEnergy,
    addExp,
    addAchievement,
};