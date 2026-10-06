// Payment Integration Adapter (Razorpay / Stripe)
module.exports = {
  createOrder: async (amount, currency = 'INR') => {
    return { orderId: `ord_${Date.now()}`, amount, currency };
  }
};
