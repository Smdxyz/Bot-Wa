// utils/clearCache.js
const path = require('path');

function clearCache(modulePath) {
    try {
        const resolvedPath = require.resolve(modulePath);
        if (resolvedPath && require.cache[resolvedPath]) {
            delete require.cache[resolvedPath];
            // console.log(`[clearCache] Cleared cache for: ${path.basename(modulePath)}`); // Kurangi log yang terlalu verbose
            return true;
        }
    } catch (e) {
        // Modul mungkin belum pernah di-cache atau path tidak valid
        // console.warn(`[clearCache] Could not clear cache for ${modulePath}: ${e.message}`);
    }
    return false;
}

module.exports = { clearCache };