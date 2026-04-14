const { subscribeToQueue } = require("./broker");
const sendEmail = require("../email");
const { getWelcomeEmailHtml } = require("../createEmailTemplate");

module.exports = function () {
  subscribeToQueue("AUTH_NOTIFICATIONS_USER_REGISTRATION", async (data) => {
    await sendEmail(
      data.email,
      "Welcome to NeuroCart 🎉",
      `Hi ${data.fullName.firstName}, welcome! Start shopping at https://neurocart.com`,
      getWelcomeEmailHtml(data),
    );
  });

  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {
    const emailContent = `
      Hi ${data.username}, we have successfully processed your payment of ${data.amount/100} ${data.currency} for order ${data.orderId}. Thank you for shopping with us!
    `;

    await sendEmail(
      data.email,
      "Payment Processed - NeuroCart",
      emailContent,
      `<p>${emailContent}</p>`,
    );
  });

  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", async (data) => {
    const emailContent = `
      Hi ${data.username}, we have received your payment of ${data.amount/100} ${data.currency} for order ${data.orderId}. We will notify you once the payment is processed.
    `;
    await sendEmail(
      data.email,
      "Payment Received - NeuroCart",
      emailContent,
      `<p>${emailContent}</p>`,
    );
  });

  subscribeToQueue("PRODUCT_NOTIFICATIONS_PRODUCT_CREATED", async (data) => {
    const emailContent = `
      Hi, your product with ID ${data.productId} has been successfully created and is now live on NeuroCart. Start sharing it with your customers!
    `;
    await sendEmail(
      data.email,
      "Product Created - NeuroCart",
      emailContent,
      `<p>${emailContent}</p>`,
    );
  })
};
