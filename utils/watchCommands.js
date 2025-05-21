// utils/watchCommands.js
const chokidar = require('chokidar');
const path = require('path');
const loadCommands = require('./loadCommands');
const { clearCache } = require('./clearCache'); // Import clearCache

async function watchCommands(commands, setCommands) {
  const commandsPath = path.join(__dirname, '..', 'commands');

  const watcher = chokidar.watch(commandsPath, {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: { // Improve reliability, especially on file saves
      stabilityThreshold: 100, // milliseconds
      pollInterval: 100 // milliseconds
    }
  });

  watcher
    .on('add', filePath => {
      if (filePath.endsWith('.js')) {
        console.log(`[watchCommands] File added: ${filePath}. Reloading commands.`);
        loadNewCommands(commands, setCommands);
      }
    })
    .on('change', filePath => {
      if (filePath.endsWith('.js')) {
        console.log(`[watchCommands] File changed: ${filePath}. Reloading commands.`);
        loadNewCommands(commands, setCommands);
        clearCache(filePath); // Tambahkan clearCache di sini
      }
    })
    .on('unlink', filePath => {
      if (filePath.endsWith('.js')) {
        console.log(`[watchCommands] File removed: ${filePath}. Reloading commands.`);
        loadNewCommands(commands, setCommands);
      }
    })
    .on('error', error => console.error(`[watchCommands] Watcher error: ${error}`));

  return watcher;
}

async function loadNewCommands(commands, setCommands) {
  try {
    const newCommands = await loadCommands();
    setCommands(newCommands); // Update commands in place
    console.log('[watchCommands] Commands reloaded successfully.');
  } catch (error) {
    console.error('[watchCommands] Error reloading commands:', error);
  }
}

module.exports = watchCommands;