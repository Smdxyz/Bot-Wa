// utils/commandFormatter.js

/**
 * Mengelompokkan command berdasarkan Kategori dan SubKategori.
 * @param {Map<string, object>} commands - Map command yang akan dikelompokkan.
 * @returns {object} - Object yang berisi command yang sudah dikelompokkan.
 */
function categorizeCommands(commands) {
    return Array.from(commands.values()).reduce((acc, command) => {
        const { Kategori = "Lainnya", SubKategori = "Umum", Callname, Deskripsi } = command;

        if (!acc[Kategori]) {
            acc[Kategori] = {};
        }

        if (!acc[Kategori][SubKategori]) {
            acc[Kategori][SubKategori] = [];
        }

        acc[Kategori][SubKategori].push({ name: Callname || "Tidak ada nama", description: Deskripsi || "Tidak ada deskripsi" });
        return acc;
    }, {});
}

/**
 * Memformat command yang sudah dikelompokkan menjadi string yang siap ditampilkan di menu.
 * @param {object} categorizedCommands - Object yang berisi command yang sudah dikelompokkan.
 * @returns {string} - String yang berisi daftar command yang sudah diformat.
 */
function formatCategorizedCommands(categorizedCommands) {
    let commandListString = "";
    for (const category in categorizedCommands) {
        commandListString += `\n*${category}*:\n`;
        for (const subCategory in categorizedCommands[category]) {
            commandListString += `  *${subCategory}*:\n`;
            categorizedCommands[category][subCategory].forEach(cmd => {
                commandListString += `    - ${cmd.name} : ${cmd.description}\n`;
            });
        }
    }
    return commandListString;
}

module.exports = {
    categorizeCommands,
    formatCategorizedCommands,
};