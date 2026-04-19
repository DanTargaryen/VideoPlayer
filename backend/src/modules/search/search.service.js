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
exports.SearchService = void 0;
var common_1 = require("@nestjs/common");
var categories_1 = require("../../common/constants/categories");
var SearchService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SearchService = _classThis = /** @class */ (function () {
        function SearchService_1(prisma, videoService, liveService) {
            this.prisma = prisma;
            this.videoService = videoService;
            this.liveService = liveService;
        }
        SearchService_1.prototype.getRecommendFeed = function () {
            return __awaiter(this, arguments, void 0, function (options) {
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.videoService.getRecommendFeed({
                            currentUserId: options.currentUserId,
                            categoryCode: options.categoryCode,
                            page: options.page,
                            pageSize: options.pageSize,
                        })];
                });
            });
        };
        SearchService_1.prototype.getHotFeed = function (targetType) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (targetType === 'LIVE') {
                        return [2 /*return*/, this.liveService.listRooms({
                                status: 'LIVING',
                                limit: 10,
                            })];
                    }
                    return [2 /*return*/, this.videoService.getRecommendFeed({
                            page: 1,
                            pageSize: 10,
                            sortBy: 'hot',
                        })];
                });
            });
        };
        SearchService_1.prototype.search = function (options) {
            return __awaiter(this, void 0, void 0, function () {
                var normalizedKeyword, normalizedTab, page, pageSize, skip, category, video, _a, user, _b, live;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            normalizedKeyword = options.keyword.trim();
                            normalizedTab = (_c = options.tab) !== null && _c !== void 0 ? _c : 'video';
                            page = this.normalizePage(options.page);
                            pageSize = this.normalizePageSize(options.pageSize);
                            skip = (page - 1) * pageSize;
                            category = (0, categories_1.resolveCategoryCode)(options.categoryCode);
                            if (!(normalizedTab === 'user' || normalizedTab === 'live')) return [3 /*break*/, 1];
                            _a = [];
                            return [3 /*break*/, 3];
                        case 1: return [4 /*yield*/, this.videoService.searchPublishedVideos(normalizedKeyword, {
                                currentUserId: options.currentUserId,
                                categoryCode: options.categoryCode,
                                sortBy: options.sortBy,
                                page: page,
                                pageSize: pageSize,
                            })];
                        case 2:
                            _a = _f.sent();
                            _f.label = 3;
                        case 3:
                            video = _a;
                            if (!(normalizedTab === 'user')) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.user.findMany({
                                    where: normalizedKeyword
                                        ? {
                                            OR: [
                                                {
                                                    nickname: {
                                                        contains: normalizedKeyword,
                                                    },
                                                },
                                                {
                                                    username: {
                                                        contains: normalizedKeyword,
                                                    },
                                                },
                                            ],
                                        }
                                        : {},
                                    orderBy: { id: 'desc' },
                                    skip: skip,
                                    take: pageSize,
                                })];
                        case 4:
                            _b = _f.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _b = [];
                            _f.label = 6;
                        case 6:
                            user = _b;
                            live = normalizedTab === 'live'
                                ? this.liveService.listRooms({
                                    keyword: normalizedKeyword,
                                    category: category !== null && category !== void 0 ? category : undefined,
                                    limit: pageSize,
                                })
                                : [];
                            return [2 /*return*/, {
                                    keyword: normalizedKeyword,
                                    tab: normalizedTab,
                                    sortBy: (_d = options.sortBy) !== null && _d !== void 0 ? _d : 'best',
                                    categoryCode: (_e = options.categoryCode) !== null && _e !== void 0 ? _e : 'recommend',
                                    page: page,
                                    pageSize: pageSize,
                                    video: video,
                                    live: live,
                                    user: user,
                                    category: category !== null && category !== void 0 ? category : null,
                                }];
                    }
                });
            });
        };
        SearchService_1.prototype.getHotwords = function () {
            return __awaiter(this, void 0, void 0, function () {
                var videos, titles, defaults;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.video.findMany({
                                where: { status: 'PUBLISHED' },
                                select: { title: true },
                                orderBy: [{ likeCount: 'desc' }, { favoriteCount: 'desc' }, { commentCount: 'desc' }],
                                take: 5,
                            })];
                        case 1:
                            videos = _a.sent();
                            titles = videos.map(function (item) { return item.title; }).filter(Boolean);
                            defaults = ['观澜推荐', '视频弹幕', '投稿审核', '直播互动'];
                            return [2 /*return*/, Array.from(new Set(__spreadArray(__spreadArray([], titles, true), defaults, true))).slice(0, 8)];
                    }
                });
            });
        };
        SearchService_1.prototype.suggest = function (keyword) {
            return __awaiter(this, void 0, void 0, function () {
                var normalizedKeyword, videos;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            normalizedKeyword = keyword.trim();
                            if (!normalizedKeyword) {
                                return [2 /*return*/, { list: [] }];
                            }
                            return [4 /*yield*/, this.prisma.video.findMany({
                                    where: {
                                        status: 'PUBLISHED',
                                        title: {
                                            contains: normalizedKeyword,
                                        },
                                    },
                                    select: {
                                        title: true,
                                    },
                                    orderBy: [{ likeCount: 'desc' }, { favoriteCount: 'desc' }, { commentCount: 'desc' }, { publishedAt: 'desc' }],
                                    take: 20,
                                })];
                        case 1:
                            videos = _a.sent();
                            return [2 /*return*/, {
                                    list: Array.from(new Set(videos.map(function (item) { return item.title; }).filter(Boolean))).slice(0, 10),
                                }];
                    }
                });
            });
        };
        SearchService_1.prototype.normalizePage = function (page) {
            if (!page || !Number.isFinite(page) || page < 1) {
                return 1;
            }
            return Math.floor(page);
        };
        SearchService_1.prototype.normalizePageSize = function (pageSize) {
            if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) {
                return 20;
            }
            return Math.min(50, Math.floor(pageSize));
        };
        return SearchService_1;
    }());
    __setFunctionName(_classThis, "SearchService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SearchService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SearchService = _classThis;
}();
exports.SearchService = SearchService;
