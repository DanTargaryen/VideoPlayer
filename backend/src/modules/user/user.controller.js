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
exports.UserController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var class_validator_1 = require("class-validator");
var DeleteAccountDto = function () {
    var _a;
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    return _a = /** @class */ (function () {
            function DeleteAccountDto() {
                this.password = __runInitializers(this, _password_initializers, void 0);
                __runInitializers(this, _password_extraInitializers);
            }
            return DeleteAccountDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _password_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var api_response_dto_1 = require("../../common/dto/api-response.dto");
var UpdateProfileDto = function () {
    var _a;
    var _nickname_decorators;
    var _nickname_initializers = [];
    var _nickname_extraInitializers = [];
    var _avatarUrl_decorators;
    var _avatarUrl_initializers = [];
    var _avatarUrl_extraInitializers = [];
    var _bio_decorators;
    var _bio_initializers = [];
    var _bio_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateProfileDto() {
                this.nickname = __runInitializers(this, _nickname_initializers, void 0);
                this.avatarUrl = (__runInitializers(this, _nickname_extraInitializers), __runInitializers(this, _avatarUrl_initializers, void 0));
                this.bio = (__runInitializers(this, _avatarUrl_extraInitializers), __runInitializers(this, _bio_initializers, void 0));
                __runInitializers(this, _bio_extraInitializers);
            }
            return UpdateProfileDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _nickname_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _avatarUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(255)];
            _bio_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(255)];
            __esDecorate(null, null, _nickname_decorators, { kind: "field", name: "nickname", static: false, private: false, access: { has: function (obj) { return "nickname" in obj; }, get: function (obj) { return obj.nickname; }, set: function (obj, value) { obj.nickname = value; } }, metadata: _metadata }, _nickname_initializers, _nickname_extraInitializers);
            __esDecorate(null, null, _avatarUrl_decorators, { kind: "field", name: "avatarUrl", static: false, private: false, access: { has: function (obj) { return "avatarUrl" in obj; }, get: function (obj) { return obj.avatarUrl; }, set: function (obj, value) { obj.avatarUrl = value; } }, metadata: _metadata }, _avatarUrl_initializers, _avatarUrl_extraInitializers);
            __esDecorate(null, null, _bio_decorators, { kind: "field", name: "bio", static: false, private: false, access: { has: function (obj) { return "bio" in obj; }, get: function (obj) { return obj.bio; }, set: function (obj, value) { obj.bio = value; } }, metadata: _metadata }, _bio_initializers, _bio_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var UserController = function () {
    var _classDecorators = [(0, common_1.Controller)('users')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _uploadAvatar_decorators;
    var _updateProfile_decorators;
    var _getRecommendationProfile_decorators;
    var _rebuildRecommendationProfile_decorators;
    var _deleteAccount_decorators;
    var _getHomepage_decorators;
    var UserController = _classThis = /** @class */ (function () {
        function UserController_1(userService, authService, minioService, prisma, userProfileService) {
            this.userService = (__runInitializers(this, _instanceExtraInitializers), userService);
            this.authService = authService;
            this.minioService = minioService;
            this.prisma = prisma;
            this.userProfileService = userProfileService;
        }
        UserController_1.prototype.uploadAvatar = function (authorization, file) {
            return __awaiter(this, void 0, void 0, function () {
                var user, datePrefix, objectKey, uploaded;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            if (!file) {
                                throw new common_1.BadRequestException('Avatar file is required');
                            }
                            datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
                            objectKey = "avatars/".concat(datePrefix, "/").concat(Date.now(), "-").concat(file.originalname);
                            return [4 /*yield*/, this.minioService.uploadObject({
                                    objectKey: objectKey,
                                    buffer: file.buffer,
                                    size: file.size,
                                    mimeType: file.mimetype,
                                    originalName: file.originalname,
                                })];
                        case 2:
                            uploaded = _a.sent();
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: user.id },
                                    data: { avatarUrl: uploaded.url },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)({ avatarUrl: uploaded.url })];
                    }
                });
            });
        };
        UserController_1.prototype.updateProfile = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.userService.updateProfile(user.id, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        UserController_1.prototype.getRecommendationProfile = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.userProfileService.getProfile(user.id, true)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        UserController_1.prototype.rebuildRecommendationProfile = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.userProfileService.buildAndSaveProfile(user.id)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        UserController_1.prototype.deleteAccount = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [4 /*yield*/, this.userService.deleteAccount(user.id, dto.password)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)({ deleted: true })];
                    }
                });
            });
        };
        UserController_1.prototype.getHomepage = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.getCurrentUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.userService.getHomepage(id, user === null || user === void 0 ? void 0 : user.id)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        return UserController_1;
    }());
    __setFunctionName(_classThis, "UserController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _uploadAvatar_decorators = [(0, common_1.Post)('avatar'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file'))];
        _updateProfile_decorators = [(0, common_1.Put)('profile')];
        _getRecommendationProfile_decorators = [(0, common_1.Get)('profile/recommendation')];
        _rebuildRecommendationProfile_decorators = [(0, common_1.Post)('profile/recommendation/rebuild')];
        _deleteAccount_decorators = [(0, common_1.Delete)('me')];
        _getHomepage_decorators = [(0, common_1.Get)(':id/homepage')];
        __esDecorate(_classThis, null, _uploadAvatar_decorators, { kind: "method", name: "uploadAvatar", static: false, private: false, access: { has: function (obj) { return "uploadAvatar" in obj; }, get: function (obj) { return obj.uploadAvatar; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: function (obj) { return "updateProfile" in obj; }, get: function (obj) { return obj.updateProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getRecommendationProfile_decorators, { kind: "method", name: "getRecommendationProfile", static: false, private: false, access: { has: function (obj) { return "getRecommendationProfile" in obj; }, get: function (obj) { return obj.getRecommendationProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rebuildRecommendationProfile_decorators, { kind: "method", name: "rebuildRecommendationProfile", static: false, private: false, access: { has: function (obj) { return "rebuildRecommendationProfile" in obj; }, get: function (obj) { return obj.rebuildRecommendationProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteAccount_decorators, { kind: "method", name: "deleteAccount", static: false, private: false, access: { has: function (obj) { return "deleteAccount" in obj; }, get: function (obj) { return obj.deleteAccount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getHomepage_decorators, { kind: "method", name: "getHomepage", static: false, private: false, access: { has: function (obj) { return "getHomepage" in obj; }, get: function (obj) { return obj.getHomepage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserController = _classThis;
}();
exports.UserController = UserController;
