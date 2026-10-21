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

/**
 * Delete an asset from Cloudinary using its public_id.
 * Audio files uploaded to Cloudinary are typically categorized as 'video' resource_type.
 * If resourceType is not provided or fails, it will attempt deletion with resource_type 'video',
 * then fallback to 'raw' or 'image' if appropriate.
 *
 * @param {string} publicId - The Cloudinary public_id
 * @param {string} [resourceType='video'] - 'video' | 'raw' | 'image'
 * @returns {Promise<{ success: boolean, result: string, alreadyDeleted: boolean, error?: string }>}
 */
async function deleteFromCloudinary(publicId, resourceType = 'video') {
  if (!publicId) {
    return { success: true, result: 'not_applicable', alreadyDeleted: true };
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'video',
      invalidate: true,
    });

    // Cloudinary returns { result: 'ok' } on success, or { result: 'not found' }
    if (res.result === 'ok') {
      return { success: true, result: 'ok', alreadyDeleted: false };
    }

    if (res.result === 'not found') {
      // If resource_type was 'video' but the file was uploaded as 'raw' or 'image', attempt retry with other types
      const alternativeTypes = ['raw', 'image'].filter(t => t !== resourceType);
      for (const altType of alternativeTypes) {
        try {
          const retryRes = await cloudinary.uploader.destroy(publicId, {
            resource_type: altType,
            invalidate: true,
          });
          if (retryRes.result === 'ok') {
            return { success: true, result: 'ok', alreadyDeleted: false, resolvedType: altType };
          }
        } catch (_) {}
      }

      // Asset is confirmed genuinely absent on Cloudinary
      return { success: true, result: 'not found', alreadyDeleted: true };
    }

    // Other non-ok result
    return { success: false, result: res.result || 'unknown', alreadyDeleted: false };
  } catch (err) {
    console.error('[Cloudinary Destroy Error]:', err.message);
    return { success: false, error: err.message, alreadyDeleted: false };
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
};

