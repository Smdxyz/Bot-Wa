// utils/loadCommands.js
const fs = require('node:fs/promises');
const path = require('path');
const { clearCache } = require('./clearCache'); // Import the clearCache function

async function loadCommands() {
    const commands = new Map();
    const commandsPath = path.join(__dirname, '..', 'commands');

    try {
        const commandFiles = await fs.readdir(commandsPath);
        for (const file of commandFiles) {
            if (file.endsWith('.js')) {
                const filePath = path.join(commandsPath, file);

                try {
                   // Clear the cache for the specific file before requiring it
                    clearCache(filePath);

                    const command = require(filePath);
                    if (command && command.Callname && typeof command.execute === 'function') { //Check command execute is a function
                        const { Callname, execute, ...rest } = command;
                        commands.set(Callname.toLowerCase(), { execute, ...rest });
                        console.log(`[loadCommands] Command loaded: ${command.Callname}`);
                    } else {
                        console.warn(`[loadCommands] Skipping invalid command file: ${file} (missing Callname or execute function)`);
                    }
                } catch (error) {
                    console.error(`[loadCommands] Error loading command file ${file}:`, error);
                    // Don't re-throw, continue loading other commands.  Only critical errors (like directory access) should stop the process.
                }
            }
        }
    } catch (error) {
        console.error('[loadCommands] Error reading commands directory:', error);
        // Re-throw critical errors that prevent command loading.  Other errors should be handled more gracefully.
        throw error;
    }

    return commands;
}

module.exports = loadCommands;