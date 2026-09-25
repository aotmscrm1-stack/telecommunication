const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from process.env or fallback defaults
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dlxveseav',
  api_key: process.env.CLOUDINARY_API_KEY || '858548694337363',
  api_secret: process.env.CLOUDINARY_API_SECRET || '0NQGNv-8fOe64VPh1dC4VRgxV5A',
});

/**
 * Upload an image or file (base64 string, buffer, or HTTP URL) to Cloudinary.
 * Returns a permanent, unrestricted public HTTPS URL on res.cloudinary.com.
 * Usable for WhatsApp media, emails, and direct downloads.
 */
async function uploadToCloudinary(fileInput, folder = 'whatsapp_media', fileName = null) {
  if (!fileInput) return null;

  try {
    let uploadStr = fileInput;

    // Handle Buffer input
    if (Buffer.isBuffer(fileInput)) {
      uploadStr = `data:image/png;base64,${fileInput.toString('base64')}`;
    }

    const options = {
      folder: folder,
      resource_type: 'auto',
    };

    if (fileName) {
      options.use_filename = true;
      options.unique_filename = true;
      options.filename_override = fileName;
    }

    const result = await cloudinary.uploader.upload(uploadStr, options);

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

