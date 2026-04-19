"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.VideoService = void 0;
var common_1 = require("@nestjs/common");
var categories_1 = require("../../common/constants/categories");
var video_watch_constants_1 = require("./video-watch.constants");
var CATEGORY_SEARCH_META = new Map(categories_1.CATEGORY_DEFINITIONS.filter(function (item) { return item.id !== null; }).map(function (item) { return [
    item.code,
    {
        code: item.code.toLowerCase(),
        label: item.label.toLowerCase(),
    },
]; }));
var VideoService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var VideoService = _classThis = /** @class */ (function () {
        function VideoService_1(prisma, followService, userProfileService, mediaService, minioService) {
            this.prisma = prisma;
            this.followService = followService;
            this.userProfileService = userProfileService;
            this.mediaService = mediaService;
            this.minioService = minioService;
        }
        VideoService_1.prototype.uploadFile = function (file_1) {
            return __awaiter(this, arguments, void 0, function (file, assetType) {
                var datePrefix, folder, objectKey, uploaded, asset;
                if (assetType === void 0) { assetType = 'ORIGINAL'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
                            folder = assetType === 'COVER' ? 'videos/covers' : assetType === 'RECORDING' ? 'videos/recordings' : 'videos/original';
                            objectKey = "".concat(folder, "/").concat(datePrefix, "/").concat(this.buildStorageFileName(file.originalname));
                            return [4 /*yield*/, this.minioService.uploadObject({
                                    objectKey: objectKey,
                                    buffer: file.buffer,
                                    size: file.size,
                                    mimeType: file.mimetype,
                                    originalName: file.originalname,
                                })];
                        case 1:
                            uploaded = _a.sent();
                            return [4 /*yield*/, this.prisma.videoAsset.create({
                                    data: {
                                        assetType: assetType,
                                        objectKey: uploaded.objectKey,
                                        bucket: uploaded.bucket,
                                        mimeType: file.mimetype,
                                        originalName: file.originalname,
                                        fileSize: file.size,
                                        url: uploaded.url,
                                    },
                                })];
                        case 2:
                            asset = _a.sent();
                            return [2 /*return*/, {
                                    assetId: asset.id,
                                    uploadToken: asset.objectKey,
                                    url: asset.url,
                                    objectKey: asset.objectKey,
                                    assetType: assetType,
                                }];
                    }
                });
            });
        };
        VideoService_1.prototype.createVideo = function (user, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var asset, coverUrl, coverAsset, video;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.resolveAsset(payload.assetId, payload.uploadToken, 'Uploaded asset not found')];
                        case 1:
                            asset = _d.sent();
                            if (!asset) {
                                throw new common_1.NotFoundException('Uploaded asset not found');
                            }
                            coverUrl = (_a = payload.coverUrl) !== null && _a !== void 0 ? _a : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                            return [4 /*yield*/, this.resolveAsset(payload.coverAssetId, payload.coverUploadToken, 'Cover asset not found')];
                        case 2:
                            coverAsset = _d.sent();
                            if (coverAsset) {
                                coverUrl = coverAsset.url;
                            }
                            return [4 /*yield*/, this.prisma.video.create({
                                    data: {
                                        creatorId: user.id,
                                        title: payload.title,
                                        description: (_b = payload.description) !== null && _b !== void 0 ? _b : '',
                                        category: payload.category,
                                        coverUrl: coverUrl,
                                        playUrl: asset.url,
                                        status: 'DRAFT',
                                        uploadToken: asset.objectKey,
                                    },
                                })];
                        case 3:
                            video = _d.sent();
                            return [4 /*yield*/, this.prisma.videoAsset.update({
                                    where: { id: asset.id },
                                    data: { videoId: video.id },
                                })];
                        case 4:
                            _d.sent();
                            if (!coverAsset) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.videoAsset.update({
                                    where: { id: coverAsset.id },
                                    data: { videoId: video.id },
                                })];
                        case 5:
                            _d.sent();
                            _d.label = 6;
                        case 6: return [4 /*yield*/, this.mediaService.processVideo(video.id, asset.id, (_c = coverAsset === null || coverAsset === void 0 ? void 0 : coverAsset.id) !== null && _c !== void 0 ? _c : null)];
                        case 7:
                            _d.sent();
                            return [2 /*return*/, this.prisma.video.findUnique({ where: { id: video.id } })];
                    }
                });
            });
        };
        VideoService_1.prototype.updateDraft = function (videoId, user, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var video;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findUnique({ where: { id: videoId } })];
                        case 1:
                            video = _a.sent();
                            if (!video) {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            if (video.creatorId !== user.id && user.role !== 'ADMIN') {
                                throw new common_1.ForbiddenException('Cannot update others videos');
                            }
                            if (!['DRAFT', 'REJECTED', 'PENDING_REVIEW', 'PUBLISHED'].includes(video.status)) {
                                throw new common_1.ForbiddenException('Only draft, rejected, pending review, or published videos can be edited');
                            }
                            if (!(video.status === 'PENDING_REVIEW' || video.status === 'PUBLISHED')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.video.update({
                                        where: { id: videoId },
                                        data: __assign(__assign(__assign(__assign(__assign({}, (payload.title !== undefined ? { title: payload.title } : {})), (payload.description !== undefined ? { description: payload.description } : {})), (payload.category !== undefined ? { category: payload.category } : {})), (payload.coverUrl !== undefined ? { coverUrl: payload.coverUrl } : {})), { status: 'DRAFT', submittedAt: null, publishedAt: null }),
                                    }),
                                    this.prisma.videoReview.deleteMany({
                                        where: {
                                            videoId: videoId,
                                            status: 'PENDING',
                                        },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.prisma.video.findUnique({ where: { id: videoId } })];
                        case 3: return [2 /*return*/, this.prisma.video.update({
                                where: { id: videoId },
                                data: __assign(__assign(__assign(__assign(__assign({}, (payload.title !== undefined ? { title: payload.title } : {})), (payload.description !== undefined ? { description: payload.description } : {})), (payload.category !== undefined ? { category: payload.category } : {})), (payload.coverUrl !== undefined ? { coverUrl: payload.coverUrl } : {})), { submittedAt: null }),
                            })];
                    }
                });
            });
        };
        VideoService_1.prototype.withdrawReview = function (videoId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var video;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findUnique({ where: { id: videoId } })];
                        case 1:
                            video = _a.sent();
                            if (!video) {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            if (video.creatorId !== user.id && user.role !== 'ADMIN') {
                                throw new common_1.ForbiddenException('Cannot withdraw others videos');
                            }
                            if (video.status !== 'PENDING_REVIEW') {
                                throw new common_1.ForbiddenException('Only pending review videos can be withdrawn');
                            }
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.video.update({
                                        where: { id: videoId },
                                        data: {
                                            status: 'DRAFT',
                                            submittedAt: null,
                                        },
                                    }),
                                    this.prisma.videoReview.deleteMany({
                                        where: {
                                            videoId: videoId,
                                            status: 'PENDING',
                                        },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.prisma.video.findUnique({ where: { id: videoId } })];
                    }
                });
            });
        };
        VideoService_1.prototype.getReviewHistory = function (videoId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var video;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findUnique({ where: { id: videoId } })];
                        case 1:
                            video = _a.sent();
                            if (!video) {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            if (video.creatorId !== user.id && user.role !== 'ADMIN') {
                                throw new common_1.ForbiddenException('Cannot view others videos');
                            }
                            return [2 /*return*/, this.prisma.videoReview.findMany({
                                    where: { videoId: videoId },
                                    include: {
                                        reviewer: {
                                            select: {
                                                id: true,
                                                nickname: true,
                                            },
                                        },
                                    },
                                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                                })];
                    }
                });
            });
        };
        VideoService_1.prototype.getVideoDetail = function (id, currentUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var video, isFollowingCreator, followerCount, isLiked, _a, _b, isFavorited, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findFirst({
                                where: { id: id, status: 'PUBLISHED' },
                                include: { creator: true },
                            })];
                        case 1:
                            video = _e.sent();
                            if (!video) {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            return [4 /*yield*/, this.followService.isFollowing(video.creator.id, currentUserId)];
                        case 2:
                            isFollowingCreator = _e.sent();
                            return [4 /*yield*/, this.followService.getFollowerCount(video.creator.id)];
                        case 3:
                            followerCount = _e.sent();
                            if (!currentUserId) return [3 /*break*/, 5];
                            _b = Boolean;
                            return [4 /*yield*/, this.prisma.videoLike.findUnique({
                                    where: { videoId_userId: { videoId: id, userId: currentUserId } },
                                })];
                        case 4:
                            _a = _b.apply(void 0, [_e.sent()]);
                            return [3 /*break*/, 6];
                        case 5:
                            _a = false;
                            _e.label = 6;
                        case 6:
                            isLiked = _a;
                            if (!currentUserId) return [3 /*break*/, 8];
                            _d = Boolean;
                            return [4 /*yield*/, this.prisma.favorite.findUnique({
                                    where: { videoId_userId: { videoId: id, userId: currentUserId } },
                                })];
                        case 7:
                            _c = _d.apply(void 0, [_e.sent()]);
                            return [3 /*break*/, 9];
                        case 8:
                            _c = false;
                            _e.label = 9;
                        case 9:
                            isFavorited = _c;
                            return [2 /*return*/, __assign(__assign({}, video), { creator: {
                                        id: video.creator.id,
                                        nickname: video.creator.nickname,
                                        avatarUrl: video.creator.avatarUrl,
                                        role: video.creator.role,
                                        followerCount: followerCount,
                                    }, isFollowingCreator: isFollowingCreator, isLiked: isLiked, isFavorited: isFavorited })];
                    }
                });
            });
        };
        VideoService_1.prototype.getRelatedVideos = function (id, currentUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var current, recommendationContext, primaryCandidates, fallbackCandidates, candidates, now;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findUnique({ where: { id: id } })];
                        case 1:
                            current = _a.sent();
                            if (!current) {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            return [4 /*yield*/, this.getRecommendationContext(currentUserId)];
                        case 2:
                            recommendationContext = _a.sent();
                            return [4 /*yield*/, this.prisma.video.findMany({
                                    where: {
                                        status: 'PUBLISHED',
                                        id: { not: id },
                                        OR: [{ creatorId: current.creatorId }, { category: current.category }],
                                    },
                                    include: {
                                        creator: {
                                            select: {
                                                id: true,
                                                nickname: true,
                                            },
                                        },
                                    },
                                    orderBy: this.buildVideoOrderBy('hot'),
                                    take: 24,
                                })];
                        case 3:
                            primaryCandidates = _a.sent();
                            return [4 /*yield*/, this.prisma.video.findMany({
                                    where: {
                                        status: 'PUBLISHED',
                                        id: {
                                            notIn: __spreadArray([id], primaryCandidates.map(function (item) { return item.id; }), true),
                                        },
                                    },
                                    include: {
                                        creator: {
                                            select: {
                                                id: true,
                                                nickname: true,
                                            },
                                        },
                                    },
                                    orderBy: this.buildVideoOrderBy('hot'),
                                    take: 36,
                                })];
                        case 4:
                            fallbackCandidates = _a.sent();
                            candidates = __spreadArray(__spreadArray([], primaryCandidates, true), fallbackCandidates, true);
                            now = new Date();
                            return [2 /*return*/, candidates
                                    .map(function (video) { return ({
                                    video: video,
                                    score: _this.calculateRelatedRecommendationScore(video, current, now, recommendationContext),
                                }); })
                                    .sort(function (left, right) {
                                    var _a, _b, _c, _d;
                                    return right.score - left.score ||
                                        ((_b = (_a = right.video.publishedAt) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = left.video.publishedAt) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : 0) ||
                                        right.video.id - left.video.id;
                                })
                                    .slice(0, 6)
                                    .map(function (item) { return item.video; })];
                    }
                });
            });
        };
        VideoService_1.prototype.submitReview = function (id, user) {
            return __awaiter(this, void 0, void 0, function () {
                var video, review;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findUnique({ where: { id: id } })];
                        case 1:
                            video = _a.sent();
                            if (!video) {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            if (video.creatorId !== user.id && user.role !== 'ADMIN') {
                                throw new common_1.ForbiddenException('Cannot submit others videos');
                            }
                            if (!['DRAFT', 'REJECTED'].includes(video.status)) {
                                throw new common_1.ForbiddenException('Only draft or rejected videos can be submitted for review');
                            }
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: id },
                                    data: {
                                        status: 'PENDING_REVIEW',
                                        submittedAt: new Date(),
                                        rejectReason: null,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.videoReview.create({
                                    data: {
                                        videoId: id,
                                        status: 'PENDING',
                                    },
                                })];
                        case 3:
                            review = _a.sent();
                            return [2 /*return*/, {
                                    videoId: id,
                                    reviewId: review.id,
                                    status: 'PENDING_REVIEW',
                                }];
                    }
                });
            });
        };
        VideoService_1.prototype.getCreatorVideos = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.video.findMany({
                            where: { creatorId: user.id },
                            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                        })];
                });
            });
        };
        VideoService_1.prototype.countVideosByStatus = function (creatorId) {
            return __awaiter(this, void 0, void 0, function () {
                var grouped, index;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.groupBy({
                                by: ['status'],
                                where: { creatorId: creatorId },
                                _count: { _all: true },
                            })];
                        case 1:
                            grouped = _d.sent();
                            index = new Map(grouped.map(function (item) { return [item.status, item._count._all]; }));
                            return [2 /*return*/, {
                                    totalVideos: grouped.reduce(function (sum, item) { return sum + item._count._all; }, 0),
                                    pendingReviews: (_a = index.get('PENDING_REVIEW')) !== null && _a !== void 0 ? _a : 0,
                                    publishedVideos: (_b = index.get('PUBLISHED')) !== null && _b !== void 0 ? _b : 0,
                                    rejectedVideos: (_c = index.get('REJECTED')) !== null && _c !== void 0 ? _c : 0,
                                }];
                    }
                });
            });
        };
        VideoService_1.prototype.getRecommendFeed = function () {
            return __awaiter(this, arguments, void 0, function (options) {
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    if (options.sortBy === 'latest' || options.sortBy === 'hot') {
                        return [2 /*return*/, this.listPublishedVideos(options)];
                    }
                    return [2 /*return*/, this.getDiversifiedRecommendFeed(options)];
                });
            });
        };
        VideoService_1.prototype.listPublishedVideos = function () {
            return __awaiter(this, arguments, void 0, function (options) {
                var page, pageSize, category;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    page = this.normalizePage(options.page);
                    pageSize = this.normalizePageSize(options.pageSize);
                    category = (0, categories_1.resolveCategoryCode)(options.categoryCode);
                    return [2 /*return*/, this.prisma.video.findMany({
                            where: __assign({ status: 'PUBLISHED' }, (category ? { category: category } : {})),
                            include: {
                                creator: {
                                    select: {
                                        id: true,
                                        nickname: true,
                                    },
                                },
                            },
                            orderBy: this.buildVideoOrderBy(options.sortBy),
                            skip: (page - 1) * pageSize,
                            take: pageSize,
                        })];
                });
            });
        };
        VideoService_1.prototype.getDiversifiedRecommendFeed = function () {
            return __awaiter(this, arguments, void 0, function (options) {
                var page, pageSize, category, candidateTake, recommendationContext, candidates;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            page = this.normalizePage(options.page);
                            pageSize = this.normalizePageSize(options.pageSize);
                            category = (0, categories_1.resolveCategoryCode)(options.categoryCode);
                            candidateTake = this.getRecommendCandidateTake(page, pageSize);
                            return [4 /*yield*/, this.getRecommendationContext(options.currentUserId)];
                        case 1:
                            recommendationContext = _a.sent();
                            return [4 /*yield*/, this.prisma.video.findMany({
                                    where: __assign({ status: 'PUBLISHED' }, (category ? { category: category } : {})),
                                    include: {
                                        creator: {
                                            select: {
                                                id: true,
                                                nickname: true,
                                            },
                                        },
                                    },
                                    orderBy: this.buildVideoOrderBy('hot'),
                                    take: candidateTake,
                                })];
                        case 2:
                            candidates = _a.sent();
                            return [2 /*return*/, this.rerankRecommendCandidates(candidates, page, pageSize, recommendationContext)];
                    }
                });
            });
        };
        VideoService_1.prototype.searchPublishedVideos = function (keyword_1) {
            return __awaiter(this, arguments, void 0, function (keyword, options) {
                var page, pageSize, category, normalizedKeyword, recommendationContext, tokens, recallTerms, candidateTake, candidates, now;
                var _this = this;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            page = this.normalizePage(options.page);
                            pageSize = this.normalizePageSize(options.pageSize);
                            category = (0, categories_1.resolveCategoryCode)(options.categoryCode);
                            normalizedKeyword = keyword.trim();
                            if (options.sortBy === 'latest' || options.sortBy === 'hot') {
                                return [2 /*return*/, this.prisma.video.findMany({
                                        where: __assign(__assign({ status: 'PUBLISHED' }, (category ? { category: category } : {})), (normalizedKeyword
                                            ? {
                                                OR: [
                                                    {
                                                        title: {
                                                            contains: normalizedKeyword,
                                                        },
                                                    },
                                                    {
                                                        description: {
                                                            contains: normalizedKeyword,
                                                        },
                                                    },
                                                    {
                                                        creator: {
                                                            nickname: {
                                                                contains: normalizedKeyword,
                                                            },
                                                        },
                                                    },
                                                ],
                                            }
                                            : {})),
                                        include: {
                                            creator: {
                                                select: {
                                                    id: true,
                                                    nickname: true,
                                                },
                                            },
                                        },
                                        orderBy: this.buildVideoOrderBy(options.sortBy),
                                        skip: (page - 1) * pageSize,
                                        take: pageSize,
                                    })];
                            }
                            if (!normalizedKeyword) {
                                return [2 /*return*/, this.getRecommendFeed({
                                        currentUserId: options.currentUserId,
                                        categoryCode: options.categoryCode,
                                        page: page,
                                        pageSize: pageSize,
                                    })];
                            }
                            return [4 /*yield*/, this.getRecommendationContext(options.currentUserId)];
                        case 1:
                            recommendationContext = _a.sent();
                            tokens = this.tokenizeSearchKeyword(normalizedKeyword);
                            recallTerms = __spreadArray([], new Set(__spreadArray([normalizedKeyword.toLowerCase()], tokens, true)), true);
                            candidateTake = Math.min(120, Math.max(page * pageSize * 6, 60));
                            return [4 /*yield*/, this.prisma.video.findMany({
                                    where: __assign(__assign({ status: 'PUBLISHED' }, (category ? { category: category } : {})), { OR: recallTerms.flatMap(function (term) { return [
                                            {
                                                title: {
                                                    contains: term,
                                                },
                                            },
                                            {
                                                description: {
                                                    contains: term,
                                                },
                                            },
                                            {
                                                creator: {
                                                    nickname: {
                                                        contains: term,
                                                    },
                                                },
                                            },
                                        ]; }) }),
                                    include: {
                                        creator: {
                                            select: {
                                                id: true,
                                                nickname: true,
                                            },
                                        },
                                    },
                                    orderBy: this.buildVideoOrderBy('hot'),
                                    take: candidateTake,
                                })];
                        case 2:
                            candidates = _a.sent();
                            now = new Date();
                            return [2 /*return*/, candidates
                                    .map(function (video) { return ({
                                    video: video,
                                    score: _this.calculateSearchRankingScore(video, normalizedKeyword, tokens, now, recommendationContext),
                                }); })
                                    .filter(function (item) { return item.score > 0; })
                                    .sort(function (left, right) {
                                    var _a, _b, _c, _d;
                                    return right.score - left.score ||
                                        ((_b = (_a = right.video.publishedAt) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = left.video.publishedAt) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : 0) ||
                                        right.video.id - left.video.id;
                                })
                                    .slice((page - 1) * pageSize, page * pageSize)
                                    .map(function (item) { return item.video; })];
                    }
                });
            });
        };
        VideoService_1.prototype.likeVideo = function (videoId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var video, existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            video = _a.sent();
                            return [4 /*yield*/, this.prisma.videoLike.findUnique({
                                    where: { videoId_userId: { videoId: videoId, userId: user.id } },
                                })];
                        case 2:
                            existing = _a.sent();
                            if (!!existing) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.videoLike.create({
                                    data: { videoId: videoId, userId: user.id },
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: videoId },
                                    data: { likeCount: { increment: 1 } },
                                })];
                        case 4:
                            _a.sent();
                            if (!(video.creatorId !== user.id)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        recipientId: video.creatorId,
                                        actorId: user.id,
                                        type: 'LIKE',
                                        title: '收到新的点赞',
                                        content: "".concat(user.nickname, " \u70B9\u8D5E\u4E86\u4F60\u7684\u89C6\u9891"),
                                        relatedType: 'VIDEO',
                                        relatedId: videoId,
                                    },
                                })];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [2 /*return*/, { liked: true }];
                    }
                });
            });
        };
        VideoService_1.prototype.unlikeVideo = function (videoId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.videoLike.findUnique({
                                    where: { videoId_userId: { videoId: videoId, userId: user.id } },
                                })];
                        case 2:
                            existing = _a.sent();
                            if (!existing) {
                                return [2 /*return*/, { liked: false }];
                            }
                            return [4 /*yield*/, this.prisma.videoLike.delete({ where: { id: existing.id } })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: videoId },
                                    data: { likeCount: { decrement: 1 } },
                                })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, { liked: false }];
                    }
                });
            });
        };
        VideoService_1.prototype.favoriteVideo = function (videoId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var video, existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            video = _a.sent();
                            return [4 /*yield*/, this.prisma.favorite.findUnique({
                                    where: { videoId_userId: { videoId: videoId, userId: user.id } },
                                })];
                        case 2:
                            existing = _a.sent();
                            if (!!existing) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.favorite.create({
                                    data: { videoId: videoId, userId: user.id },
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: videoId },
                                    data: { favoriteCount: { increment: 1 } },
                                })];
                        case 4:
                            _a.sent();
                            if (!(video.creatorId !== user.id)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        recipientId: video.creatorId,
                                        actorId: user.id,
                                        type: 'FAVORITE',
                                        title: '收到新的收藏',
                                        content: "".concat(user.nickname, " \u6536\u85CF\u4E86\u4F60\u7684\u89C6\u9891"),
                                        relatedType: 'VIDEO',
                                        relatedId: videoId,
                                    },
                                })];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [2 /*return*/, { favorited: true }];
                    }
                });
            });
        };
        VideoService_1.prototype.recordPlay = function (videoId_1, user_1) {
            return __awaiter(this, arguments, void 0, function (videoId, user, payload) {
                var video, now, resolvedDurationSeconds, durationData, record;
                if (payload === void 0) { payload = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            video = _a.sent();
                            now = new Date();
                            resolvedDurationSeconds = this.resolveWatchDurationSeconds(video.durationSeconds, payload.videoDurationSeconds);
                            durationData = resolvedDurationSeconds > 0
                                ? {
                                    videoDurationSeconds: resolvedDurationSeconds,
                                }
                                : {};
                            return [4 /*yield*/, this.prisma.userVideoWatch.upsert({
                                    where: {
                                        userId_videoId: {
                                            userId: user.id,
                                            videoId: videoId,
                                        },
                                    },
                                    create: __assign({ userId: user.id, videoId: videoId, playCount: 1, lastWatchedAt: now }, durationData),
                                    update: __assign({ playCount: {
                                            increment: 1,
                                        }, lastWatchedAt: now }, durationData),
                                })];
                        case 2:
                            record = _a.sent();
                            return [4 /*yield*/, this.userProfileService.buildAndSaveProfile(user.id)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, record];
                    }
                });
            });
        };
        VideoService_1.prototype.recordWatchProgress = function (videoId, user, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var video, existing, resolvedDurationSeconds, watchedSeconds, currentTimeSeconds, watchRatio, shouldIncrementCompleted, now, durationData, record, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            video = _c.sent();
                            return [4 /*yield*/, this.prisma.userVideoWatch.findUnique({
                                    where: {
                                        userId_videoId: {
                                            userId: user.id,
                                            videoId: videoId,
                                        },
                                    },
                                })];
                        case 2:
                            existing = _c.sent();
                            resolvedDurationSeconds = this.resolveWatchDurationSeconds(video.durationSeconds, payload.videoDurationSeconds, existing === null || existing === void 0 ? void 0 : existing.videoDurationSeconds);
                            watchedSeconds = this.normalizeReportedWatchSeconds(payload.watchedSeconds);
                            currentTimeSeconds = this.normalizeCurrentTimeSeconds(payload.currentTimeSeconds, resolvedDurationSeconds);
                            watchRatio = this.calculateWatchRatio(currentTimeSeconds, resolvedDurationSeconds);
                            shouldIncrementCompleted = this.shouldIncrementCompleted((_b = existing === null || existing === void 0 ? void 0 : existing.maxWatchRatio) !== null && _b !== void 0 ? _b : 0, watchRatio, payload.event);
                            now = new Date();
                            durationData = resolvedDurationSeconds > 0
                                ? {
                                    videoDurationSeconds: resolvedDurationSeconds,
                                }
                                : {};
                            if (!existing) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.userVideoWatch.update({
                                    where: { id: existing.id },
                                    data: __assign({ totalWatchDurationSeconds: {
                                            increment: watchedSeconds,
                                        }, lastWatchDurationSeconds: currentTimeSeconds, maxWatchRatio: Math.max(existing.maxWatchRatio, watchRatio), lastWatchRatio: watchRatio, completedCount: shouldIncrementCompleted ? { increment: 1 } : undefined, lastWatchedAt: now }, durationData),
                                })];
                        case 3:
                            _a = _c.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.userVideoWatch.create({
                                data: __assign({ userId: user.id, videoId: videoId, totalWatchDurationSeconds: watchedSeconds, lastWatchDurationSeconds: currentTimeSeconds, maxWatchRatio: watchRatio, lastWatchRatio: watchRatio, completedCount: shouldIncrementCompleted ? 1 : 0, lastWatchedAt: now }, durationData),
                            })];
                        case 5:
                            _a = _c.sent();
                            _c.label = 6;
                        case 6:
                            record = _a;
                            return [4 /*yield*/, this.userProfileService.buildAndSaveProfile(user.id)];
                        case 7:
                            _c.sent();
                            return [2 /*return*/, record];
                    }
                });
            });
        };
        VideoService_1.prototype.unfavoriteVideo = function (videoId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.favorite.findUnique({
                                    where: { videoId_userId: { videoId: videoId, userId: user.id } },
                                })];
                        case 2:
                            existing = _a.sent();
                            if (!existing) {
                                return [2 /*return*/, { favorited: false }];
                            }
                            return [4 /*yield*/, this.prisma.favorite.delete({ where: { id: existing.id } })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: videoId },
                                    data: { favoriteCount: { decrement: 1 } },
                                })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, { favorited: false }];
                    }
                });
            });
        };
        VideoService_1.prototype.getUserFavorites = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var favorites;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.favorite.findMany({
                                where: {
                                    userId: userId,
                                    video: {
                                        status: 'PUBLISHED',
                                    },
                                },
                                include: {
                                    video: {
                                        include: {
                                            creator: { select: { id: true, nickname: true } },
                                        },
                                    },
                                },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            favorites = _a.sent();
                            return [2 /*return*/, favorites.map(function (f) { return ({
                                    id: f.video.id,
                                    title: f.video.title,
                                    description: f.video.description,
                                    coverUrl: f.video.coverUrl,
                                    category: f.video.category,
                                    likeCount: f.video.likeCount,
                                    favoriteCount: f.video.favoriteCount,
                                    commentCount: f.video.commentCount,
                                    creator: f.video.creator,
                                    favoritedAt: f.createdAt,
                                }); })];
                    }
                });
            });
        };
        VideoService_1.prototype.getUserLikes = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var likes;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.videoLike.findMany({
                                where: {
                                    userId: userId,
                                    video: {
                                        status: 'PUBLISHED',
                                    },
                                },
                                include: {
                                    video: {
                                        include: {
                                            creator: { select: { id: true, nickname: true } },
                                        },
                                    },
                                },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            likes = _a.sent();
                            return [2 /*return*/, likes.map(function (l) { return ({
                                    id: l.video.id,
                                    title: l.video.title,
                                    description: l.video.description,
                                    coverUrl: l.video.coverUrl,
                                    category: l.video.category,
                                    likeCount: l.video.likeCount,
                                    favoriteCount: l.video.favoriteCount,
                                    commentCount: l.video.commentCount,
                                    creator: l.video.creator,
                                    likedAt: l.createdAt,
                                }); })];
                    }
                });
            });
        };
        VideoService_1.prototype.listDanmakus = function (videoId, fromMs, toMs) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.videoDanmaku.findMany({
                            where: __assign({ videoId: videoId, status: 'NORMAL' }, (fromMs !== undefined || toMs !== undefined
                                ? {
                                    timeOffsetMs: __assign(__assign({}, (fromMs !== undefined ? { gte: fromMs } : {})), (toMs !== undefined ? { lte: toMs } : {})),
                                }
                                : {})),
                            include: {
                                user: {
                                    select: { id: true, nickname: true },
                                },
                            },
                            orderBy: [{ timeOffsetMs: 'asc' }, { createdAt: 'asc' }],
                        })];
                });
            });
        };
        VideoService_1.prototype.createDanmaku = function (videoId, user, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.requirePublishedVideo(videoId)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, this.prisma.videoDanmaku.create({
                                    data: {
                                        videoId: videoId,
                                        userId: user.id,
                                        content: payload.content,
                                        color: (_a = payload.color) !== null && _a !== void 0 ? _a : '#FFFFFF',
                                        timeOffsetMs: payload.timeOffsetMs,
                                        status: 'NORMAL',
                                    },
                                    include: {
                                        user: {
                                            select: { id: true, nickname: true },
                                        },
                                    },
                                })];
                    }
                });
            });
        };
        VideoService_1.prototype.resolveWatchDurationSeconds = function () {
            var durations = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                durations[_i] = arguments[_i];
            }
            var validDurations = durations
                .map(function (item) { return (typeof item === 'number' && Number.isFinite(item) ? Math.max(0, Math.round(item)) : 0); })
                .filter(function (item) { return item > 0; });
            if (validDurations.length === 0) {
                return 0;
            }
            return Math.max.apply(Math, validDurations);
        };
        VideoService_1.prototype.normalizeReportedWatchSeconds = function (value) {
            if (!Number.isFinite(value) || value <= 0) {
                return 0;
            }
            return Math.min(Math.round(value), video_watch_constants_1.VIDEO_WATCH_THRESHOLDS.maxReportedSecondsPerRequest);
        };
        VideoService_1.prototype.normalizeCurrentTimeSeconds = function (value, videoDurationSeconds) {
            if (!Number.isFinite(value) || value <= 0) {
                return 0;
            }
            var normalizedValue = Math.round(value);
            if (videoDurationSeconds <= 0) {
                return normalizedValue;
            }
            return Math.min(normalizedValue, videoDurationSeconds);
        };
        VideoService_1.prototype.calculateWatchRatio = function (currentTimeSeconds, videoDurationSeconds) {
            if (videoDurationSeconds <= 0) {
                return 0;
            }
            return Math.min(currentTimeSeconds / videoDurationSeconds, 1);
        };
        VideoService_1.prototype.shouldIncrementCompleted = function (previousMaxWatchRatio, currentWatchRatio, event) {
            if (currentWatchRatio < video_watch_constants_1.VIDEO_WATCH_THRESHOLDS.completeRatio) {
                return false;
            }
            // `ended` should count as a fresh completion for replay scenarios.
            // Pause/leave only increments the first time the watch crosses the completion threshold.
            if (event === video_watch_constants_1.VIDEO_WATCH_EVENTS.ended) {
                return true;
            }
            return previousMaxWatchRatio < video_watch_constants_1.VIDEO_WATCH_THRESHOLDS.completeRatio;
        };
        VideoService_1.prototype.requirePublishedVideo = function (videoId) {
            return __awaiter(this, void 0, void 0, function () {
                var video;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findUnique({ where: { id: videoId } })];
                        case 1:
                            video = _a.sent();
                            if (!video || video.status !== 'PUBLISHED') {
                                throw new common_1.NotFoundException('Video not found');
                            }
                            return [2 /*return*/, video];
                    }
                });
            });
        };
        VideoService_1.prototype.resolveAsset = function (assetId_1, uploadToken_1) {
            return __awaiter(this, arguments, void 0, function (assetId, uploadToken, errorMessage) {
                var asset, asset;
                if (errorMessage === void 0) { errorMessage = 'Uploaded asset not found'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(assetId !== undefined)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.videoAsset.findUnique({ where: { id: assetId } })];
                        case 1:
                            asset = _a.sent();
                            if (!asset) {
                                throw new common_1.NotFoundException(errorMessage);
                            }
                            return [2 /*return*/, asset];
                        case 2:
                            if (!uploadToken) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.videoAsset.findUnique({ where: { objectKey: uploadToken } })];
                        case 3:
                            asset = _a.sent();
                            if (!asset) {
                                throw new common_1.NotFoundException(errorMessage);
                            }
                            return [2 /*return*/, asset];
                        case 4:
                            if (errorMessage !== 'Uploaded asset not found') {
                                return [2 /*return*/, null];
                            }
                            throw new common_1.NotFoundException(errorMessage);
                    }
                });
            });
        };
        VideoService_1.prototype.buildVideoOrderBy = function (sortBy) {
            if (sortBy === 'hot') {
                return [
                    { likeCount: 'desc' },
                    { favoriteCount: 'desc' },
                    { commentCount: 'desc' },
                    { publishedAt: 'desc' },
                    { id: 'desc' },
                ];
            }
            return [{ publishedAt: 'desc' }, { id: 'desc' }];
        };
        VideoService_1.prototype.getRecommendCandidateTake = function (page, pageSize) {
            return Math.min(120, Math.max(page * pageSize * 6, 40));
        };
        // The home feed uses a simple, explainable recommendation score:
        // interaction score * time decay + a small freshness boost.
        VideoService_1.prototype.calculateRecommendScore = function (video, now) {
            var _a;
            var interactionScore = video.likeCount + video.favoriteCount * 2 + video.commentCount * 3;
            var publishedAt = (_a = video.publishedAt) !== null && _a !== void 0 ? _a : new Date(0);
            var ageHours = Math.max(0, (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
            var timeDecay = 1 / (1 + ageHours / 48);
            var freshnessBoost = Math.max(0, 6 - ageHours / 24);
            return interactionScore * timeDecay + freshnessBoost;
        };
        VideoService_1.prototype.calculatePersonalizedRecommendScore = function (video, now, recommendationContext) {
            var _a, _b;
            var baseScore = this.calculateRecommendScore(video, now);
            if (!recommendationContext || recommendationContext.isColdStart) {
                return baseScore;
            }
            var categoryPreferenceScore = (_a = recommendationContext.categoryPreferenceIndex.get(this.resolveVideoCategoryId(video.category))) !== null && _a !== void 0 ? _a : 0;
            var creatorPreferenceScore = (_b = recommendationContext.creatorPreferenceIndex.get(video.creatorId)) !== null && _b !== void 0 ? _b : 0;
            var activityMultiplier = recommendationContext.activityLevel === 'HIGH'
                ? 1.2
                : recommendationContext.activityLevel === 'MEDIUM'
                    ? 1.1
                    : 1;
            var tendencyBoost = recommendationContext.creatorViewerTendency === 'VIEWER'
                ? categoryPreferenceScore * 6
                : recommendationContext.creatorViewerTendency === 'CREATOR'
                    ? creatorPreferenceScore * 6
                    : 0;
            var selfVideoPenalty = video.creatorId === recommendationContext.currentUserId ? 6 : 0;
            return (baseScore * activityMultiplier +
                categoryPreferenceScore * 30 +
                creatorPreferenceScore * 36 +
                tendencyBoost -
                selfVideoPenalty);
        };
        VideoService_1.prototype.calculateRelatedRecommendationScore = function (video, current, now, recommendationContext) {
            var personalizedScore = this.calculatePersonalizedRecommendScore(video, now, recommendationContext);
            var creatorMatchBoost = video.creatorId === current.creatorId ? 40 : 0;
            var categoryMatchBoost = video.category === current.category ? 24 : 0;
            var dualMatchBoost = creatorMatchBoost > 0 && categoryMatchBoost > 0 ? 12 : 0;
            return personalizedScore + creatorMatchBoost + categoryMatchBoost + dualMatchBoost;
        };
        VideoService_1.prototype.calculateSearchRankingScore = function (video, keyword, tokens, now, recommendationContext) {
            var _a, _b;
            var normalizedKeyword = keyword.toLowerCase();
            var normalizedTitle = video.title.toLowerCase();
            var normalizedDescription = video.description.toLowerCase();
            var normalizedCreator = ((_b = (_a = video.creator) === null || _a === void 0 ? void 0 : _a.nickname) !== null && _b !== void 0 ? _b : '').toLowerCase();
            var categoryMeta = CATEGORY_SEARCH_META.get(video.category);
            var personalizedScore = this.calculatePersonalizedRecommendScore(video, now, recommendationContext);
            var relevanceScore = 0;
            var matchedTokenCount = 0;
            if (normalizedTitle === normalizedKeyword) {
                relevanceScore += 160;
            }
            if (normalizedTitle.startsWith(normalizedKeyword)) {
                relevanceScore += 90;
            }
            if (normalizedTitle.includes(normalizedKeyword)) {
                relevanceScore += 80;
            }
            if (normalizedDescription.includes(normalizedKeyword)) {
                relevanceScore += 36;
            }
            if (normalizedCreator.includes(normalizedKeyword)) {
                relevanceScore += 44;
            }
            if (categoryMeta && (categoryMeta.code.includes(normalizedKeyword) || categoryMeta.label.includes(normalizedKeyword))) {
                relevanceScore += 24;
            }
            for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
                var token = tokens_1[_i];
                var tokenMatched = false;
                if (normalizedTitle.includes(token)) {
                    relevanceScore += 24;
                    tokenMatched = true;
                }
                if (normalizedDescription.includes(token)) {
                    relevanceScore += 10;
                    tokenMatched = true;
                }
                if (normalizedCreator.includes(token)) {
                    relevanceScore += 12;
                    tokenMatched = true;
                }
                if (categoryMeta && (categoryMeta.code.includes(token) || categoryMeta.label.includes(token))) {
                    relevanceScore += 8;
                    tokenMatched = true;
                }
                if (tokenMatched) {
                    matchedTokenCount += 1;
                }
            }
            var tokenCoverageScore = tokens.length > 0 ? (matchedTokenCount / tokens.length) * 48 : 0;
            return relevanceScore * 6 + tokenCoverageScore + personalizedScore;
        };
        // Re-rank the top candidates to avoid the first screen being dominated
        // by the same creator or category while keeping the highest-score items first.
        VideoService_1.prototype.rerankRecommendCandidates = function (candidates, page, pageSize, recommendationContext) {
            var _this = this;
            var now = new Date();
            var ranked = candidates
                .map(function (video) { return ({
                video: video,
                score: _this.calculatePersonalizedRecommendScore(video, now, recommendationContext),
            }); })
                .sort(function (left, right) {
                var _a, _b, _c, _d;
                return right.score - left.score ||
                    ((_b = (_a = right.video.publishedAt) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = left.video.publishedAt) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : 0) ||
                    right.video.id - left.video.id;
            });
            var requiredCount = page * pageSize;
            var selected = [];
            var remaining = __spreadArray([], ranked, true);
            while (selected.length < requiredCount && remaining.length > 0) {
                var nextIndex = this.pickDiversifiedCandidateIndex(remaining, selected);
                var next = remaining.splice(nextIndex, 1)[0];
                selected.push(next.video);
            }
            return selected.slice((page - 1) * pageSize, page * pageSize);
        };
        VideoService_1.prototype.pickDiversifiedCandidateIndex = function (remaining, selected) {
            var _this = this;
            var strictIndex = remaining.findIndex(function (_a) {
                var video = _a.video;
                return _this.isDiversityFriendly(selected, video, true);
            });
            if (strictIndex !== -1) {
                return strictIndex;
            }
            var relaxedIndex = remaining.findIndex(function (_a) {
                var video = _a.video;
                return _this.isDiversityFriendly(selected, video, false);
            });
            return relaxedIndex !== -1 ? relaxedIndex : 0;
        };
        VideoService_1.prototype.isDiversityFriendly = function (selected, candidate, strict) {
            var creatorRunLength = this.getTrailingMatchCount(selected, function (video) { return video.creatorId === candidate.creatorId; });
            var categoryRunLength = this.getTrailingMatchCount(selected, function (video) { return video.category === candidate.category; });
            if (creatorRunLength >= 1) {
                return false;
            }
            if (strict) {
                return categoryRunLength < 2;
            }
            return categoryRunLength < 3;
        };
        VideoService_1.prototype.getTrailingMatchCount = function (items, predicate) {
            var count = 0;
            for (var index = items.length - 1; index >= 0; index -= 1) {
                if (!predicate(items[index])) {
                    break;
                }
                count += 1;
            }
            return count;
        };
        VideoService_1.prototype.normalizePage = function (page) {
            if (!page || !Number.isFinite(page) || page < 1) {
                return 1;
            }
            return Math.floor(page);
        };
        VideoService_1.prototype.normalizePageSize = function (pageSize) {
            if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) {
                return 20;
            }
            return Math.min(50, Math.floor(pageSize));
        };
        VideoService_1.prototype.buildStorageFileName = function (originalName) {
            var _a, _b;
            var extensionMatch = originalName.match(/(\.[A-Za-z0-9]+)$/);
            var extension = (_b = (_a = extensionMatch === null || extensionMatch === void 0 ? void 0 : extensionMatch[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
            var baseName = extension ? originalName.slice(0, -extension.length) : originalName;
            var asciiBaseName = Array.from(baseName.normalize('NFKD'))
                .filter(function (char) { return char.charCodeAt(0) <= 0x7f; })
                .join('');
            var normalizedBase = asciiBaseName
                .replace(/[^A-Za-z0-9_-]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase();
            var safeBase = normalizedBase || 'upload';
            return "".concat(Date.now(), "-").concat(safeBase).concat(extension);
        };
        VideoService_1.prototype.getRecommendationContext = function (currentUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var profile;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!currentUserId) {
                                return [2 /*return*/, undefined];
                            }
                            return [4 /*yield*/, this.userProfileService.getProfile(currentUserId, true)];
                        case 1:
                            profile = _a.sent();
                            if (profile.summary.isColdStart) {
                                return [2 /*return*/, {
                                        currentUserId: currentUserId,
                                        categoryPreferenceIndex: new Map(),
                                        creatorPreferenceIndex: new Map(),
                                        activityLevel: profile.summary.activityLevel,
                                        creatorViewerTendency: profile.summary.creatorViewerTendency,
                                        isColdStart: true,
                                    }];
                            }
                            return [2 /*return*/, {
                                    currentUserId: currentUserId,
                                    categoryPreferenceIndex: this.normalizePreferenceScores(profile.categoryPreferences, function (item) { return item.categoryId; }),
                                    creatorPreferenceIndex: this.normalizePreferenceScores(profile.creatorPreferences, function (item) { return item.creatorId; }),
                                    activityLevel: profile.summary.activityLevel,
                                    creatorViewerTendency: profile.summary.creatorViewerTendency,
                                    isColdStart: false,
                                }];
                    }
                });
            });
        };
        VideoService_1.prototype.normalizePreferenceScores = function (items, getKey, maxSize) {
            var _this = this;
            if (maxSize === void 0) { maxSize = 8; }
            var limitedItems = items.slice(0, maxSize);
            var maxScore = limitedItems.reduce(function (result, item) {
                var score = _this.readPreferenceScore(item);
                return Math.max(result, score);
            }, 0);
            var normalized = new Map();
            if (maxScore <= 0) {
                return normalized;
            }
            for (var _i = 0, limitedItems_1 = limitedItems; _i < limitedItems_1.length; _i++) {
                var item = limitedItems_1[_i];
                normalized.set(getKey(item), this.readPreferenceScore(item) / maxScore);
            }
            return normalized;
        };
        VideoService_1.prototype.resolveVideoCategoryId = function (categoryCode) {
            var _a;
            return (_a = (0, categories_1.resolveCategoryId)(categoryCode !== null && categoryCode !== void 0 ? categoryCode : undefined)) !== null && _a !== void 0 ? _a : 0;
        };
        VideoService_1.prototype.readPreferenceScore = function (item) {
            return Number.isFinite(item.score) ? item.score : 0;
        };
        VideoService_1.prototype.tokenizeSearchKeyword = function (keyword) {
            var lowered = keyword.toLowerCase().trim();
            var splitTokens = lowered.split(/\s+/).filter(Boolean);
            if (splitTokens.length > 1) {
                return splitTokens;
            }
            var compact = lowered.replace(/\s+/g, '');
            if (compact.length <= 2) {
                return compact ? [compact] : [];
            }
            var grams = [];
            for (var index = 0; index < compact.length - 1; index += 1) {
                grams.push(compact.slice(index, index + 2));
                if (grams.length >= 6) {
                    break;
                }
            }
            return __spreadArray([], new Set(__spreadArray([compact], grams, true)), true);
        };
        return VideoService_1;
    }());
    __setFunctionName(_classThis, "VideoService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VideoService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VideoService = _classThis;
}();
exports.VideoService = VideoService;
