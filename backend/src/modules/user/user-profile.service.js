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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileService = void 0;
var common_1 = require("@nestjs/common");
var categories_1 = require("../../common/constants/categories");
var user_profile_constants_1 = require("./user-profile.constants");
var CATEGORY_META = new Map(categories_1.CATEGORY_DEFINITIONS.filter(function (item) { return item.id !== null; }).map(function (item) { return [
    item.id,
    { code: item.code, label: item.label },
]; }));
var UserProfileService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var UserProfileService = _classThis = /** @class */ (function () {
        function UserProfileService_1(prisma) {
            this.prisma = prisma;
        }
        UserProfileService_1.prototype.getProfile = function (userId_1) {
            return __awaiter(this, arguments, void 0, function (userId, autoBuild) {
                var summary, _a, categoryPreferences, creatorPreferences;
                var _this = this;
                if (autoBuild === void 0) { autoBuild = true; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.ensureUserExists(userId)];
                        case 1:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.userProfileSummary.findUnique({ where: { userId: userId } })];
                        case 2:
                            summary = _b.sent();
                            if (!summary && autoBuild) {
                                return [2 /*return*/, this.buildAndSaveProfile(userId)];
                            }
                            if (!summary) {
                                throw new common_1.NotFoundException('User profile not found');
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.userCategoryPreference.findMany({
                                        where: { userId: userId },
                                        orderBy: [{ score: 'desc' }, { categoryId: 'asc' }],
                                    }),
                                    this.prisma.userCreatorPreference.findMany({
                                        where: { userId: userId },
                                        include: {
                                            creator: {
                                                select: {
                                                    id: true,
                                                    nickname: true,
                                                },
                                            },
                                        },
                                        orderBy: [{ score: 'desc' }, { creatorId: 'asc' }],
                                    }),
                                ])];
                        case 3:
                            _a = _b.sent(), categoryPreferences = _a[0], creatorPreferences = _a[1];
                            return [2 /*return*/, {
                                    userId: userId,
                                    summary: {
                                        activityScore: summary.activityScore,
                                        activityLevel: summary.activityLevel,
                                        behaviorSignalCount: summary.behaviorSignalCount,
                                        viewerScore: summary.viewerScore,
                                        creatorScore: summary.creatorScore,
                                        creatorViewerTendency: summary.creatorViewerTendency,
                                        isColdStart: summary.isColdStart,
                                        updatedAt: summary.updatedAt,
                                    },
                                    categoryPreferences: categoryPreferences.map(function (item) { return _this.toCategoryPreferenceDto(item.categoryId, item.score); }),
                                    creatorPreferences: creatorPreferences.map(function (item) { return ({
                                        creatorId: item.creatorId,
                                        creatorNickname: item.creator.nickname,
                                        score: item.score,
                                    }); }),
                                }];
                    }
                });
            });
        };
        UserProfileService_1.prototype.buildAndSaveProfile = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, likes, favorites, comments, danmakus, follows, createdVideos, videoWatches, categoryScores, creatorScores, _i, likes_1, item, _b, favorites_1, item, _c, comments_1, item, _d, danmakus_1, item, _e, follows_1, item, _f, createdVideos_1, item, meaningfulWatchSignalCount, watchActivityScore, watchViewerScore, _g, videoWatches_1, item, isMeaningfulWatch, behaviorSignalCount, activityScore, viewerScore, creatorScore, isColdStart, activityLevel, creatorViewerTendency, categoryPreferences, creatorPreferences, summary;
                var _this = this;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0: return [4 /*yield*/, this.ensureUserExists(userId)];
                        case 1:
                            _h.sent();
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.videoLike.findMany({
                                        where: {
                                            userId: userId,
                                            video: {
                                                status: 'PUBLISHED',
                                            },
                                        },
                                        select: {
                                            video: {
                                                select: {
                                                    category: true,
                                                    creatorId: true,
                                                },
                                            },
                                        },
                                    }),
                                    this.prisma.favorite.findMany({
                                        where: {
                                            userId: userId,
                                            video: {
                                                status: 'PUBLISHED',
                                            },
                                        },
                                        select: {
                                            video: {
                                                select: {
                                                    category: true,
                                                    creatorId: true,
                                                },
                                            },
                                        },
                                    }),
                                    this.prisma.comment.findMany({
                                        where: {
                                            userId: userId,
                                            status: 'NORMAL',
                                            video: {
                                                status: 'PUBLISHED',
                                            },
                                        },
                                        select: {
                                            video: {
                                                select: {
                                                    category: true,
                                                    creatorId: true,
                                                },
                                            },
                                        },
                                    }),
                                    this.prisma.videoDanmaku.findMany({
                                        where: {
                                            userId: userId,
                                            status: 'NORMAL',
                                            video: {
                                                status: 'PUBLISHED',
                                            },
                                        },
                                        select: {
                                            video: {
                                                select: {
                                                    category: true,
                                                    creatorId: true,
                                                },
                                            },
                                        },
                                    }),
                                    this.prisma.followRelation.findMany({
                                        where: { followerId: userId },
                                        select: { followingId: true },
                                    }),
                                    this.prisma.video.findMany({
                                        where: { creatorId: userId },
                                        select: {
                                            category: true,
                                        },
                                    }),
                                    this.prisma.userVideoWatch.findMany({
                                        where: {
                                            userId: userId,
                                            video: {
                                                status: 'PUBLISHED',
                                            },
                                        },
                                        select: {
                                            playCount: true,
                                            totalWatchDurationSeconds: true,
                                            lastWatchDurationSeconds: true,
                                            videoDurationSeconds: true,
                                            maxWatchRatio: true,
                                            lastWatchRatio: true,
                                            completedCount: true,
                                            video: {
                                                select: {
                                                    category: true,
                                                    creatorId: true,
                                                },
                                            },
                                        },
                                    }),
                                ])];
                        case 2:
                            _a = _h.sent(), likes = _a[0], favorites = _a[1], comments = _a[2], danmakus = _a[3], follows = _a[4], createdVideos = _a[5], videoWatches = _a[6];
                            categoryScores = new Map();
                            creatorScores = new Map();
                            // The first version of the profile is intentionally simple:
                            // we aggregate category and creator preferences from explicit interaction signals.
                            for (_i = 0, likes_1 = likes; _i < likes_1.length; _i++) {
                                item = likes_1[_i];
                                this.addScore(categoryScores, this.resolveVideoCategoryId(item.video.category), user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.category.like);
                                this.addScore(creatorScores, item.video.creatorId, user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.creator.like);
                            }
                            for (_b = 0, favorites_1 = favorites; _b < favorites_1.length; _b++) {
                                item = favorites_1[_b];
                                this.addScore(categoryScores, this.resolveVideoCategoryId(item.video.category), user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.category.favorite);
                                this.addScore(creatorScores, item.video.creatorId, user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.creator.favorite);
                            }
                            for (_c = 0, comments_1 = comments; _c < comments_1.length; _c++) {
                                item = comments_1[_c];
                                this.addScore(categoryScores, this.resolveVideoCategoryId(item.video.category), user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.category.comment);
                                this.addScore(creatorScores, item.video.creatorId, user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.creator.comment);
                            }
                            for (_d = 0, danmakus_1 = danmakus; _d < danmakus_1.length; _d++) {
                                item = danmakus_1[_d];
                                this.addScore(categoryScores, this.resolveVideoCategoryId(item.video.category), user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.category.danmaku);
                                this.addScore(creatorScores, item.video.creatorId, user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.creator.danmaku);
                            }
                            for (_e = 0, follows_1 = follows; _e < follows_1.length; _e++) {
                                item = follows_1[_e];
                                this.addScore(creatorScores, item.followingId, user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.creator.follow);
                            }
                            for (_f = 0, createdVideos_1 = createdVideos; _f < createdVideos_1.length; _f++) {
                                item = createdVideos_1[_f];
                                this.addScore(categoryScores, this.resolveVideoCategoryId(item.category), user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.category.createdVideo);
                            }
                            meaningfulWatchSignalCount = 0;
                            watchActivityScore = 0;
                            watchViewerScore = 0;
                            for (_g = 0, videoWatches_1 = videoWatches; _g < videoWatches_1.length; _g++) {
                                item = videoWatches_1[_g];
                                this.addScore(categoryScores, this.resolveVideoCategoryId(item.video.category), this.calculateWatchCategoryScore(item));
                                this.addScore(creatorScores, item.video.creatorId, this.calculateWatchCreatorScore(item));
                                isMeaningfulWatch = item.totalWatchDurationSeconds >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.coldStartWatchSeconds ||
                                    item.maxWatchRatio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.coldStartWatchRatio;
                                if (isMeaningfulWatch) {
                                    meaningfulWatchSignalCount += 1;
                                }
                                watchActivityScore += this.calculateWatchActivityScore(item);
                                watchViewerScore += this.calculateWatchViewerScore(item);
                            }
                            behaviorSignalCount = likes.length +
                                favorites.length +
                                comments.length +
                                danmakus.length +
                                follows.length +
                                createdVideos.length +
                                meaningfulWatchSignalCount;
                            activityScore = likes.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.activity.like +
                                favorites.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.activity.favorite +
                                comments.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.activity.comment +
                                danmakus.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.activity.danmaku +
                                follows.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.activity.follow +
                                createdVideos.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.activity.createdVideo +
                                watchActivityScore;
                            viewerScore = likes.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerLike +
                                favorites.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerFavorite +
                                comments.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerComment +
                                danmakus.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerDanmaku +
                                follows.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerFollow +
                                watchViewerScore;
                            creatorScore = createdVideos.length * user_profile_constants_1.USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.creatorVideo;
                            isColdStart = behaviorSignalCount === 0;
                            activityLevel = this.resolveActivityLevel(activityScore);
                            creatorViewerTendency = this.resolveCreatorViewerTendency(viewerScore, creatorScore, isColdStart);
                            categoryPreferences = this.sortScoreMap(categoryScores).map(function (_a) {
                                var categoryId = _a[0], score = _a[1];
                                return _this.toCategoryPreferenceDto(categoryId, score);
                            });
                            return [4 /*yield*/, this.buildCreatorPreferenceDtos(creatorScores)];
                        case 3:
                            creatorPreferences = _h.sent();
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.userCategoryPreference.deleteMany({ where: { userId: userId } })];
                                            case 1:
                                                _a.sent();
                                                if (!(categoryPreferences.length > 0)) return [3 /*break*/, 3];
                                                return [4 /*yield*/, tx.userCategoryPreference.createMany({
                                                        data: categoryPreferences.map(function (item) { return ({
                                                            userId: userId,
                                                            categoryId: item.categoryId,
                                                            score: item.score,
                                                        }); }),
                                                    })];
                                            case 2:
                                                _a.sent();
                                                _a.label = 3;
                                            case 3: return [4 /*yield*/, tx.userCreatorPreference.deleteMany({ where: { userId: userId } })];
                                            case 4:
                                                _a.sent();
                                                if (!(creatorPreferences.length > 0)) return [3 /*break*/, 6];
                                                return [4 /*yield*/, tx.userCreatorPreference.createMany({
                                                        data: creatorPreferences.map(function (item) { return ({
                                                            userId: userId,
                                                            creatorId: item.creatorId,
                                                            score: item.score,
                                                        }); }),
                                                    })];
                                            case 5:
                                                _a.sent();
                                                _a.label = 6;
                                            case 6: return [4 /*yield*/, tx.userProfileSummary.upsert({
                                                    where: { userId: userId },
                                                    create: {
                                                        userId: userId,
                                                        activityScore: activityScore,
                                                        activityLevel: activityLevel,
                                                        behaviorSignalCount: behaviorSignalCount,
                                                        viewerScore: viewerScore,
                                                        creatorScore: creatorScore,
                                                        creatorViewerTendency: creatorViewerTendency,
                                                        isColdStart: isColdStart,
                                                    },
                                                    update: {
                                                        activityScore: activityScore,
                                                        activityLevel: activityLevel,
                                                        behaviorSignalCount: behaviorSignalCount,
                                                        viewerScore: viewerScore,
                                                        creatorScore: creatorScore,
                                                        creatorViewerTendency: creatorViewerTendency,
                                                        isColdStart: isColdStart,
                                                    },
                                                })];
                                            case 7:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 4:
                            _h.sent();
                            return [4 /*yield*/, this.prisma.userProfileSummary.findUniqueOrThrow({ where: { userId: userId } })];
                        case 5:
                            summary = _h.sent();
                            return [2 /*return*/, {
                                    userId: userId,
                                    summary: {
                                        activityScore: summary.activityScore,
                                        activityLevel: summary.activityLevel,
                                        behaviorSignalCount: summary.behaviorSignalCount,
                                        viewerScore: summary.viewerScore,
                                        creatorScore: summary.creatorScore,
                                        creatorViewerTendency: summary.creatorViewerTendency,
                                        isColdStart: summary.isColdStart,
                                        updatedAt: summary.updatedAt,
                                    },
                                    categoryPreferences: categoryPreferences,
                                    creatorPreferences: creatorPreferences,
                                }];
                    }
                });
            });
        };
        UserProfileService_1.prototype.buildCreatorPreferenceDtos = function (scoreMap) {
            return __awaiter(this, void 0, void 0, function () {
                var sortedScores, creators, creatorIndex;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sortedScores = this.sortScoreMap(scoreMap);
                            if (sortedScores.length === 0) {
                                return [2 /*return*/, []];
                            }
                            return [4 /*yield*/, this.prisma.user.findMany({
                                    where: {
                                        id: {
                                            in: sortedScores.map(function (_a) {
                                                var creatorId = _a[0];
                                                return creatorId;
                                            }),
                                        },
                                    },
                                    select: {
                                        id: true,
                                        nickname: true,
                                    },
                                })];
                        case 1:
                            creators = _a.sent();
                            creatorIndex = new Map(creators.map(function (item) { return [item.id, item.nickname]; }));
                            return [2 /*return*/, sortedScores
                                    .map(function (_a) {
                                    var creatorId = _a[0], score = _a[1];
                                    var creatorNickname = creatorIndex.get(creatorId);
                                    if (!creatorNickname) {
                                        return null;
                                    }
                                    return {
                                        creatorId: creatorId,
                                        creatorNickname: creatorNickname,
                                        score: score,
                                    };
                                })
                                    .filter(function (item) { return item !== null; })];
                    }
                });
            });
        };
        UserProfileService_1.prototype.toCategoryPreferenceDto = function (categoryId, score) {
            var _a, _b;
            var meta = CATEGORY_META.get(categoryId);
            return {
                categoryId: categoryId,
                categoryCode: (_a = meta === null || meta === void 0 ? void 0 : meta.code) !== null && _a !== void 0 ? _a : "category-".concat(categoryId),
                categoryLabel: (_b = meta === null || meta === void 0 ? void 0 : meta.label) !== null && _b !== void 0 ? _b : "\u5206\u533A ".concat(categoryId),
                score: score,
            };
        };
        UserProfileService_1.prototype.sortScoreMap = function (scoreMap) {
            return __spreadArray([], scoreMap.entries(), true).sort(function (left, right) { return right[1] - left[1] || left[0] - right[0]; });
        };
        UserProfileService_1.prototype.addScore = function (scoreMap, key, score) {
            var _a;
            if (!key) {
                return;
            }
            scoreMap.set(key, ((_a = scoreMap.get(key)) !== null && _a !== void 0 ? _a : 0) + score);
        };
        UserProfileService_1.prototype.resolveVideoCategoryId = function (categoryCode) {
            return (0, categories_1.resolveCategoryId)(categoryCode !== null && categoryCode !== void 0 ? categoryCode : undefined);
        };
        UserProfileService_1.prototype.calculateWatchCategoryScore = function (item) {
            var durationBonus = Math.min(item.totalWatchDurationSeconds / user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.durationSecondsDivisor, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.durationMaxBonus);
            var playBonus = Math.min(item.playCount, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.maxPlayContribution) *
                user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.play;
            var completionBonus = Math.min(item.completedCount, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.maxCompletedContribution) *
                user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.completed;
            return (playBonus +
                this.resolveWatchRatioBonus(item.maxWatchRatio, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.warmRatio, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.deepRatio, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.category.completeRatio) +
                durationBonus +
                completionBonus);
        };
        UserProfileService_1.prototype.calculateWatchCreatorScore = function (item) {
            var durationBonus = Math.min(item.totalWatchDurationSeconds / user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.durationSecondsDivisor, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.durationMaxBonus);
            var playBonus = Math.min(item.playCount, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.maxPlayContribution) *
                user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.play;
            var completionBonus = Math.min(item.completedCount, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.maxCompletedContribution) *
                user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.completed;
            return (playBonus +
                this.resolveWatchRatioBonus(item.maxWatchRatio, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.warmRatio, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.deepRatio, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.creator.completeRatio) +
                durationBonus +
                completionBonus);
        };
        UserProfileService_1.prototype.calculateWatchActivityScore = function (item) {
            var score = Math.min(item.playCount, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.activity.maxPlayContribution) *
                user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.activity.play;
            if (item.maxWatchRatio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.deepRatio) {
                score += user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.activity.deepWatch;
            }
            else if (item.maxWatchRatio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.warmRatio) {
                score += user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.activity.warmWatch;
            }
            score += item.completedCount * user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.activity.complete;
            return score;
        };
        UserProfileService_1.prototype.calculateWatchViewerScore = function (item) {
            var score = Math.min(item.playCount, user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.tendency.maxPlayContribution) *
                user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.tendency.play;
            if (item.maxWatchRatio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.deepRatio) {
                score += user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.tendency.deepWatch;
            }
            score += item.completedCount * user_profile_constants_1.USER_PROFILE_WATCH_WEIGHTS.tendency.complete;
            return score;
        };
        UserProfileService_1.prototype.resolveWatchRatioBonus = function (ratio, warmScore, deepScore, completeScore) {
            if (ratio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.completeRatio) {
                return completeScore;
            }
            if (ratio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.deepRatio) {
                return deepScore;
            }
            if (ratio >= user_profile_constants_1.USER_PROFILE_WATCH_THRESHOLDS.warmRatio) {
                return warmScore;
            }
            return 0;
        };
        UserProfileService_1.prototype.resolveActivityLevel = function (activityScore) {
            if (activityScore >= user_profile_constants_1.USER_PROFILE_ACTIVITY_THRESHOLDS.high) {
                return 'HIGH';
            }
            if (activityScore >= user_profile_constants_1.USER_PROFILE_ACTIVITY_THRESHOLDS.medium) {
                return 'MEDIUM';
            }
            return 'LOW';
        };
        UserProfileService_1.prototype.resolveCreatorViewerTendency = function (viewerScore, creatorScore, isColdStart) {
            if (isColdStart) {
                return 'COLD_START';
            }
            if (creatorScore >= Math.max(5, viewerScore * 1.5)) {
                return 'CREATOR';
            }
            if (viewerScore >= Math.max(5, creatorScore * 1.5)) {
                return 'VIEWER';
            }
            return 'BALANCED';
        };
        UserProfileService_1.prototype.ensureUserExists = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('User not found');
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        return UserProfileService_1;
    }());
    __setFunctionName(_classThis, "UserProfileService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserProfileService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserProfileService = _classThis;
}();
exports.UserProfileService = UserProfileService;
