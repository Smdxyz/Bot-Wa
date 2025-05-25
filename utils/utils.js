// utils/utils.js
const fs = require('node:fs/promises');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'database.json');

// Struktur statistik bot default
function getDefaultBotStats() {
    return {
        totalUsers: 0,
        totalCommandsUsed: 0,
        startTime: new Date().toISOString(), // Kapan bot terakhir kali dimulai
        // Tambahkan statistik lain jika perlu
    };
}

// Struktur database default
function getDefaultDatabaseStructure() {
    return {
        users: {}, // { jid: userData }
        bot: getDefaultBotStats(),
        // Tambahkan struktur lain jika perlu, misal 'groups', 'settings'
    };
}


// Fungsi pembantu untuk membaca database
async function readDatabase() {
    try {
        await fs.access(dataPath); // Cek apakah file ada
        const data = await fs.readFile(dataPath, 'utf8');
        if (!data) { // File kosong
            console.warn("[readDatabase] Database file is empty. Initializing with default structure.");
            const defaultDb = getDefaultDatabaseStructure();
            await writeDatabase(defaultDb);
            return defaultDb;
        }
        const parsedData = JSON.parse(data);

        // Validasi dan migrasi struktur dasar jika perlu
        if (typeof parsedData !== 'object' || parsedData === null) {
            console.error("[readDatabase] Invalid database structure (not an object). Re-initializing.");
            return getDefaultDatabaseStructure(); // Kembalikan default jika korup parah
        }

        // Pastikan bagian 'users' dan 'bot' ada dan merupakan objek
        if (typeof parsedData.users !== 'object' || parsedData.users === null) {
            console.warn("[readDatabase] 'users' field missing or invalid. Initializing 'users'.");
            parsedData.users = {};
        }
        if (typeof parsedData.bot !== 'object' || parsedData.bot === null) {
            console.warn("[readDatabase] 'bot' field missing or invalid. Initializing 'bot' stats.");
            parsedData.bot = getDefaultBotStats();
        } else {
            // Pastikan semua field di bot stats ada
            parsedData.bot = { ...getDefaultBotStats(), ...parsedData.bot };
        }

        // console.log("[readDatabase] Database read successfully."); // Kurangi log verbose
        return parsedData;

    } catch (error) {
        if (error.code === 'ENOENT') { // File tidak ditemukan
            console.log("[readDatabase] Database file not found. Creating a new one with default structure.");
            const defaultDatabase = getDefaultDatabaseStructure();
            await writeDatabase(defaultDatabase);
            return defaultDatabase;
        } else if (error instanceof SyntaxError) { // Error parsing JSON
            console.error("[readDatabase] Error parsing database.json (SyntaxError). File might be corrupted.", error.message);
            console.log("[readDatabase] Attempting to backup corrupted database and create a new one.");
            try {
                const backupPath = path.join(__dirname, '..', `database_corrupted_${Date.now()}.json`);
                await fs.copyFile(dataPath, backupPath);
                console.log(`[readDatabase] Corrupted database backed up to ${backupPath}`);
            } catch (backupError) {
                console.error(`[readDatabase] Failed to backup corrupted database:`, backupError);
            }
            const defaultDb = getDefaultDatabaseStructure();
            await writeDatabase(defaultDb); // Timpa dengan yang baru
            return defaultDb;
        } else { // Error lain
            console.error("[readDatabase] Error reading database:", error);
            console.warn("[readDatabase] Returning a new default database object to prevent further errors.");
            return getDefaultDatabaseStructure();
        }
    }
}

// Fungsi pembantu untuk menulis database
async function writeDatabase(db) {
    try {
        if (typeof db !== 'object' || db === null) {
            console.error("[writeDatabase] Invalid database object provided. Cannot write to file.");
            throw new Error("Invalid database object. Cannot write to file.");
        }
        // Tambahkan timestamp kapan terakhir diupdate
        if (db.bot) {
            db.bot.lastWrite = new Date().toISOString();
        }
        await fs.writeFile(dataPath, JSON.stringify(db, null, 2), 'utf8');
        // console.log("[writeDatabase] Database written successfully."); // Kurangi log verbose
    } catch (error) {
        console.error("[writeDatabase] Error writing database:", error);
        // Pertimbangkan mekanisme retry atau notifikasi admin jika penulisan gagal kritis
    }
}

// Fungsi untuk menghasilkan ID acak (bisa dipindahkan ke file utils terpisah jika banyak fungsi utilitas)
function generateRandomId(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


module.exports = {
    readDatabase,
    writeDatabase,
    getDefaultDatabaseStructure,
    getDefaultBotStats,
    generateRandomId, // Ekspor fungsi ini
};