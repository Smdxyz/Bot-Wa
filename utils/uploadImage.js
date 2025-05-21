const axios = require('axios');
const FormData = require('form-data');

const uploadImage = async (buffer) => {
  const formData = new FormData();
  formData.append('image', buffer, { filename: 'image.jpg' });

  try {
    const response = await axios.post('https://sannpanel.my.id/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'x-api-key': 'ramadhan7',
      },
    });

    if (response.data && response.data.url) {
      return response.data.url;
    } else {
      console.error('Image upload failed:', response.data);
      throw new Error('Image upload failed');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Error uploading image');
  }
};

module.exports = uploadImage;
