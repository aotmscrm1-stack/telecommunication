const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from process.env or fallback defaults
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dph38hvvb',
  api_key: process.env.CLOUDINARY_API_KEY || '519655653597463',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'aB_-2v7R7Zz3JgV9QvP8K7X6W5Y',
});

/**
 * Upload an image (base64 string, buffer, or HTTP URL) to Cloudinary.
 * Returns a permanent, unrestricted public HTTPS URL on res.cloudinary.com.
 * Meta's WhatsApp servers can fetch this URL without 403 Forbidden errors.
 */
async function uploadToCloudinary(fileInput, folder = 'whatsapp_media') {
  if (!fileInput) return null;

  try {
    let uploadStr = fileInput;

    // Handle Buffer input
    if (Buffer.isBuffer(fileInput)) {
      uploadStr = `data:image/png;base64,${fileInput.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(uploadStr, {
      folder: folder,
      resource_type: 'auto',
    });

    return result.secure_url || result.url;
  } catch (err) {
    console.error('[Cloudinary Upload Error]:', err.message);
    return null;
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
