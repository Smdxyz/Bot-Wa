// utils/utils.js
const fs = require('node:fs/promises');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'database.json');

// Fungsi pembantu untuk membaca database
async function readDatabase() {
    try {
        // Check if the database file exists
        await fs.access(dataPath);
        const data = await fs.readFile(dataPath, 'utf8');
        const parsedData = JSON.parse(data);

        // Validasi struktur database dasar
        if (typeof parsedData !== 'object' || parsedData === null) {
            console.error("[readDatabase] Struktur database tidak valid. Mengembalikan objek default.");
            console.error("[readDatabase] Data:", parsedData); // Tambahkan log ini
            return getDefaultDatabaseStructure();
        }

        // Pastikan bagian 'users' dan 'bot' ada
        if (!parsedData.users) {
            parsedData.users = {};
        }
        if (!parsedData.bot) {
            parsedData.bot = getDefaultBotStats();
        }
        console.log("[readDatabase] Database read successfully.");
        return parsedData;

    } catch (error) {
        // If the file doesn't exist, create it with the default structure
        if (error.code === 'ENOENT') {
            console.log("[readDatabase] Database file not found. Creating a new one.");
            const defaultDatabase = getDefaultDatabaseStructure();
            await writeDatabase(defaultDatabase);
            return defaultDatabase;
        } else {
            console.error("[readDatabase] Error reading/parsing database:", error);
            console.error("[readDatabase] Returning a new database object to prevent further errors.");
            return getDefaultDatabaseStructure(); // Pastikan selalu mengembalikan objek yang valid
        }
    }
}

// Fungsi pembantu untuk menulis database
async function writeDatabase(db) {
    try {
        if (typeof db !== 'object' || db === null) {
            throw new Error("Invalid database object. Cannot write to file.");
        }
        await fs.writeFile(dataPath, JSON.stringify(db, null, 2), 'utf8');
        console.log("[writeDatabase] Database written successfully.");
    } catch (error) {
        console.error("[writeDatabase] Error writing database:", error);
    }
}

// Struktur database default
function getDefaultDatabaseStructure() {
    return {
        users: {},
        bot: getDefaultBotStats(),
    };
}

// Struktur statistik bot default
function getDefaultBotStats() {
    return {
        totalUsers: 0,
        totalCommandsUsed: 0,
    };
}

module.exports = {
    readDatabase,
    writeDatabase,
    getDefaultDatabaseStructure, // Export this function as well
    getDefaultBotStats, // Export this function as well
};