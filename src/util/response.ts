export const response = {
  SUCCESS: { code: 1, message: "Everything worked as expected" }, // - Success
  INVALID_AUTH_TOKEN: { code: 204, message: "The auth token is invalid" },
  INVALID_EMAIL: { code: 206, message: "The email is invalid" },
  INVALID: { code: 206, message: "Is invalid" },
  USER_NOT_FOUND: { code: 206, message: "user not found" },
  CLIENT_ERROR: { code: 206, message: "Client error" },
  CHANNEL_NOT_FOUND: { code: 206, message: "Channel not found" },
};
