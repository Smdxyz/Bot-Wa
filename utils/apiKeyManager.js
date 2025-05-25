// utils/apiKeyManager.js (Versi Sederhana untuk Satu API Key Utama)
const fs = require('node:fs/promises');
const path = require('path');
const { encrypt, decrypt } = require('./secureCryptoOps');

// File penyimpanan akan ada di root proyek
const MASTER_API_KEY_STORAGE_FILE = path.join(__dirname, '..', 'master_api_key.enc.json');
const KEY_NAME_IN_FILE = 'masterApiKey'; // Nama kunci internal di file JSON

/**
 * Menyimpan API key utama setelah mengenkripsinya.
 * @param {string} apiKey Plaintext API key utama.
 * @returns {Promise<void>}
 * @throws {Error} Jika API key kosong, atau terjadi kesalahan saat enkripsi/penyimpanan.
 */
async function storeMasterApiKey(apiKey) {
    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
        throw new Error('MasterApiKeyStoreError: API key cannot be empty.');
    }
    try {
        const encryptedPayload = encrypt(apiKey);
        const storeData = { [KEY_NAME_IN_FILE]: encryptedPayload };
        await fs.writeFile(MASTER_API_KEY_STORAGE_FILE, JSON.stringify(storeData), 'utf8');
    } catch (error) {
        throw new Error(`MasterApiKeyStoreError: Failed to store master API key. Reason: ${error.name}`);
    }
}

/**
 * Mengambil API key utama yang telah didekripsi untuk penggunaan internal.
 * @returns {Promise<string|null>} Plaintext API key utama, atau null jika tidak ditemukan atau gagal dekripsi.
 */
async function getMasterApiKey() {
    try {
        const fileContent = await fs.readFile(MASTER_API_KEY_STORAGE_FILE, 'utf8');
        const storeData = JSON.parse(fileContent);
        const encryptedPayload = storeData[KEY_NAME_IN_FILE];

        if (!encryptedPayload) {
            return null; // Key tidak ditemukan dalam file
        }
        
        if (typeof encryptedPayload.iv !== 'string' || 
            typeof encryptedPayload.encryptedData !== 'string' || 
            typeof encryptedPayload.authTag !== 'string') {
            // console.error('[ApiKeyManager] Invalid encrypted payload structure for master key.'); // Hapus di prod
            return null; // Struktur tidak valid
        }

        const decryptedApiKey = decrypt(encryptedPayload);
        return decryptedApiKey;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null; // File tidak ditemukan
        }
        // console.error(`[ApiKeyManager] Error retrieving master API key: ${error.name}`); // Hapus di prod
        return null;
    }
}

/**
 * Memeriksa apakah API key utama sudah diinisialisasi dan tersimpan.
 * @returns {Promise<boolean>} True jika file API key ada dan memiliki struktur dasar yang valid.
 */
async function isMasterApiKeySet() {
    try {
        const fileContent = await fs.readFile(MASTER_API_KEY_STORAGE_FILE, 'utf8');
        if (!fileContent) return false;
        const storeData = JSON.parse(fileContent);
        const payload = storeData[KEY_NAME_IN_FILE];
        return !!(payload && payload.iv && payload.encryptedData && payload.authTag);
    } catch (error) {
        return false;
    }
}

module.exports = {
    storeMasterApiKey,
    getMasterApiKey,
    isMasterApiKeySet,
};