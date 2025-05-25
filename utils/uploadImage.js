// utils/uploadImage.js
const axios = require('axios');
const FormData = require('form-data');
const { getApiKey } = require('./apiKeyManager'); // Impor dari apiKeyManager

const UPLOAD_URL = 'https://sannpanel.my.id/upload'; // Ganti dengan URL API Anda jika berbeda
const SERVICE_NAME_FOR_API_KEY = 'imageuploader'; // Nama layanan harus sama (case-insensitive) dengan yang di setupApiKey.js

const uploadImage = async (buffer, filename = 'image.jpg') => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer is empty or invalid');
  }

  const apiKey = await getApiKey(SERVICE_NAME_FOR_API_KEY);

  if (!apiKey) {
    // Jangan log error yang terlalu detail di sini, cukup throw error yang jelas.
    // Pengguna bot tidak perlu tahu detail internal.
    throw new Error('ImageUploaderAPIKeyNotConfigured: API Key untuk layanan upload gambar belum di-setup. Silakan hubungi admin.');
  }

  const formData = new FormData();
  formData.append('image', buffer, { filename });

  try {
    // Tidak ada console.log di sini untuk operasi normal
    const response = await axios.post(UPLOAD_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'x-api-key': apiKey, // Gunakan API key yang sudah didekripsi
      },
      timeout: 15000,
    });

    if (response.data && response.data.url) {
      return response.data.url;
    } else {
      // Error dari API upload, bisa jadi karena API key salah atau masalah lain di sisi API
      throw new Error(`Image upload failed: ${response.data.message || 'Unknown error from image upload API'}`);
    }
  } catch (error) {
    // Tangani error dari axios atau error yang di-throw di atas
    // Buat pesan error lebih generik untuk pengguna akhir
    let errorMessage = 'Error uploading image.';
    if (error.message && error.message.startsWith('ImageUploaderAPIKeyNotConfigured')) {
        errorMessage = error.message; // Pertahankan pesan error spesifik ini
    } else if (error.message && error.message.startsWith('Image upload failed:')) {
        errorMessage = error.message; // Pertahankan pesan error dari API
    } else if (error.isAxiosError) {
        errorMessage = 'Network error or API issue during image upload.';
    }
    // console.error('[uploadImage] Internal Error:', error); // Untuk debugging admin, bisa dikomentari di produksi
    throw new Error(errorMessage);
  }
};

module.exports = uploadImage;