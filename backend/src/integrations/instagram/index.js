// Instagram Direct Messaging Integration Adapter
module.exports = {
  sendMessage: async (recipientId, text) => {
    console.log(`[Instagram Integration] Send message to ${recipientId}: ${text}`);
    return { success: true };
  }
};
