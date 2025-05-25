## Setup dan Manajemen Master API Key (Untuk API Pribadi Anda)

Bot ini menggunakan sistem penyimpanan API key terenkripsi lokal untuk API key utama yang mungkin Anda gunakan untuk mengakses API pribadi Anda atau layanan pihak ketiga yang semuanya menggunakan kunci yang sama.

**Langkah-Langkah Setup (Dilakukan Sekali oleh Admin Bot):**

1.  **Pastikan Kunci Enkripsi Aman:**
    *   Buka file `utils/secureCryptoOps.js`.
    *   Ganti placeholder `YOUR_VERY_SECRET_STRONG_64_CHAR_HEX_KEY_HERE` dengan kunci heksadesimal 64 karakter yang kuat dan acak. Untuk membuatnya, jalankan di terminal Anda:
        ```bash
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        ```
    *   **AMANKAN FILE `utils/secureCryptoOps.js`!** Setelah kunci dimasukkan, file ini **TIDAK BOLEH** bisa dibaca oleh orang lain. Enkripsi, obfuscate, atau kompilasi file ini.

2.  **Jalankan Skrip Setup Master API Key:**
    Buka terminal di direktori root proyek Anda dan jalankan:
    ```bash
    node setupMasterApiKey.js
    ```
    Ikuti instruksi untuk memasukkan Master API Key Anda. API key ini akan dienkripsi dan disimpan dalam file `master_api_key.enc.json` di root proyek.

**Menggunakan Master API Key di Command Baru:**

Jika Anda membuat command baru (misalnya, Instagram Downloader, TikTok Downloader) yang perlu mengakses API pribadi Anda menggunakan Master API Key:

1.  Di dalam file command Anda (misalnya, `commands/igdl.js`), impor fungsi `getMasterApiKey`:
    ```javascript
    const { getMasterApiKey } = require('../utils/apiKeyManager');
    ```

2.  Di dalam fungsi `execute` command Anda, panggil `getMasterApiKey()`:
    ```javascript
    async execute(sock, msg, options) {
        // ... kode lainnya ...

        const apiKey = await getMasterApiKey();
        if (!apiKey) {
            return sock.sendMessage(jid, { text: `Master API Key belum di-setup oleh admin.` }, { quoted: msg });
        }

        // Gunakan 'apiKey' untuk melakukan request ke API pribadi Anda
        try {
            // Contoh:
            // const response = await axios.get(`URL_API_PRIBADI_ANDA/fitur`, {
            //     headers: { 'X-API-KEY': apiKey }, // atau sesuai cara API Anda menerima kunci
            //     params: { /* parameter lain */ }
            // });
            // Proses response.data ...
        } catch (error) {
            // Tangani error ...
        }
    }
    ```

Dengan pendekatan ini, Anda hanya perlu mengelola satu Master API Key, dan semua command yang membutuhkannya akan menggunakan kunci yang sama tersebut.