// utils/clearCache.js
const path = require('path');

function clearCache(modulePath) {
    const resolvedPath = require.resolve(modulePath);
    if (resolvedPath && require.cache[resolvedPath]) {
        delete require.cache[resolvedPath];
        console.log(`[clearCache] Cleared cache for: ${path.basename(modulePath)}`);
    }
}

module.exports = { clearCache };