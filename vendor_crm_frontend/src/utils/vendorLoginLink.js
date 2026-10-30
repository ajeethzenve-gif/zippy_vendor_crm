export function getVendorLoginUrl() {
  return "https://zenvepartners.com/";
}

export function buildVendorLoginMessage(vendorName, login) {
  const passwordLine = login.initial_password
    ? `Password: ${login.initial_password}`
    : "Password: use your current password. If you do not remember it, use mobile OTP login or reset your password.";
  return `*Zenve Vendor Login*

Hello *${vendorName}*,

Sign in to your vendor account using this link:
${getVendorLoginUrl()}

Username: ${login.username}
${passwordLine}

Enter your username and password, then verify the OTP sent to your registered mobile number to complete login. You can also choose mobile OTP login.

Do not share your password or OTP with anyone. If you need help accessing your account, please contact our team.

Team Zenve`;
}
