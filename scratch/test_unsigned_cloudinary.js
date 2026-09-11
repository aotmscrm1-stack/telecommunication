const axios = require('axios');

async function testUnsignedCloudinary() {
  console.log('Testing Unsigned Cloudinary Upload...');
  const sampleUrl = 'https://picsum.photos/800/600';
  
  try {
    const res = await axios.post('https://api.cloudinary.com/v1_1/demo/image/upload', {
      file: sampleUrl,
      upload_preset: 'docs_upload_example_us_preset',
    });
    console.log('Cloudinary Upload Success:', res.data.secure_url);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testUnsignedCloudinary();
