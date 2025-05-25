// setupMasterApiKey.js (Untuk satu API Key Utama)
const readline = require('readline');
const { storeMasterApiKey, isMasterApiKeySet } = require('./utils/apiKeyManager'); // Pastikan path benar

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function runFullSetup() { // Nama fungsi ini seharusnya runFullSetup atau nama yang konsisten
    process.stdout.write('--- Setup Master API Key ---\n');
    process.stdout.write('Anda akan diminta untuk memasukkan satu Master API Key untuk bot.\n');
    process.stdout.write('API key ini akan dienkripsi sebelum disimpan.\n\n');

    try {
        const keyAlreadySet = await isMasterApiKeySet();
        if (keyAlreadySet) {
            process.stdout.write('Master API Key sudah ada.\n');
            const overwrite = await new Promise(resolve => {
                rl.question('Apakah Anda ingin menimpanya? (y/n, default n): ', (answer) => {
                    resolve(answer.toLowerCase() === 'y');
                });
            });
            if (!overwrite) {
                process.stdout.write('Master API Key tidak diubah.\n');
                rl.close();
                return;
            }
        }

        const apiKey = await new Promise(resolve => {
            rl.question('Masukkan Master API Key Anda: ', (input) => {
                resolve(input.trim());
            });
        });

        if (apiKey) {
            await storeMasterApiKey(apiKey);
            process.stdout.write('Master API Key berhasil dienkripsi dan disimpan.\n');
        } else {
            process.stdout.write('Input Master API Key kosong. Tidak ada yang disimpan.\n');
        }
    } catch (error) {
        process.stderr.write(`GAGAL melakukan setup Master API Key: ${error.message}\n`);
    } finally {
        process.stdout.write('\nPASTIKAN ANDA MENGAMANKAN FILE "utils/secureCryptoOps.js" SETELAH MENGGANTI KUNCI RAHASIANYA!\n');
        rl.close();
    }
}

// PANGGIL FUNGSI DI SINI
runFullSetup();