// achievements.js
const config = require('./config'); // Untuk akses prefix

const achievementsList = {
    FIRST_COMMAND: {
        id: 'FIRST_COMMAND',
        name: "Anak Baru Rajin 👶",
        description: `Pertama kali nge-gas pake command ${config.botPrefix}! Mantap jiwa!`,
        criteria: (userStats) => Object.keys(userStats.commandsUsed || {}).length >= 1,
        reward: { coin: 20, exp: 10, energy: 5 },
    },
    COMMAND_SPAMMER_LVL1: {
        id: 'COMMAND_SPAMMER_LVL1',
        name: "Keyboard Warrior Pemula ⌨️💥",
        description: "Nge-burst 50 command! Jari lo gak keriting tuh?",
        criteria: (userStats) => Object.values(userStats.commandsUsed || {}).reduce((a, b) => a + b, 0) >= 50,
        reward: { coin: 100, exp: 50, energy: 20 },
    },
    NIGHT_OWL_COMMANDER: {
        id: 'NIGHT_OWL_COMMANDER',
        name: "Kalong Komandan 🦇🌙",
        description: "Sering begadang sambil nge-command (00:00 - 04:00). Kurang tidur lo?",
        criteria: (userStats, context) => {
            if (!context || !context.currentTime) return false;
            const hour = context.currentTime.getHours();
            // Perlu tracking 'commandsUsedCountInNightTime' di userDatabase, diupdate oleh messageHandler
            return hour >= 0 && hour < 4 && (userStats.commandsUsedCountInNightTime || 0) >= 10;
        },
        reward: { coin: 75, exp: 30, items: { energy_potion_small: 1 } },
        hidden: true, // Sembunyiin biar surprise
    },
    MENU_EXPLORER_PRO: { // Ganti nama biar lebih gokil
        id: 'MENU_EXPLORER_PRO',
        name: "Dewa Penjelajah Menu 📜✨",
        description: `Buka ${config.botPrefix}menu lebih dari 20 kali. Udah jadi tour guide belom?`,
        criteria: (userStats) => (userStats.commandsUsed?.menu || 0) >= 20, // Naikkan batasnya
        reward: { coin: 50, energy: 10 },
    },
    RICH_AF_LVL1: { // Ganti nama
        id: 'RICH_AF_LVL1',
        name: "Sultan KW Super 🤑💎",
        description: "Ngumpulin 10.000 koin. Bagi THR dong, bos!",
        criteria: (userStats) => userStats.coin >= 10000,
        reward: { exp: 200, title: "Juragan Koin Sejati" }, // Hadiah title (perlu sistem title)
    },
    LEVEL_GOD_TIER: { // Ganti nama
        id: 'LEVEL_GOD_TIER',
        name: "Master Bot Tak Terkalahkan 🔥🏆",
        description: "Mencapai Level 50! Lo emang beda!",
        criteria: (userStats) => userStats.level >= 50,
        reward: { coin: 5000, premiumDays: { tier: "Kaya", days: 7 } },
    },
    BUG_SLAYER: { // Ganti nama
        id: 'BUG_SLAYER',
        name: "Pembasmi Bug Handal 🐞⚔️",
        description: "Ngebantu admin nemuin & fix bug. Pahlawan tanpa tanda jasa!",
        criteria: (userStats) => (userStats.reportedBugsFixed || 0) >= 1,
        reward: { coin: 300, exp: 150, energy: 50 },
        hidden: true,
    },
    ULTRA_LOYAL_USER: { // Ganti nama
        id: 'ULTRA_LOYAL_USER',
        name: "Sobat Sejati Selamanya 🫂💖",
        description: "Aktif pake bot selama sebulan penuh (30 hari) & ngirim 500+ pesan. The real MVP!",
        criteria: (userStats) => {
            if (!userStats.firstSeen) return false;
            const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
            return (Date.now() - new Date(userStats.firstSeen).getTime()) >= thirtyDaysInMillis && userStats.messagesSent >= 500;
        },
        reward: { coin: 1000, title: "Sobat Kental Abadi", premiumDays: { tier: "Biasa Aja", days: 3 } },
    },
    CHATBOT_FRIEND: {
        id: 'CHATBOT_FRIEND',
        name: "Teman Curhat AI 🤖💬",
        description: "Sering ngobrol sama fitur AI lebih dari 100 kali. AI-nya jadi baper gak tuh?",
        criteria: (userStats) => (userStats.commandsUsed?.ai || 0) + (userStats.commandsUsed?.chatgpt || 0) >= 100, // Gabungkan penggunaan command AI
        reward: { coin: 150, exp: 70 },
    },
    STICKER_ADDICT: {
        id: 'STICKER_ADDICT',
        name: "Kolektor Stiker Akut 🖼️✨",
        description: "Bikin lebih dari 50 stiker pake bot. Udah penuh galeri lo?",
        criteria: (userStats) => (userStats.commandsUsed?.sticker || 0) + (userStats.commandsUsed?.stiker || 0) >= 50,
        reward: { coin: 100, energy: 25 },
    }
};

module.exports = achievementsList;