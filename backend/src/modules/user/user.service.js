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
exports.UserService = void 0;
var common_1 = require("@nestjs/common");
var UserService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var UserService = _classThis = /** @class */ (function () {
        function UserService_1(prisma, followService) {
            this.prisma = prisma;
            this.followService = followService;
        }
        UserService_1.prototype.getHomepage = function (id, currentUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a, videoCount, followers, followingCount, videos, isFollowing;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: id } })];
                        case 1:
                            user = _b.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('User not found');
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.video.count({ where: { creatorId: id, status: 'PUBLISHED' } }),
                                    this.followService.getFollowerCount(id),
                                    this.prisma.followRelation.count({ where: { followerId: id } }),
                                    this.prisma.video.findMany({
                                        where: { creatorId: id, status: 'PUBLISHED' },
                                        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                                        take: 12,
                                    }),
                                    this.followService.isFollowing(id, currentUserId),
                                ])];
                        case 2:
                            _a = _b.sent(), videoCount = _a[0], followers = _a[1], followingCount = _a[2], videos = _a[3], isFollowing = _a[4];
                            return [2 /*return*/, {
                                    id: user.id,
                                    nickname: user.nickname,
                                    avatarUrl: user.avatarUrl,
                                    bio: user.bio,
                                    followers: followers,
                                    following: followingCount,
                                    videos: videoCount,
                                    isFollowing: isFollowing,
                                    items: videos,
                                }];
                    }
                });
            });
        };
        UserService_1.prototype.deleteAccount = function (userId, password) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 1:
                            user = _a.sent();
                            if (!user || user.password !== password) {
                                throw new common_1.UnauthorizedException('密码验证失败');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var videos, videoIds;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.video.findMany({
                                                    where: { creatorId: userId },
                                                    select: { id: true },
                                                })];
                                            case 1:
                                                videos = _a.sent();
                                                videoIds = videos.map(function (v) { return v.id; });
                                                // Nullify references to preserve audit records
                                                return [4 /*yield*/, tx.videoReview.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } })];
                                            case 2:
                                                // Nullify references to preserve audit records
                                                _a.sent();
                                                return [4 /*yield*/, tx.reportRecord.updateMany({ where: { handlerId: userId }, data: { handlerId: null } })];
                                            case 3:
                                                _a.sent();
                                                return [4 /*yield*/, tx.notification.updateMany({ where: { actorId: userId }, data: { actorId: null } })];
                                            case 4:
                                                _a.sent();
                                                // Delete leaf records owned by user
                                                return [4 /*yield*/, tx.userVideoWatch.deleteMany({ where: { userId: userId } })];
                                            case 5:
                                                // Delete leaf records owned by user
                                                _a.sent();
                                                return [4 /*yield*/, tx.userCategoryPreference.deleteMany({ where: { userId: userId } })];
                                            case 6:
                                                _a.sent();
                                                return [4 /*yield*/, tx.userCreatorPreference.deleteMany({ where: { userId: userId } })];
                                            case 7:
                                                _a.sent();
                                                return [4 /*yield*/, tx.userCreatorPreference.deleteMany({ where: { creatorId: userId } })];
                                            case 8:
                                                _a.sent();
                                                return [4 /*yield*/, tx.userProfileSummary.deleteMany({ where: { userId: userId } })];
                                            case 9:
                                                _a.sent();
                                                return [4 /*yield*/, tx.videoLike.deleteMany({ where: { userId: userId } })];
                                            case 10:
                                                _a.sent();
                                                return [4 /*yield*/, tx.favorite.deleteMany({ where: { userId: userId } })];
                                            case 11:
                                                _a.sent();
                                                return [4 /*yield*/, tx.followRelation.deleteMany({
                                                        where: { OR: [{ followerId: userId }, { followingId: userId }] },
                                                    })];
                                            case 12:
                                                _a.sent();
                                                return [4 /*yield*/, tx.notification.deleteMany({ where: { recipientId: userId } })];
                                            case 13:
                                                _a.sent();
                                                return [4 /*yield*/, tx.reportRecord.deleteMany({ where: { reporterId: userId } })];
                                            case 14:
                                                _a.sent();
                                                if (!(videoIds.length > 0)) return [3 /*break*/, 24];
                                                return [4 /*yield*/, tx.userVideoWatch.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 15:
                                                _a.sent();
                                                return [4 /*yield*/, tx.videoLike.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 16:
                                                _a.sent();
                                                return [4 /*yield*/, tx.favorite.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 17:
                                                _a.sent();
                                                return [4 /*yield*/, tx.reportRecord.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 18:
                                                _a.sent();
                                                return [4 /*yield*/, tx.videoDanmaku.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 19:
                                                _a.sent();
                                                return [4 /*yield*/, tx.comment.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 20:
                                                _a.sent();
                                                return [4 /*yield*/, tx.videoReview.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 21:
                                                _a.sent();
                                                return [4 /*yield*/, tx.videoAsset.deleteMany({ where: { videoId: { in: videoIds } } })];
                                            case 22:
                                                _a.sent();
                                                return [4 /*yield*/, tx.video.deleteMany({ where: { creatorId: userId } })];
                                            case 23:
                                                _a.sent();
                                                _a.label = 24;
                                            case 24: 
                                            // Delete user's own interactions on other videos
                                            return [4 /*yield*/, tx.comment.deleteMany({ where: { userId: userId } })];
                                            case 25:
                                                // Delete user's own interactions on other videos
                                                _a.sent();
                                                return [4 /*yield*/, tx.videoDanmaku.deleteMany({ where: { userId: userId } })];
                                            case 26:
                                                _a.sent();
                                                return [4 /*yield*/, tx.user.delete({ where: { id: userId } })];
                                            case 27:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        UserService_1.prototype.updateProfile = function (userId, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var data, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            data = Object.fromEntries(Object.entries(payload).filter(function (_a) {
                                var value = _a[1];
                                return value !== undefined;
                            }));
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: userId },
                                    data: data,
                                })];
                        case 1:
                            updated = _a.sent();
                            return [2 /*return*/, {
                                    id: updated.id,
                                    username: updated.username,
                                    email: updated.email,
                                    nickname: updated.nickname,
                                    avatarUrl: updated.avatarUrl,
                                    bio: updated.bio,
                                    role: updated.role,
                                }];
                    }
                });
            });
        };
        return UserService_1;
    }());
    __setFunctionName(_classThis, "UserService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserService = _classThis;
}();
exports.UserService = UserService;
