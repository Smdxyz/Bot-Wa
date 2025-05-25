// utils/formatUtils.js
const moment = require('moment-timezone');
const os = require('os');
const config = require('../config'); // Sesuaikan path jika utils.js tidak di root
const premiumManager = require('../premiumManager'); // Sesuaikan path

function formatTime(seconds) {if (isNaN(seconds) || seconds < 0) return "Durasi gak valid";seconds = Math.floor(seconds);const d = Math.floor(seconds / (3600 * 24));const h = Math.floor(seconds % (3600 * 24) / 3600);const m = Math.floor(seconds % 3600 / 60);const s = Math.floor(seconds % 60);let r = "";if (d > 0) r += `${d} hari, `;if (h > 0) r += `${h} jam, `;if (m > 0) r += `${m} menit, `;if (s > 0 || r === "") r += `${s} detik`;return r.replace(/, $/, "") || "0 detik";}
function getRandomCoolEmoji() {const emojis = ["🚀","🌟","✨","💥","🔥","⚡","💎","💡","🏆","🥇","👑","🎩","🕶️","🌠","🌌","🤖","🦾","👾","🎮","🎯","🔮","🪄","🎉","🎊","🎈","🎁","📈","💡","💻","🌐","📡","🛰️"];return emojis[Math.floor(Math.random() * emojis.length)];}
function createCoolProgressBar(current, required, barLength = 12, filledChar = '█', midChar = '▓', emptyChar = '░') {if (required <= 0) return `[${emptyChar.repeat(barLength)}] (N/A)`;const percentage = Math.max(0, Math.min(1, current / required));const filledCount = Math.round(percentage * barLength);let bar = '';for (let i = 0; i < barLength; i++) {if (i < filledCount) bar += filledChar;else if (i === filledCount && percentage > 0 && percentage < 1) bar += midChar;else bar += emptyChar;}return `[${bar}]`;}
const animatedChars = {borders: [["╔","═","╗","║","╚","╝"],["╭","─","╮","│","╰","╯"],["┌","─","┐","│","└","┘"],["╒","═","╕","│","╘","╛"],["╓","─","╖","║","╙","╜"],],spinners: ["⚡✨","✨⚡","🚀🌌","🌌🚀","💡💡","💡 "," 💡","◇◆","◆◇","▷▶","▶▷","⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"],lineStyles: ["─","━","┄","┅","┈","┉","═"],dividers: ["◈◆◈◆◈◆◈◆◈◆◈","◇◇◇◇◇◇◇◇◇◇◇","☆☆☆☆☆☆☆☆☆☆☆","●-●-●-●-●-●-●","═════════════"]};
let currentSpinnerIndex = 0;function getSpinnerChar(braille = false) {const setIndex = braille ? animatedChars.spinners.length - 1 : Math.floor(Math.random() * (animatedChars.spinners.length - 1));const spinnerSet = animatedChars.spinners[setIndex];currentSpinnerIndex = (currentSpinnerIndex + 1) % spinnerSet.length;return spinnerSet[currentSpinnerIndex];}

