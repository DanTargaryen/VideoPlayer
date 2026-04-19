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
exports.AdminController = void 0;
var common_1 = require("@nestjs/common");
var class_validator_1 = require("class-validator");
var api_response_dto_1 = require("../../common/dto/api-response.dto");
var ReviewVideoDto = function () {
    var _a;
    var _action_decorators;
    var _action_initializers = [];
    var _action_extraInitializers = [];
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ReviewVideoDto() {
                this.action = __runInitializers(this, _action_initializers, void 0);
                this.reason = (__runInitializers(this, _action_extraInitializers), __runInitializers(this, _reason_initializers, void 0));
                __runInitializers(this, _reason_extraInitializers);
            }
            return ReviewVideoDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _action_decorators = [(0, class_validator_1.IsString)()];
            _reason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _action_decorators, { kind: "field", name: "action", static: false, private: false, access: { has: function (obj) { return "action" in obj; }, get: function (obj) { return obj.action; }, set: function (obj, value) { obj.action = value; } }, metadata: _metadata }, _action_initializers, _action_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var ModerateTextDto = function () {
    var _a;
    var _action_decorators;
    var _action_initializers = [];
    var _action_extraInitializers = [];
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ModerateTextDto() {
                this.action = __runInitializers(this, _action_initializers, void 0);
                this.reason = (__runInitializers(this, _action_extraInitializers), __runInitializers(this, _reason_initializers, void 0));
                __runInitializers(this, _reason_extraInitializers);
            }
            return ModerateTextDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _action_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['KEEP', 'HIDE', 'DELETE'])];
            _reason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _action_decorators, { kind: "field", name: "action", static: false, private: false, access: { has: function (obj) { return "action" in obj; }, get: function (obj) { return obj.action; }, set: function (obj, value) { obj.action = value; } }, metadata: _metadata }, _action_initializers, _action_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var HandleReportDto = function () {
    var _a;
    var _action_decorators;
    var _action_initializers = [];
    var _action_extraInitializers = [];
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function HandleReportDto() {
                this.action = __runInitializers(this, _action_initializers, void 0);
                this.reason = (__runInitializers(this, _action_extraInitializers), __runInitializers(this, _reason_initializers, void 0));
                __runInitializers(this, _reason_extraInitializers);
            }
            return HandleReportDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _action_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['KEEP', 'HIDE', 'DELETE'])];
            _reason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _action_decorators, { kind: "field", name: "action", static: false, private: false, access: { has: function (obj) { return "action" in obj; }, get: function (obj) { return obj.action; }, set: function (obj, value) { obj.action = value; } }, metadata: _metadata }, _action_initializers, _action_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var AdminController = function () {
    var _classDecorators = [(0, common_1.Controller)('admin')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getVideoReviewQueue_decorators;
    var _reviewVideo_decorators;
    var _getTextReviewQueue_decorators;
    var _moderateTextContent_decorators;
    var _getReports_decorators;
    var _handleReport_decorators;
    var _getDashboard_decorators;
    var AdminController = _classThis = /** @class */ (function () {
        function AdminController_1(authService, prisma) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
            this.prisma = prisma;
        }
        AdminController_1.prototype.requireAdmin = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            if (user.role !== 'ADMIN') {
                                throw new common_1.UnauthorizedException('Admin required');
                            }
                            return [2 /*return*/, user];
                    }
                });
            });
        };
        AdminController_1.prototype.getVideoReviewQueue = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var items;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.videoReview.findMany({
                                    include: {
                                        video: true,
                                        reviewer: {
                                            select: {
                                                id: true,
                                                nickname: true,
                                            },
                                        },
                                    },
                                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                                })];
                        case 2:
                            items = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(items)];
                    }
                });
            });
        };
        AdminController_1.prototype.reviewVideo = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, review, approve, updatedReview, updatedVideo;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            user = _b.sent();
                            return [4 /*yield*/, this.prisma.videoReview.findUnique({ where: { id: id } })];
                        case 2:
                            review = _b.sent();
                            if (!review) {
                                throw new common_1.UnauthorizedException('Review not found');
                            }
                            approve = dto.action === 'APPROVE';
                            return [4 /*yield*/, this.prisma.videoReview.update({
                                    where: { id: id },
                                    data: {
                                        reviewerId: user.id,
                                        reviewedAt: new Date(),
                                        status: approve ? 'APPROVED' : 'REJECTED',
                                        reason: approve ? null : (_a = dto.reason) !== null && _a !== void 0 ? _a : '需要修改后重新提交',
                                    },
                                })];
                        case 3:
                            updatedReview = _b.sent();
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: review.videoId },
                                    data: {
                                        status: approve ? 'PUBLISHED' : 'REJECTED',
                                        publishedAt: approve ? new Date() : null,
                                        rejectReason: approve ? null : updatedReview.reason,
                                    },
                                })];
                        case 4:
                            updatedVideo = _b.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)({
                                    id: updatedReview.id,
                                    status: updatedReview.status,
                                    videoId: updatedVideo.id,
                                    videoStatus: updatedVideo.status,
                                    reason: updatedReview.reason,
                                })];
                    }
                });
            });
        };
        AdminController_1.prototype.getTextReviewQueue = function (authorization, targetType) {
            return __awaiter(this, void 0, void 0, function () {
                var commentRows, _a, danmakuRows, _b, items;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            _c.sent();
                            if (!(targetType && targetType !== 'COMMENT')) return [3 /*break*/, 2];
                            _a = [];
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, this.prisma.comment.findMany({
                                where: { status: { not: 'NORMAL' } },
                                include: { user: { select: { id: true, nickname: true } }, video: true },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 3:
                            _a = _c.sent();
                            _c.label = 4;
                        case 4:
                            commentRows = _a;
                            if (!(targetType && targetType !== 'VIDEO_DANMAKU')) return [3 /*break*/, 5];
                            _b = [];
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, this.prisma.videoDanmaku.findMany({
                                where: { status: { not: 'NORMAL' } },
                                include: { user: { select: { id: true, nickname: true } }, video: true },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 6:
                            _b = _c.sent();
                            _c.label = 7;
                        case 7:
                            danmakuRows = _b;
                            items = __spreadArray(__spreadArray([], commentRows.map(function (item) { return ({
                                id: item.id,
                                targetType: 'COMMENT',
                                status: item.status,
                                content: item.content,
                                user: item.user,
                                video: { id: item.video.id, title: item.video.title },
                                createdAt: item.createdAt,
                            }); }), true), danmakuRows.map(function (item) { return ({
                                id: item.id,
                                targetType: 'VIDEO_DANMAKU',
                                status: item.status,
                                content: item.content,
                                user: item.user,
                                video: { id: item.video.id, title: item.video.title },
                                createdAt: item.createdAt,
                            }); }), true).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
                            return [2 /*return*/, (0, api_response_dto_1.ok)(items)];
                    }
                });
            });
        };
        AdminController_1.prototype.moderateTextContent = function (authorization, targetType, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, nextStatus, updated_1, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            admin = _a.sent();
                            nextStatus = dto.action === 'KEEP' ? 'NORMAL' : dto.action === 'HIDE' ? 'HIDDEN' : 'DELETED';
                            if (!(targetType === 'COMMENT')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.comment.update({
                                    where: { id: id },
                                    data: { status: nextStatus },
                                })];
                        case 2:
                            updated_1 = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)({ id: updated_1.id, targetType: targetType, status: updated_1.status, operator: admin.nickname })];
                        case 3: return [4 /*yield*/, this.prisma.videoDanmaku.update({
                                where: { id: id },
                                data: { status: nextStatus },
                            })];
                        case 4:
                            updated = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)({ id: updated.id, targetType: targetType, status: updated.status, operator: admin.nickname })];
                    }
                });
            });
        };
        AdminController_1.prototype.getReports = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var items;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.reportRecord.findMany({
                                    include: {
                                        reporter: { select: { id: true, nickname: true } },
                                        video: { select: { id: true, title: true } },
                                        comment: { select: { id: true, content: true, status: true } },
                                        danmaku: { select: { id: true, content: true, status: true } },
                                    },
                                    orderBy: { createdAt: 'desc' },
                                    take: 50,
                                })];
                        case 2:
                            items = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(items)];
                    }
                });
            });
        };
        AdminController_1.prototype.handleReport = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, report, targetStatus, updated;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            admin = _c.sent();
                            return [4 /*yield*/, this.prisma.reportRecord.findUnique({ where: { id: id } })];
                        case 2:
                            report = _c.sent();
                            if (!report) {
                                throw new common_1.UnauthorizedException('Report not found');
                            }
                            targetStatus = dto.action === 'KEEP' ? 'NORMAL' : dto.action === 'HIDE' ? 'HIDDEN' : 'DELETED';
                            if (!(report.targetType === 'COMMENT' && report.commentId)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.comment.update({ where: { id: report.commentId }, data: { status: targetStatus } })];
                        case 3:
                            _c.sent();
                            _c.label = 4;
                        case 4:
                            if (!(report.targetType === 'VIDEO_DANMAKU' && report.danmakuId)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.videoDanmaku.update({ where: { id: report.danmakuId }, data: { status: targetStatus } })];
                        case 5:
                            _c.sent();
                            _c.label = 6;
                        case 6:
                            if (!(report.targetType === 'VIDEO' && report.videoId && dto.action !== 'KEEP')) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.prisma.video.update({
                                    where: { id: report.videoId },
                                    data: { status: 'REJECTED', rejectReason: (_a = dto.reason) !== null && _a !== void 0 ? _a : '被举报后下架' },
                                })];
                        case 7:
                            _c.sent();
                            _c.label = 8;
                        case 8: return [4 /*yield*/, this.prisma.reportRecord.update({
                                where: { id: id },
                                data: {
                                    status: dto.action === 'KEEP' ? 'REJECTED' : 'PROCESSED',
                                    handlerId: admin.id,
                                    handledAt: new Date(),
                                    handleNote: (_b = dto.reason) !== null && _b !== void 0 ? _b : null,
                                },
                            })];
                        case 9:
                            updated = _c.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(updated)];
                    }
                });
            });
        };
        AdminController_1.prototype.getDashboard = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, totalVideos, pendingReviews, publishedVideos, rejectedVideos, pendingReports, hiddenComments, hiddenDanmakus;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.requireAdmin(authorization)];
                        case 1:
                            _b.sent();
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.video.count(),
                                    this.prisma.videoReview.count({ where: { status: 'PENDING' } }),
                                    this.prisma.video.count({ where: { status: 'PUBLISHED' } }),
                                    this.prisma.video.count({ where: { status: 'REJECTED' } }),
                                    this.prisma.reportRecord.count({ where: { status: 'PENDING' } }),
                                    this.prisma.comment.count({ where: { status: { not: 'NORMAL' } } }),
                                    this.prisma.videoDanmaku.count({ where: { status: { not: 'NORMAL' } } }),
                                ])];
                        case 2:
                            _a = _b.sent(), totalVideos = _a[0], pendingReviews = _a[1], publishedVideos = _a[2], rejectedVideos = _a[3], pendingReports = _a[4], hiddenComments = _a[5], hiddenDanmakus = _a[6];
                            return [2 /*return*/, (0, api_response_dto_1.ok)({
                                    totalVideos: totalVideos,
                                    pendingReviews: pendingReviews,
                                    publishedVideos: publishedVideos,
                                    rejectedVideos: rejectedVideos,
                                    pendingReports: pendingReports,
                                    hiddenComments: hiddenComments,
                                    hiddenDanmakus: hiddenDanmakus,
                                })];
                    }
                });
            });
        };
        return AdminController_1;
    }());
    __setFunctionName(_classThis, "AdminController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getVideoReviewQueue_decorators = [(0, common_1.Get)('reviews/videos')];
        _reviewVideo_decorators = [(0, common_1.Post)('reviews/videos/:id')];
        _getTextReviewQueue_decorators = [(0, common_1.Get)('reviews/text-content')];
        _moderateTextContent_decorators = [(0, common_1.Post)('reviews/text-content/:targetType/:id')];
        _getReports_decorators = [(0, common_1.Get)('reports')];
        _handleReport_decorators = [(0, common_1.Post)('reports/:id')];
        _getDashboard_decorators = [(0, common_1.Get)('dashboard')];
        __esDecorate(_classThis, null, _getVideoReviewQueue_decorators, { kind: "method", name: "getVideoReviewQueue", static: false, private: false, access: { has: function (obj) { return "getVideoReviewQueue" in obj; }, get: function (obj) { return obj.getVideoReviewQueue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reviewVideo_decorators, { kind: "method", name: "reviewVideo", static: false, private: false, access: { has: function (obj) { return "reviewVideo" in obj; }, get: function (obj) { return obj.reviewVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTextReviewQueue_decorators, { kind: "method", name: "getTextReviewQueue", static: false, private: false, access: { has: function (obj) { return "getTextReviewQueue" in obj; }, get: function (obj) { return obj.getTextReviewQueue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _moderateTextContent_decorators, { kind: "method", name: "moderateTextContent", static: false, private: false, access: { has: function (obj) { return "moderateTextContent" in obj; }, get: function (obj) { return obj.moderateTextContent; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getReports_decorators, { kind: "method", name: "getReports", static: false, private: false, access: { has: function (obj) { return "getReports" in obj; }, get: function (obj) { return obj.getReports; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleReport_decorators, { kind: "method", name: "handleReport", static: false, private: false, access: { has: function (obj) { return "handleReport" in obj; }, get: function (obj) { return obj.handleReport; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getDashboard_decorators, { kind: "method", name: "getDashboard", static: false, private: false, access: { has: function (obj) { return "getDashboard" in obj; }, get: function (obj) { return obj.getDashboard; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminController = _classThis;
}();
exports.AdminController = AdminController;
