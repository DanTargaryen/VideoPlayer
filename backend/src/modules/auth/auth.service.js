"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var ADMIN_SECRET = '123456';
var ADMIN_USER = {
    username: 'demo_admin',
    email: 'admin@guanlan.dev',
    password: 'Admin123456!',
    nickname: '平台管理员',
};
var BUILTIN_USERS = [
    {
        username: 'live_user_1',
        email: 'live_user_1@guanlan.dev',
        password: 'Live123456!',
        nickname: 'LiveTester1',
    },
    {
        username: 'live_user_2',
        email: 'live_user_2@guanlan.dev',
        password: 'Live123456!',
        nickname: 'LiveTester2',
    },
];
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(prisma) {
            this.prisma = prisma;
        }
        AuthService_1.prototype.register = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var generatedEmail, exists, createdUser;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            generatedEmail = this.buildRegistrationEmail(payload.username);
                            return [4 /*yield*/, this.prisma.user.findFirst({
                                    where: {
                                        OR: [{ username: payload.username }, { email: generatedEmail }],
                                    },
                                })];
                        case 1:
                            exists = _a.sent();
                            if (exists) {
                                throw new common_1.UnauthorizedException('Username or email already exists');
                            }
                            return [4 /*yield*/, this.prisma.user.create({
                                    data: {
                                        username: payload.username,
                                        email: generatedEmail,
                                        password: payload.password,
                                        role: 'USER',
                                        nickname: payload.nickname || payload.username,
                                    },
                                })];
                        case 2:
                            createdUser = _a.sent();
                            return [2 /*return*/, {
                                    id: createdUser.id,
                                    username: createdUser.username,
                                    email: createdUser.email,
                                    role: createdUser.role,
                                    nickname: createdUser.nickname,
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.buildRegistrationEmail = function (username) {
            var encoded = Buffer.from(username, 'utf8').toString('hex');
            return "user-".concat(encoded, "@local.invalid");
        };
        AuthService_1.prototype.login = function (account, password, adminSecret) {
            return __awaiter(this, void 0, void 0, function () {
                var builtin, user, _a, _b;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (adminSecret && !account && !password) {
                                return [2 /*return*/, this.loginWithAdminSecret(adminSecret)];
                            }
                            if (!account || !password) {
                                throw new common_1.UnauthorizedException('Account and password are required');
                            }
                            builtin = BUILTIN_USERS.find(function (item) { return (item.username === account || item.email === account) && item.password === password; });
                            if (!builtin) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.ensureBuiltinUser(builtin)];
                        case 1:
                            _b = _d.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _b = null;
                            _d.label = 3;
                        case 3:
                            if (!((_c = (_b)) !== null && _c !== void 0)) return [3 /*break*/, 4];
                            _a = _c;
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.user.findFirst({
                                where: {
                                    OR: [{ username: account }, { email: account }],
                                },
                            })];
                        case 5:
                            _a = (_d.sent());
                            _d.label = 6;
                        case 6:
                            user = _a;
                            if (!user || user.password !== password) {
                                throw new common_1.UnauthorizedException('Invalid username/email or password');
                            }
                            if (user.role === 'ADMIN' && adminSecret !== ADMIN_SECRET) {
                                throw new common_1.UnauthorizedException('Admin secret is required');
                            }
                            return [2 /*return*/, {
                                    token: "mock-token-".concat(user.id),
                                    userId: user.id,
                                    role: user.role,
                                    nickname: user.nickname,
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.loginWithAdminSecret = function (adminSecret) {
            return __awaiter(this, void 0, void 0, function () {
                var adminUser;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (adminSecret !== ADMIN_SECRET) {
                                throw new common_1.UnauthorizedException('Admin secret is invalid');
                            }
                            return [4 /*yield*/, this.ensureAdminUser()];
                        case 1:
                            adminUser = _a.sent();
                            return [2 /*return*/, {
                                    token: "mock-token-".concat(adminUser.id),
                                    userId: adminUser.id,
                                    role: adminUser.role,
                                    nickname: adminUser.nickname,
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.ensureAdminUser = function () {
            return __awaiter(this, void 0, void 0, function () {
                var existingDemoAdmin, existingAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findFirst({
                                where: {
                                    OR: [{ username: ADMIN_USER.username }, { email: ADMIN_USER.email }],
                                },
                            })];
                        case 1:
                            existingDemoAdmin = _a.sent();
                            if (existingDemoAdmin) {
                                if (existingDemoAdmin.role === 'ADMIN') {
                                    return [2 /*return*/, existingDemoAdmin];
                                }
                                return [2 /*return*/, this.prisma.user.update({
                                        where: { id: existingDemoAdmin.id },
                                        data: {
                                            role: 'ADMIN',
                                        },
                                    })];
                            }
                            return [4 /*yield*/, this.prisma.user.findFirst({
                                    where: { role: 'ADMIN' },
                                })];
                        case 2:
                            existingAdmin = _a.sent();
                            if (existingAdmin) {
                                return [2 /*return*/, existingAdmin];
                            }
                            return [2 /*return*/, this.prisma.user.create({
                                    data: {
                                        username: ADMIN_USER.username,
                                        email: ADMIN_USER.email,
                                        password: ADMIN_USER.password,
                                        role: 'ADMIN',
                                        nickname: ADMIN_USER.nickname,
                                    },
                                })];
                    }
                });
            });
        };
        AuthService_1.prototype.ensureBuiltinUser = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findFirst({
                                where: {
                                    OR: [{ username: payload.username }, { email: payload.email }],
                                },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (existing) {
                                return [2 /*return*/, this.prisma.user.update({
                                        where: { id: existing.id },
                                        data: {
                                            username: payload.username,
                                            email: payload.email,
                                            password: payload.password,
                                            role: 'USER',
                                        },
                                    })];
                            }
                            return [2 /*return*/, this.prisma.user.create({
                                    data: {
                                        username: payload.username,
                                        email: payload.email,
                                        password: payload.password,
                                        role: 'USER',
                                        nickname: payload.nickname,
                                    },
                                })];
                    }
                });
            });
        };
        AuthService_1.prototype.getCurrentUser = function (authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId;
                return __generator(this, function (_a) {
                    token = authHeader === null || authHeader === void 0 ? void 0 : authHeader.replace('Bearer ', '').trim();
                    if (!token) {
                        return [2 /*return*/, null];
                    }
                    userId = Number(token.replace('mock-token-', ''));
                    if (!Number.isFinite(userId)) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, this.prisma.user.findUnique({ where: { id: userId } })];
                });
            });
        };
        AuthService_1.prototype.requireUser = function (authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getCurrentUser(authHeader)];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Login required');
                            }
                            return [2 /*return*/, user];
                    }
                });
            });
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