async function formatSuperMenuTextFrames(botName, user, commandsMap, options = {}) {
    const prefix = config.botPrefix;
    const watermark = config.watermark || `© ${botName}`;
    const ownerNumbers = config.adminNumber.split(',');
    const ownerToMention = ownerNumbers.length > 0 ? ownerNumbers[0].trim() : null;

    const username = user.username || "User Kece";
    const coin = user.coin || 0;
    const energy = user.energy || 0;
    const maxEnergy = user.maxEnergy || config.defaultMaxEnergy || 100;
    const exp = user.exp || 0;
    const level = user.level || 1;
    const requiredExp = level * 100;
    const premiumInfo = premiumManager.getActivePremium(user);
    const tierDisplayName = config.premiumTiers[premiumInfo.tier]?.displayName || premiumInfo.tier;

    const frames = [];
    const totalFrames = options.totalFrames || config.menuAnimationFrames || 3;

    const frameElements = [
        { border: animatedChars.borders[0], line: animatedChars.lineStyles[0], spinner: animatedChars.spinners[0], divider: animatedChars.dividers[0], emojiSet: ["🚀", "🌟", "✨"] },
        { border: animatedChars.borders[1], line: animatedChars.lineStyles[1], spinner: animatedChars.spinners[1], divider: animatedChars.dividers[1], emojiSet: ["💥", "🔥", "⚡"] },
        { border: animatedChars.borders[2], line: animatedChars.lineStyles[2], spinner: animatedChars.spinners[2], divider: animatedChars.dividers[2], emojiSet: ["💎", "💡", "🏆"] },
        { border: animatedChars.borders[3], line: animatedChars.lineStyles[3], spinner: animatedChars.spinners[3], divider: animatedChars.dividers[3], emojiSet: ["🥇", "👑", "🎩"] },
    ];

    for (let f = 0; f < totalFrames; f++) {
        let menu = "";
        const currentFrameStyle = frameElements[f % frameElements.length];
        const [tl, tc, tr, v, bl, br] = currentFrameStyle.border;
        const line = currentFrameStyle.line.repeat(28);
        const coolDivider = currentFrameStyle.divider.substring(0,15);
        const frameSpinner = currentFrameStyle.spinner[f % currentFrameStyle.spinner.length];
        const frameEmoji = (index) => currentFrameStyle.emojiSet[index % currentFrameStyle.emojiSet.length];

        menu += `${tl}═〘 ${frameEmoji(0)} *${botName}* ${frameEmoji(1)} 〙═${tr}\n`;
        menu += `${v} Hi *${username}*! ${frameSpinner}\n`;
        menu += `${v} ${(config.greetingMessages && config.greetingMessages.length > 0) ? config.greetingMessages[f % config.greetingMessages.length] : 'Menu buat lo nih!'}\n`;
        menu += `${v} ${line}\n`;

        const progressBar = createCoolProgressBar(exp, requiredExp, 16, currentFrameStyle.line, animatedChars.spinners[2][f % animatedChars.spinners[2].length], animatedChars.borders[1][1]);
        menu += `${v} ${tl}─「 ${frameEmoji(2)} *PROFIL KAMU* 」─${tr}\n`;
        menu += `${v} ${v}   👑 Pangkat  : *${tierDisplayName}*\n`;
        menu += `${v} ${v}   🪙 Duit     : ${coin}\n`;
        menu += `${v} ${v}   ⚡ Tenaga   : ${energy}/${maxEnergy}\n`;
        menu += `${v} ${v}   🌟 Level    : ${level} (${exp}/${requiredExp} EXP)\n`;
        menu += `${v} ${v}     ${progressBar}\n`;
        menu += `${v} ${bl}──────────────────────${br}\n`;
        menu += `${v} ${line}\n`;

        menu += `${v} ${tl}─「 ${frameEmoji(0)} *INFO BOT & SERVER* 」─${tr}\n`;
        menu += `${v} ${v}   🤖 Bot Name : ${botName}\n`;
        if (ownerToMention) menu += `${v} ${v}   🧢 Big Boss : @${ownerToMention}\n`;
        menu += `${v} ${v}   🕒 Aktif    : ${formatTime(process.uptime())}\n`;
        menu += `${v} ${v}   📅 Server   : ${moment().tz('Asia/Jakarta').format('DD MMM YY, HH:mm')} WIB\n`;
        const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
        const freeMemGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(1);
        menu += `${v} ${v}   💻 OS       : ${os.platform()} (${os.arch()})\n`;
        menu += `${v} ${v}   💾 RAM      : ${freeMemGB}GB / ${totalMemGB}GB Free\n`;
        menu += `${v} ${bl}──────────────────────${br}\n`;
        menu += `${v} ${coolDivider}\n\n`;

        menu += `╭───「 ${frameEmoji(1)} *MENU PERINTAH* ${frameEmoji(2)} 」───╮\n`;
        const categorizedCommands = {};
        commandsMap.forEach(cmd => {
            const isAdminBot = options.isAdminBot || false;
            if (cmd.OwnerOnly && (!ownerNumbers.includes(user.jid.split('@')[0]))) return;
            if (cmd.AdminOnly && !isAdminBot) return;
            if (cmd.Kategori === "Hidden" || cmd.Kategori === "Testing") return;
            const category = cmd.Kategori || "Lain-Lain";
            if (!categorizedCommands[category]) categorizedCommands[category] = [];
            categorizedCommands[category].push({ name: cmd.Callname });
        });
        const sortedCategories = Object.keys(categorizedCommands).sort();
        if (sortedCategories.length === 0) {
            menu += `${v}   Yah, belum ada command yang bisa ditampilin nih.\n`;
        } else {
            for (const category of sortedCategories) {
                menu += `${v} ┌─「 *${category.toUpperCase()}* 」\n`;
                if (categorizedCommands[category].length === 0) {
                     menu += `${v} │  └─ (Kosong)\n`;
                } else {
                    categorizedCommands[category].forEach((cmd, index, arr) => {
                        const branch = index === arr.length - 1 ? '└─►' : '├─►';
                        menu += `${v} │  ${branch} ${prefix}${cmd.name} ${frameEmoji(index)}\n`;
                    });
                }
            }
        }
        menu += `${bl}═${"─".repeat(30)}═${br}\n\n`;

        menu += `${getSpinnerChar(true)} Ketik *${prefix}help [command]* buat info lebih.\n`;
        if (config.newsletterJidForMenu && config.newsletterNameForMenu) {
            menu += `${getSpinnerChar(true)} 📢 Info & Update? Cek *${config.newsletterNameForMenu}*!\n`;
        } else if (config.linkChannel) {
            menu += `${getSpinnerChar(true)} 📢 Channel: ${config.linkChannel}\n`;
        }
        menu += `${getSpinnerChar(true)} ${watermark}`;
        frames.push(menu);
    }
    return frames;
}

module.exports = {
    formatTime,
    getRandomCoolEmoji,
    createCoolProgressBar,
    formatSuperMenuTextFrames
};