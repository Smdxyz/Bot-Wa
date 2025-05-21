const moment = require('moment-timezone');
const os = require('os');
const process = require('process');
const fs = require('fs');
const path = require('path');
const config = require('../config'); // Ambil prefix dari config.js

/**
 * Format durasi waktu.
 */
function formatTime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    seconds %= (3600 * 24);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    let timeString = "";
    if (days > 0) timeString += `${days} hari, `;
    if (hours > 0) timeString += `${hours} jam, `;
    if (minutes > 0) timeString += `${minutes} menit, `;
    timeString += `${secs} detik`;
    return timeString;
}

/**
 * Emoji acak untuk menu.
 */
function getRandomEmoji() {
    const emojis = ["✨", "💎", "🔮", "🪄", "🌟", "🗝️", "🔑", "⚜️"];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Progress bar untuk EXP.
 */
function createProgressBar(currentExp, requiredExp, barLength = 15) {
    const filledBars = Math.floor((currentExp / requiredExp) * barLength);
    const emptyBars = barLength - filledBars;
    return `[${'▓'.repeat(filledBars)}${'░'.repeat(emptyBars)}]`;
}

/**
 * Format menu bot dengan tampilan profesional dan prefix otomatis.
 */
async function formatMenu(botName, botStats, popularCommands, watermark, user) {
    const prefix = config.botPrefix; // Prefix dari config.js
    const osInfo = {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem() / (1024 * 1024),
        freeMemory: os.freemem() / (1024 * 1024),
        cpuModel: os.cpus()[0].model
    };

    const username = user.username || "Pengguna";
    const coin = user.coin || 0;
    const energy = user.energy || 0;
    const exp = user.exp || 0;
    const level = user.level || 1;
    const requiredExp = 100;
    const progressBar = createProgressBar(exp, requiredExp);

    let menu = `╔════════════════════════════════════╗\n` +
               `       🚀 *${botName} siap melayani!* 🚀\n` +
               `╚════════════════════════════════════╝\n\n` +

               `👤 *Informasi Pengguna:* \n` +
               `   • 👤 Nama   : ${username}\n` +
               `   • 🪙 Koin   : ${coin}\n` +
               `   • ⚡ Energi : ${energy}\n` +
               `   • 🎯 Level  : ${level} ${progressBar} (${exp}/${requiredExp} EXP)\n\n` +

               `⚙️ *Info VPS:* \n` +
               `   • 💻 Platform : ${osInfo.platform}\n` +
               `   • 🖥️ CPU      : ${osInfo.cpuModel}\n` +
               `   • 💾 Memori   : ${osInfo.freeMemory.toFixed(2)}MB / ${osInfo.totalMemory.toFixed(2)}MB\n\n` +

               `═════════════ ⬇️ *DAFTAR MENU* ⬇️ ═════════════\n`;

    const commandsPath = path.join(__dirname, '..', 'commands');
    let categorizedCommands = {};

    try {
        const commandFiles = fs.readdirSync(commandsPath);
        for (const file of commandFiles) {
            if (file.endsWith('.js')) {
                const command = require(path.join(commandsPath, file));
                const { Kategori = "Lainnya", SubKategori = "Umum", Callname, Deskripsi } = command;

                if (!categorizedCommands[Kategori]) categorizedCommands[Kategori] = {};
                if (!categorizedCommands[Kategori][SubKategori]) categorizedCommands[Kategori][SubKategori] = [];

                categorizedCommands[Kategori][SubKategori].push({
                    name: Callname || "Tidak ada nama",
                    description: Deskripsi || "Tidak ada deskripsi"
                });
            }
        }
    } catch (error) {
        console.error('Error reading commands directory:', error);
    }

    // Struktur menu dengan tampilan profesional
    for (const category in categorizedCommands) {
        menu += `\n📁 *${category.toUpperCase()}* \n`;
        for (const subCategory in categorizedCommands[category]) {
            menu += `   📂 *${subCategory}* \n`;
            categorizedCommands[category][subCategory].forEach((cmd, index, arr) => {
                const isLast = index === arr.length - 1;
                const branchIcon = isLast ? '└─' : '├─';
                const emoji = getRandomEmoji();
                menu += `     ${branchIcon} ${prefix}${cmd.name} ${emoji} (${cmd.description})\n`;
            });
        }
    }

    menu += `\n═══════════════════════════════════════════\n`;
    menu += `            ${watermark} | 🌐 *Szyrine Bots Api*`;

    return menu;
}

module.exports = {
    formatTime,
    formatMenu,
    createProgressBar
};