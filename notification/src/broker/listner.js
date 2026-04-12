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
};
