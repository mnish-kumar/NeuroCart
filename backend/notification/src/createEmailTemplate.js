const getWelcomeEmailHtml = (data) => {
  const firstName = data.fullName.firstName || "there";
  const lastName = data.fullName.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to NeuroCart</title>
</head>
<body style="margin:0;padding:0;background:#eae6e0;font-family:Arial,sans-serif;">
 
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eae6e0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#faf8f5;border-radius:6px;
                    overflow:hidden;border:1px solid #ddd8d0;">
 
        <!-- ── HEADER ── -->
        <tr>
          <td style="background:#0d0d0d;padding:36px 48px 32px;">
 
            <!-- Logo row -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="width:30px;height:30px;background:#5865f2;border-radius:7px;
                           text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:15px;font-weight:bold;">N</span>
                </td>
                <td style="padding-left:10px;font-size:17px;font-weight:500;
                           color:#faf8f5;letter-spacing:0.01em;">
                  NeuroCart
                </td>
              </tr>
            </table>
 
            <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.18em;
                      text-transform:uppercase;color:#5865f2;font-weight:bold;">
              Welcome aboard
            </p>
            <p style="margin:0;font-size:26px;color:#faf8f5;line-height:1.25;
                      font-style:italic;font-family:Georgia,serif;">
              You're in. Let's<br>start shopping.
            </p>
          </td>
        </tr>
 
        <!-- ── BODY ── -->
        <tr>
          <td style="padding:40px 48px;">
 
            <p style="margin:0 0 6px;font-size:13px;color:#999;">
              Hello, ${fullName} —
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#3a3a3a;line-height:1.75;">
              Thanks for joining NeuroCart! Your account is live and we've got
              everything set up so you can dive in right away. Here's what's waiting for you:
            </p>
 
            <!-- Feature grid -->
            <table width="100%" cellpadding="0" cellspacing="1"
                   style="background:#ddd8d0;border-radius:4px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td width="33%" style="background:#faf8f5;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 8px;font-size:18px;">🧠</p>
                  <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#3a3a3a;">Smart picks</p>
                  <p style="margin:0;font-size:11px;color:#888;line-height:1.5;">AI-curated products just for you</p>
                </td>
                <td width="33%" style="background:#faf8f5;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 8px;font-size:18px;">⚡</p>
                  <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#3a3a3a;">Fast checkout</p>
                  <p style="margin:0;font-size:11px;color:#888;line-height:1.5;">One-tap payment, no friction</p>
                </td>
                <td width="33%" style="background:#faf8f5;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 8px;font-size:18px;">📦</p>
                  <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#3a3a3a;">Live tracking</p>
                  <p style="margin:0;font-size:11px;color:#888;line-height:1.5;">Know exactly where your order is</p>
                </td>
              </tr>
            </table>
 
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr>
                <td align="center">
                  <a href="https://neurocart.com"
                     style="display:inline-block;background:#5865f2;color:#fff;
                            text-decoration:none;font-size:12px;letter-spacing:0.1em;
                            text-transform:uppercase;font-weight:bold;padding:14px 40px;
                            border-radius:4px;font-family:Arial,sans-serif;">
                    Start Shopping
                  </a>
                </td>
              </tr>
            </table>
            <p style="text-align:center;margin:10px 0 28px;font-size:12px;color:#aaa;">
              neurocart.com — always open
            </p>
 
            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr><td style="border-top:1px solid #e0dbd3;">&nbsp;</td></tr>
            </table>
 
            <p style="margin:0 0 14px;font-size:13px;color:#666;line-height:1.8;">
              If you ever need help, our support team is just a message away.
              We hope you enjoy every order.
            </p>
            <p style="margin:0;font-size:13px;color:#666;">— The NeuroCart Team</p>
 
          </td>
        </tr>
 
        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#0d0d0d;padding:24px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#555;font-style:italic;font-family:Georgia,serif;">
                  NeuroCart &copy; ${year}
                </td>
                <td align="right">
                  <a href="#" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;
                                     color:#555;text-decoration:none;margin-left:16px;">Unsubscribe</a>
                  <a href="#" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;
                                     color:#555;text-decoration:none;margin-left:16px;">Privacy</a>
                  <a href="#" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;
                                     color:#555;text-decoration:none;margin-left:16px;">Help</a>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border-top:1px solid #2a2a2a;padding-top:14px;margin-top:12px;">
                  <p style="margin:14px 0 0;font-size:11px;color:#444;line-height:1.6;">
                    You're receiving this because you created a NeuroCart account at neurocart.com.
                    To unsubscribe, <a href="#" style="color:#666;text-decoration:underline;">click here</a>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
 
      </table>
    </td></tr>
  </table>
 
</body>
</html>`;
};

module.exports = { getWelcomeEmailHtml };
