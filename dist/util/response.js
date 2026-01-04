"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.response = void 0;
exports.response = {
    SUCCESS: { code: 1, message: 'Everything worked as expected' }, // - Success
    INVALID_AUTH_TOKEN: { code: 204, message: 'The auth token is invalid' },
    INVALID_EMAIL: { code: 206, message: 'The email is invalid' },
    USER_NOT_FOUND: { code: 206, message: 'user not found' },
    CHANNEL_NOT_FOUND: { code: 206, message: 'Channel not found' }
};
