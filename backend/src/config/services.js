module.exports = {
  metaWhatsApp: {
    accessToken: process.env.META_WA_ACCESS_TOKEN,
    phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID,
    verifyToken: process.env.META_WA_VERIFY_TOKEN || 'zest_eat_meta_verify_8f9q2a',
  },
  knowlarity: {
    apiKey: process.env.KNOWLARITY_API_KEY,
    srNumber: process.env.KNOWLARITY_SR_NUMBER,
  },
  callerdesk: {
    apiKey: process.env.CALLERDESK_API_KEY,
  },
  maqsam: {
    accessKey: process.env.MAQSAM_ACCESS_KEY,
    secretKey: process.env.MAQSAM_SECRET_KEY,
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
  },
  storage: {
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  }
};
