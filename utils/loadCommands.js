// utils/loadCommands.js
const fs = require('node:fs/promises');
const path = require('path');
const { clearCache } = require('./clearCache');

async function loadCommands() {
    const commands = new Map();
    const commandsPath = path.join(__dirname, '..', 'commands');
    let loadedCount = 0;
    let skippedCount = 0;

    try {
        const commandFiles = await fs.readdir(commandsPath);
        for (const file of commandFiles) {
            if (file.endsWith('.js')) {
                const filePath = path.join(commandsPath, file);
                try {
                    clearCache(filePath); // Hapus cache sebelum me-require ulang
                    const commandModule = require(filePath);

                    // Command bisa berupa objek tunggal atau array dari objek command (untuk file dengan multiple commands)
                    const commandsToRegister = Array.isArray(commandModule) ? commandModule : [commandModule];

                    for (const command of commandsToRegister) {
                        if (command && command.Callname && typeof command.execute === 'function') {
                            // Validasi properti penting lainnya jika perlu
                            if (!command.Kategori) command.Kategori = "Lainnya";
                            if (!command.Deskripsi) command.Deskripsi = "Tidak ada deskripsi.";

                            commands.set(command.Callname.toLowerCase(), command);
                            loadedCount++;
                        } else {
                            console.warn(`[loadCommands] Skipping invalid command object in file: ${file} (missing Callname or execute function, or invalid structure)`);
                            skippedCount++;
                        }
                    }
                } catch (error) {
                    console.error(`[loadCommands] Error loading command file ${file}:`, error);
                    skippedCount++;
                }
            }
        }
        if (loadedCount > 0) {
            console.log(`[loadCommands] Successfully loaded ${loadedCount} command(s).`);
        }
        if (skippedCount > 0) {
            console.warn(`[loadCommands] Skipped ${skippedCount} command file(s) or invalid command object(s).`);
        }
        if (loadedCount === 0 && skippedCount === 0) {
            console.log("[loadCommands] No command files found or loaded.");
        }

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[loadCommands] Commands directory not found: ${commandsPath}. No commands will be loaded.`);
            // Buat direktori jika belum ada, agar tidak error saat watchCommands
            try {
                await fs.mkdir(commandsPath, { recursive: true });
                console.log(`[loadCommands] Created commands directory: ${commandsPath}`);
            } catch (mkdirError) {
                console.error(`[loadCommands] Failed to create commands directory: ${mkdirError}`);
            }
        } else {
            console.error('[loadCommands] Error reading commands directory:', error);
            throw error; // Lemparkan error kritis yang mencegah pemuatan command
        }
    }
    return commands;
}

module.exports = loadCommands;