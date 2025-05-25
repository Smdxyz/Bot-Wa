// utils/secureCryptoOps.js
// PERHATIAN: FILE INI BERISI KUNCI ENKRIPSI DAN LOGIKA KRUSIAL.
// ANDA HARUS MENGAMANKAN FILE INI SECARA MANUAL (ENKRIPSI, OBFUSKASI, ATAU KOMPILASI KE BYTECODE)
// SETELAH PENGEMBANGAN DAN SETELAH MEMASUKKAN KUNCI RAHASIA ANDA.

const crypto = require('crypto');

// =====================================================================================
// == PENTING! GANTI KUNCI DI BAWAH INI DENGAN KUNCI ACAK YANG SANGAT KUAT! ==
// == Kunci harus 32 byte (64 karakter heksadesimal).                            ==
// == Gunakan perintah ini di terminal untuk menghasilkan kunci baru:                ==
// == node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"     ==
// =====================================================================================
const SECRET_ENCRYPTION_KEY_HEX = '8ce5c0f01475f270fea901058d9a82953c433af128880a1cad9dc6f2737de5e8'; // <-- GANTI INI!

let SECRET_ENCRYPTION_KEY;
try {
    SECRET_ENCRYPTION_KEY = Buffer.from(SECRET_ENCRYPTION_KEY_HEX, 'hex');
    if (SECRET_ENCRYPTION_KEY.length !== 32) {
        // Jangan pernah mencetak kunci atau detailnya di sini dalam produksi
        throw new Error('InvalidKeyLength'); // Error generik
    }
} catch (e) {
    // Error saat konversi Buffer atau panjang tidak valid
    // Ini adalah kondisi fatal untuk keamanan.
    // Di produksi, ini seharusnya tidak terjadi jika kunci sudah diset dengan benar.
    // Hentikan proses atau tangani dengan cara yang sangat aman.
    // Untuk saat ini, kita akan throw error yang akan menghentikan aplikasi jika kunci salah format.
    // Jangan log error yang berisi detail kunci.
    process.stderr.write('FATAL: Secure operations cannot proceed due to invalid encryption key configuration.\n');
    process.exit(1); // Keluar jika kunci tidak bisa dimuat dengan benar
}


const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Bytes untuk GCM, umumnya 12 atau 16. 16 lebih umum.
const AUTH_TAG_LENGTH = 16; // Bytes

/**
 * Mengenkripsi teks.
 * @param {string} text Teks plaintext yang akan dienkripsi.
 * @returns {{iv: string, encryptedData: string, authTag: string}} Objek berisi IV, data terenkripsi, dan authTag, semua dalam format hex.
 * @throws {Error} Jika enkripsi gagal.
 */
function encrypt(text) {
    if (typeof text !== 'string' || text.length === 0) {
        throw new Error('EncryptionError: Input text cannot be empty.');
    }
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET_ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
            authTag: authTag.toString('hex'),
        };
    } catch (e) {
        // Jangan log detail error yang mungkin sensitif
        throw new Error('EncryptionError: Failed to encrypt data.');
    }
}

/**
 * Mendekripsi data.
 * @param {{iv: string, encryptedData: string, authTag: string}} encryptedObject Objek berisi IV, data terenkripsi, dan authTag (semua hex).
 * @returns {string} Teks plaintext yang telah didekripsi.
 * @throws {Error} Jika dekripsi gagal.
 */
function decrypt(encryptedObject) {
    if (
        !encryptedObject ||
        typeof encryptedObject.iv !== 'string' ||
        typeof encryptedObject.encryptedData !== 'string' ||
        typeof encryptedObject.authTag !== 'string'
    ) {
        throw new Error('DecryptionError: Invalid encrypted object structure.');
    }

    try {
        const iv = Buffer.from(encryptedObject.iv, 'hex');
        const authTag = Buffer.from(encryptedObject.authTag, 'hex');
        const encryptedText = Buffer.from(encryptedObject.encryptedData, 'hex');

        if (iv.length !== IV_LENGTH) {
             throw new Error('DecryptionError: Invalid IV length.');
        }
        if (authTag.length !== AUTH_TAG_LENGTH) {
            throw new Error('DecryptionError: Invalid authTag length.');
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        // Error ini bisa berarti data korup atau kunci/IV/authTag salah (tampering attempt)
        throw new Error('DecryptionError: Failed to decrypt data. Data might be corrupted or tampered with.');
    }
}

module.exports = { encrypt, decrypt };