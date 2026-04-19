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
exports.VideoController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var class_validator_1 = require("class-validator");
var api_response_dto_1 = require("../../common/dto/api-response.dto");
var categories_1 = require("../../common/constants/categories");
var CreateVideoDto = function () {
    var _a;
    var _assetId_decorators;
    var _assetId_initializers = [];
    var _assetId_extraInitializers = [];
    var _uploadToken_decorators;
    var _uploadToken_initializers = [];
    var _uploadToken_extraInitializers = [];
    var _requiredUploadReference_decorators;
    var _requiredUploadReference_initializers = [];
    var _requiredUploadReference_extraInitializers = [];
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _category_decorators;
    var _category_initializers = [];
    var _category_extraInitializers = [];
    var _tagIds_decorators;
    var _tagIds_initializers = [];
    var _tagIds_extraInitializers = [];
    var _coverUrl_decorators;
    var _coverUrl_initializers = [];
    var _coverUrl_extraInitializers = [];
    var _coverAssetId_decorators;
    var _coverAssetId_initializers = [];
    var _coverAssetId_extraInitializers = [];
    var _coverUploadToken_decorators;
    var _coverUploadToken_initializers = [];
    var _coverUploadToken_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateVideoDto() {
                this.assetId = __runInitializers(this, _assetId_initializers, void 0);
                this.uploadToken = (__runInitializers(this, _assetId_extraInitializers), __runInitializers(this, _uploadToken_initializers, void 0));
                this.requiredUploadReference = (__runInitializers(this, _uploadToken_extraInitializers), __runInitializers(this, _requiredUploadReference_initializers, void 0));
                this.title = (__runInitializers(this, _requiredUploadReference_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.category = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _category_initializers, void 0));
                this.tagIds = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _tagIds_initializers, void 0));
                this.coverUrl = (__runInitializers(this, _tagIds_extraInitializers), __runInitializers(this, _coverUrl_initializers, void 0));
                this.coverAssetId = (__runInitializers(this, _coverUrl_extraInitializers), __runInitializers(this, _coverAssetId_initializers, void 0));
                this.coverUploadToken = (__runInitializers(this, _coverAssetId_extraInitializers), __runInitializers(this, _coverUploadToken_initializers, void 0));
                __runInitializers(this, _coverUploadToken_extraInitializers);
            }
            return CreateVideoDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _assetId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            _uploadToken_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _requiredUploadReference_decorators = [(0, class_validator_1.ValidateIf)(function (value) { return value.assetId === undefined && !value.uploadToken; }), (0, class_validator_1.IsString)()];
            _title_decorators = [(0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _category_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(categories_1.VIDEO_CATEGORY_CODES)];
            _tagIds_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)()];
            _coverUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _coverAssetId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            _coverUploadToken_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _assetId_decorators, { kind: "field", name: "assetId", static: false, private: false, access: { has: function (obj) { return "assetId" in obj; }, get: function (obj) { return obj.assetId; }, set: function (obj, value) { obj.assetId = value; } }, metadata: _metadata }, _assetId_initializers, _assetId_extraInitializers);
            __esDecorate(null, null, _uploadToken_decorators, { kind: "field", name: "uploadToken", static: false, private: false, access: { has: function (obj) { return "uploadToken" in obj; }, get: function (obj) { return obj.uploadToken; }, set: function (obj, value) { obj.uploadToken = value; } }, metadata: _metadata }, _uploadToken_initializers, _uploadToken_extraInitializers);
            __esDecorate(null, null, _requiredUploadReference_decorators, { kind: "field", name: "requiredUploadReference", static: false, private: false, access: { has: function (obj) { return "requiredUploadReference" in obj; }, get: function (obj) { return obj.requiredUploadReference; }, set: function (obj, value) { obj.requiredUploadReference = value; } }, metadata: _metadata }, _requiredUploadReference_initializers, _requiredUploadReference_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _tagIds_decorators, { kind: "field", name: "tagIds", static: false, private: false, access: { has: function (obj) { return "tagIds" in obj; }, get: function (obj) { return obj.tagIds; }, set: function (obj, value) { obj.tagIds = value; } }, metadata: _metadata }, _tagIds_initializers, _tagIds_extraInitializers);
            __esDecorate(null, null, _coverUrl_decorators, { kind: "field", name: "coverUrl", static: false, private: false, access: { has: function (obj) { return "coverUrl" in obj; }, get: function (obj) { return obj.coverUrl; }, set: function (obj, value) { obj.coverUrl = value; } }, metadata: _metadata }, _coverUrl_initializers, _coverUrl_extraInitializers);
            __esDecorate(null, null, _coverAssetId_decorators, { kind: "field", name: "coverAssetId", static: false, private: false, access: { has: function (obj) { return "coverAssetId" in obj; }, get: function (obj) { return obj.coverAssetId; }, set: function (obj, value) { obj.coverAssetId = value; } }, metadata: _metadata }, _coverAssetId_initializers, _coverAssetId_extraInitializers);
            __esDecorate(null, null, _coverUploadToken_decorators, { kind: "field", name: "coverUploadToken", static: false, private: false, access: { has: function (obj) { return "coverUploadToken" in obj; }, get: function (obj) { return obj.coverUploadToken; }, set: function (obj, value) { obj.coverUploadToken = value; } }, metadata: _metadata }, _coverUploadToken_initializers, _coverUploadToken_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var UpdateVideoDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _category_decorators;
    var _category_initializers = [];
    var _category_extraInitializers = [];
    var _coverUrl_decorators;
    var _coverUrl_initializers = [];
    var _coverUrl_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateVideoDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.category = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _category_initializers, void 0));
                this.coverUrl = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _coverUrl_initializers, void 0));
                __runInitializers(this, _coverUrl_extraInitializers);
            }
            return UpdateVideoDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _category_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(categories_1.VIDEO_CATEGORY_CODES)];
            _coverUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _coverUrl_decorators, { kind: "field", name: "coverUrl", static: false, private: false, access: { has: function (obj) { return "coverUrl" in obj; }, get: function (obj) { return obj.coverUrl; }, set: function (obj, value) { obj.coverUrl = value; } }, metadata: _metadata }, _coverUrl_initializers, _coverUrl_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var CreateDanmakuDto = function () {
    var _a;
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _timeOffsetMs_decorators;
    var _timeOffsetMs_initializers = [];
    var _timeOffsetMs_extraInitializers = [];
    var _color_decorators;
    var _color_initializers = [];
    var _color_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateDanmakuDto() {
                this.content = __runInitializers(this, _content_initializers, void 0);
                this.timeOffsetMs = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _timeOffsetMs_initializers, void 0));
                this.color = (__runInitializers(this, _timeOffsetMs_extraInitializers), __runInitializers(this, _color_initializers, void 0));
                __runInitializers(this, _color_extraInitializers);
            }
            return CreateDanmakuDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _content_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(255)];
            _timeOffsetMs_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _color_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _timeOffsetMs_decorators, { kind: "field", name: "timeOffsetMs", static: false, private: false, access: { has: function (obj) { return "timeOffsetMs" in obj; }, get: function (obj) { return obj.timeOffsetMs; }, set: function (obj, value) { obj.timeOffsetMs = value; } }, metadata: _metadata }, _timeOffsetMs_initializers, _timeOffsetMs_extraInitializers);
            __esDecorate(null, null, _color_decorators, { kind: "field", name: "color", static: false, private: false, access: { has: function (obj) { return "color" in obj; }, get: function (obj) { return obj.color; }, set: function (obj, value) { obj.color = value; } }, metadata: _metadata }, _color_initializers, _color_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var RecordPlayDto = function () {
    var _a;
    var _videoDurationSeconds_decorators;
    var _videoDurationSeconds_initializers = [];
    var _videoDurationSeconds_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RecordPlayDto() {
                this.videoDurationSeconds = __runInitializers(this, _videoDurationSeconds_initializers, void 0);
                __runInitializers(this, _videoDurationSeconds_extraInitializers);
            }
            return RecordPlayDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _videoDurationSeconds_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            __esDecorate(null, null, _videoDurationSeconds_decorators, { kind: "field", name: "videoDurationSeconds", static: false, private: false, access: { has: function (obj) { return "videoDurationSeconds" in obj; }, get: function (obj) { return obj.videoDurationSeconds; }, set: function (obj, value) { obj.videoDurationSeconds = value; } }, metadata: _metadata }, _videoDurationSeconds_initializers, _videoDurationSeconds_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var ReportWatchProgressDto = function () {
    var _a;
    var _watchedSeconds_decorators;
    var _watchedSeconds_initializers = [];
    var _watchedSeconds_extraInitializers = [];
    var _currentTimeSeconds_decorators;
    var _currentTimeSeconds_initializers = [];
    var _currentTimeSeconds_extraInitializers = [];
    var _videoDurationSeconds_decorators;
    var _videoDurationSeconds_initializers = [];
    var _videoDurationSeconds_extraInitializers = [];
    var _event_decorators;
    var _event_initializers = [];
    var _event_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ReportWatchProgressDto() {
                this.watchedSeconds = __runInitializers(this, _watchedSeconds_initializers, void 0);
                this.currentTimeSeconds = (__runInitializers(this, _watchedSeconds_extraInitializers), __runInitializers(this, _currentTimeSeconds_initializers, void 0));
                this.videoDurationSeconds = (__runInitializers(this, _currentTimeSeconds_extraInitializers), __runInitializers(this, _videoDurationSeconds_initializers, void 0));
                this.event = (__runInitializers(this, _videoDurationSeconds_extraInitializers), __runInitializers(this, _event_initializers, void 0));
                __runInitializers(this, _event_extraInitializers);
            }
            return ReportWatchProgressDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _watchedSeconds_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _currentTimeSeconds_decorators = [(0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _videoDurationSeconds_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0)];
            _event_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['pause', 'leave', 'ended'])];
            __esDecorate(null, null, _watchedSeconds_decorators, { kind: "field", name: "watchedSeconds", static: false, private: false, access: { has: function (obj) { return "watchedSeconds" in obj; }, get: function (obj) { return obj.watchedSeconds; }, set: function (obj, value) { obj.watchedSeconds = value; } }, metadata: _metadata }, _watchedSeconds_initializers, _watchedSeconds_extraInitializers);
            __esDecorate(null, null, _currentTimeSeconds_decorators, { kind: "field", name: "currentTimeSeconds", static: false, private: false, access: { has: function (obj) { return "currentTimeSeconds" in obj; }, get: function (obj) { return obj.currentTimeSeconds; }, set: function (obj, value) { obj.currentTimeSeconds = value; } }, metadata: _metadata }, _currentTimeSeconds_initializers, _currentTimeSeconds_extraInitializers);
            __esDecorate(null, null, _videoDurationSeconds_decorators, { kind: "field", name: "videoDurationSeconds", static: false, private: false, access: { has: function (obj) { return "videoDurationSeconds" in obj; }, get: function (obj) { return obj.videoDurationSeconds; }, set: function (obj, value) { obj.videoDurationSeconds = value; } }, metadata: _metadata }, _videoDurationSeconds_initializers, _videoDurationSeconds_extraInitializers);
            __esDecorate(null, null, _event_decorators, { kind: "field", name: "event", static: false, private: false, access: { has: function (obj) { return "event" in obj; }, get: function (obj) { return obj.event; }, set: function (obj, value) { obj.event = value; } }, metadata: _metadata }, _event_initializers, _event_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var VideoController = function () {
    var _classDecorators = [(0, common_1.Controller)('videos')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createVideo_decorators;
    var _updateVideo_decorators;
    var _withdrawReview_decorators;
    var _getMyFavorites_decorators;
    var _getMyLikes_decorators;
    var _getReviewHistory_decorators;
    var _upload_decorators;
    var _getVideoDetail_decorators;
    var _getRecommendations_decorators;
    var _submitReview_decorators;
    var _likeVideo_decorators;
    var _unlikeVideo_decorators;
    var _favoriteVideo_decorators;
    var _recordPlay_decorators;
    var _reportWatchProgress_decorators;
    var _unfavoriteVideo_decorators;
    var _getDanmakus_decorators;
    var _createDanmaku_decorators;
    var VideoController = _classThis = /** @class */ (function () {
        function VideoController_1(videoService, authService) {
            this.videoService = (__runInitializers(this, _instanceExtraInitializers), videoService);
            this.authService = authService;
        }
        VideoController_1.prototype.createVideo = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.createVideo(user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.updateVideo = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.updateDraft(id, user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.withdrawReview = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.withdrawReview(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.getMyFavorites = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.getUserFavorites(user.id)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.getMyLikes = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.getUserLikes(user.id)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.getReviewHistory = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.getReviewHistory(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.upload = function (authorization, file, assetType) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            _b.sent();
                            if (!file) {
                                throw new common_1.BadRequestException('Upload file is required');
                            }
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.uploadFile(file, assetType !== null && assetType !== void 0 ? assetType : 'ORIGINAL')];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.getVideoDetail = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.getCurrentUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.getVideoDetail(id, user === null || user === void 0 ? void 0 : user.id)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.getRecommendations = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.getCurrentUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.getRelatedVideos(id, user === null || user === void 0 ? void 0 : user.id)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.submitReview = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.submitReview(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.likeVideo = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.likeVideo(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.unlikeVideo = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.unlikeVideo(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.favoriteVideo = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.favoriteVideo(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.recordPlay = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.recordPlay(id, user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.reportWatchProgress = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.recordWatchProgress(id, user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.unfavoriteVideo = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.unfavoriteVideo(id, user)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.getDanmakus = function (id, fromMs, toMs) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.listDanmakus(id, fromMs !== undefined ? Number(fromMs) : undefined, toMs !== undefined ? Number(toMs) : undefined)];
                        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        VideoController_1.prototype.createDanmaku = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.videoService.createDanmaku(id, user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        return VideoController_1;
    }());
    __setFunctionName(_classThis, "VideoController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createVideo_decorators = [(0, common_1.Post)()];
        _updateVideo_decorators = [(0, common_1.Put)(':id')];
        _withdrawReview_decorators = [(0, common_1.Post)(':id/withdraw-review')];
        _getMyFavorites_decorators = [(0, common_1.Get)('my/favorites')];
        _getMyLikes_decorators = [(0, common_1.Get)('my/likes')];
        _getReviewHistory_decorators = [(0, common_1.Get)(':id/reviews')];
        _upload_decorators = [(0, common_1.Post)('upload'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file'))];
        _getVideoDetail_decorators = [(0, common_1.Get)(':id')];
        _getRecommendations_decorators = [(0, common_1.Get)(':id/recommendations')];
        _submitReview_decorators = [(0, common_1.Post)(':id/submit-review')];
        _likeVideo_decorators = [(0, common_1.Post)(':id/like')];
        _unlikeVideo_decorators = [(0, common_1.Delete)(':id/like')];
        _favoriteVideo_decorators = [(0, common_1.Post)(':id/favorite')];
        _recordPlay_decorators = [(0, common_1.Post)(':id/play')];
        _reportWatchProgress_decorators = [(0, common_1.Post)(':id/watch-progress')];
        _unfavoriteVideo_decorators = [(0, common_1.Delete)(':id/favorite')];
        _getDanmakus_decorators = [(0, common_1.Get)(':id/danmaku')];
        _createDanmaku_decorators = [(0, common_1.Post)(':id/danmaku')];
        __esDecorate(_classThis, null, _createVideo_decorators, { kind: "method", name: "createVideo", static: false, private: false, access: { has: function (obj) { return "createVideo" in obj; }, get: function (obj) { return obj.createVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateVideo_decorators, { kind: "method", name: "updateVideo", static: false, private: false, access: { has: function (obj) { return "updateVideo" in obj; }, get: function (obj) { return obj.updateVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _withdrawReview_decorators, { kind: "method", name: "withdrawReview", static: false, private: false, access: { has: function (obj) { return "withdrawReview" in obj; }, get: function (obj) { return obj.withdrawReview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyFavorites_decorators, { kind: "method", name: "getMyFavorites", static: false, private: false, access: { has: function (obj) { return "getMyFavorites" in obj; }, get: function (obj) { return obj.getMyFavorites; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyLikes_decorators, { kind: "method", name: "getMyLikes", static: false, private: false, access: { has: function (obj) { return "getMyLikes" in obj; }, get: function (obj) { return obj.getMyLikes; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getReviewHistory_decorators, { kind: "method", name: "getReviewHistory", static: false, private: false, access: { has: function (obj) { return "getReviewHistory" in obj; }, get: function (obj) { return obj.getReviewHistory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _upload_decorators, { kind: "method", name: "upload", static: false, private: false, access: { has: function (obj) { return "upload" in obj; }, get: function (obj) { return obj.upload; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVideoDetail_decorators, { kind: "method", name: "getVideoDetail", static: false, private: false, access: { has: function (obj) { return "getVideoDetail" in obj; }, get: function (obj) { return obj.getVideoDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getRecommendations_decorators, { kind: "method", name: "getRecommendations", static: false, private: false, access: { has: function (obj) { return "getRecommendations" in obj; }, get: function (obj) { return obj.getRecommendations; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _submitReview_decorators, { kind: "method", name: "submitReview", static: false, private: false, access: { has: function (obj) { return "submitReview" in obj; }, get: function (obj) { return obj.submitReview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _likeVideo_decorators, { kind: "method", name: "likeVideo", static: false, private: false, access: { has: function (obj) { return "likeVideo" in obj; }, get: function (obj) { return obj.likeVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unlikeVideo_decorators, { kind: "method", name: "unlikeVideo", static: false, private: false, access: { has: function (obj) { return "unlikeVideo" in obj; }, get: function (obj) { return obj.unlikeVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _favoriteVideo_decorators, { kind: "method", name: "favoriteVideo", static: false, private: false, access: { has: function (obj) { return "favoriteVideo" in obj; }, get: function (obj) { return obj.favoriteVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recordPlay_decorators, { kind: "method", name: "recordPlay", static: false, private: false, access: { has: function (obj) { return "recordPlay" in obj; }, get: function (obj) { return obj.recordPlay; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reportWatchProgress_decorators, { kind: "method", name: "reportWatchProgress", static: false, private: false, access: { has: function (obj) { return "reportWatchProgress" in obj; }, get: function (obj) { return obj.reportWatchProgress; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unfavoriteVideo_decorators, { kind: "method", name: "unfavoriteVideo", static: false, private: false, access: { has: function (obj) { return "unfavoriteVideo" in obj; }, get: function (obj) { return obj.unfavoriteVideo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getDanmakus_decorators, { kind: "method", name: "getDanmakus", static: false, private: false, access: { has: function (obj) { return "getDanmakus" in obj; }, get: function (obj) { return obj.getDanmakus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createDanmaku_decorators, { kind: "method", name: "createDanmaku", static: false, private: false, access: { has: function (obj) { return "createDanmaku" in obj; }, get: function (obj) { return obj.createDanmaku; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VideoController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VideoController = _classThis;
}();
exports.VideoController = VideoController;
