const axios = require('axios');
const FormData = require('form-data');

const phoneId = '1340972425758369';
const token = 'EAARKMMGqXuUBSf8IsZAC28gqEIadxInSG43ij3rbmXmKtpiWLBCUBqMEHGaEF13lB0Pf18MSAIvbybiKhHrAEKFZAqFetz8X9RRpu8lFNEcSLZAI7yTxS3mSNzPX2ZAkPXpc70XwaZA4MgQdLirnTEZCn1zwssQtqbLqk5se7AMmu25uVR0n8mXIorJY58X19UCQZDZD';

async function testUploadWhatsAppMedia() {
  console.log('Testing Meta WhatsApp Media Upload API (POST /{phone_id}/media)...');
  
  try {
    // 1. Fetch a sample image buffer
    const imgRes = await axios.get('https://picsum.photos/800/600', { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgRes.data);

    // 2. Prepare FormData for Meta
    const form = new FormData();
    form.append('file', buffer, { filename: 'header_image.jpg', contentType: 'image/jpeg' });
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'image/jpeg');

    // 3. Upload to Meta
    const res = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneId}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Meta Media Upload Success! Result:', res.data);
    console.log('Media ID:', res.data?.id);
  } catch (err) {
    console.error('Meta Media Upload Error Status:', err.response?.status);
    console.error('Meta Media Upload Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

testUploadWhatsAppMedia();
