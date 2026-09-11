const { uploadToCloudinary } = require('../backend/src/utils/cloudinary');

async function testCloudinary() {
  console.log('Testing Cloudinary Upload...');
  const sampleUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800';
  const cUrl = await uploadToCloudinary(sampleUrl, 'test_media');
  console.log('Cloudinary Public URL:', cUrl);
}

testCloudinary();
