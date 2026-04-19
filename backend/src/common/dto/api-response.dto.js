"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
function ok(data, message) {
    if (message === void 0) { message = 'ok'; }
    return {
        code: 0,
        message: message,
        data: data,
    };
}
