// utils/commandFormatter.js

/**
 * Mengelompokkan command berdasarkan Kategori dan SubKategori.
 * @param {Map<string, object>} commands - Map command yang akan dikelompokkan.
 * @returns {object} - Object yang berisi command yang sudah dikelompokkan.
 *                     Struktur: { Kategori: { SubKategori: [command, ...] } }
 */
function categorizeCommands(commands) {
    const categorized = {};
    commands.forEach(command => {
        const { Kategori = "Lainnya", SubKategori = "Umum", Callname, Deskripsi, Usage } = command;

        if (!categorized[Kategori]) {
            categorized[Kategori] = {};
        }
        if (!categorized[Kategori][SubKategori]) {
            categorized[Kategori][SubKategori] = [];
        }
        categorized[Kategori][SubKategori].push({
            name: Callname || "Tidak Ada Nama",
            description: Deskripsi || "Tidak Ada Deskripsi",
            usage: Usage || Callname // Default usage adalah nama command itu sendiri
        });
    });
    return categorized;
}

/**
 * Memformat command yang sudah dikelompokkan menjadi string yang siap ditampilkan di menu.
 * @param {object} categorizedCommands - Object yang berisi command yang sudah dikelompokkan.
 * @param {string} prefix - Prefix bot (misalnya '!')
 * @returns {string} - String yang berisi daftar command yang sudah diformat.
 */
function formatCategorizedCommandsForMenu(categorizedCommands, prefix) {
    let commandListString = "";
    const emojis = ["🔹", "🔸", "▪️", "▫️", "▶️", "➡️", "➥"];
    let emojiIndex = 0;

    const getEmoji = () => {
        const emoji = emojis[emojiIndex % emojis.length];
        emojiIndex++;
        return emoji;
    };

    for (const category in categorizedCommands) {
        commandListString += `\n╭─「 *${category.toUpperCase()}* 」\n`;
        for (const subCategory in categorizedCommands[category]) {
            commandListString += `│  ❏ *${subCategory}*\n`;
            categorizedCommands[category][subCategory].forEach(cmd => {
                commandListString += `│  │ ${getEmoji()} ${prefix}${cmd.name}\n`;
                // Jika ingin menampilkan deskripsi juga:
                // commandListString += `│  │    └─ _${cmd.description}_\n`;
            });
        }
        commandListString += `╰─────────────────╯\n`;
    }
    return commandListString;
}

module.exports = {
    categorizeCommands,
    formatCategorizedCommandsForMenu, // Ubah nama fungsi agar lebih deskriptif
};