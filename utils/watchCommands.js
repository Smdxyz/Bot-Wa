// utils/watchCommands.js
const chokidar = require('chokidar');
const path = require('path');
const loadCommands = require('./loadCommands');
const { clearCache } = require('./clearCache');

async function watchCommands(currentCommandsMap, setCommandsFunc) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  console.log(`[watchCommands] Watching for command changes in: ${commandsPath}`);

  const watcher = chokidar.watch(commandsPath, {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Jangan trigger 'add' untuk file yang sudah ada saat watcher dimulai
    awaitWriteFinish: {
      stabilityThreshold: 200, // Waktu stabil sebelum dianggap selesai ditulis
      pollInterval: 100
    }
  });

  const reloadHandler = async (filePath, eventType) => {
    if (filePath.endsWith('.js')) {
      console.log(`[watchCommands] File ${eventType}: ${path.basename(filePath)}. Reloading all commands.`);
      // Selalu clear cache untuk file yang berubah, meskipun loadCommands juga melakukannya.
      // Ini untuk memastikan cache bersih sebelum require di loadCommands.
      if (eventType === 'change' || eventType === 'unlink') { // Untuk unlink, cache sudah otomatis hilang
          clearCache(filePath);
      }
      try {
        const newCommands = await loadCommands();
        setCommandsFunc(newCommands); // Update map command di index.js
        console.log('[watchCommands] Commands reloaded successfully.');
      } catch (error) {
        console.error('[watchCommands] Error reloading commands:', error);
      }
    }
  };

  watcher
    .on('add', filePath => reloadHandler(filePath, 'added'))
    .on('change', filePath => reloadHandler(filePath, 'changed'))
    .on('unlink', filePath => reloadHandler(filePath, 'removed'))
    .on('error', error => console.error(`[watchCommands] Watcher error: ${error}`))
    .on('ready', () => console.log('[watchCommands] Initial scan complete. Ready for changes.'));

  return watcher;
}

module.exports = watchCommands;