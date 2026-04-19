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
exports.LiveController = void 0;
var common_1 = require("@nestjs/common");
var class_validator_1 = require("class-validator");
var api_response_dto_1 = require("../../common/dto/api-response.dto");
var CreateRoomDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _category_decorators;
    var _category_initializers = [];
    var _category_extraInitializers = [];
    var _coverUrl_decorators;
    var _coverUrl_initializers = [];
    var _coverUrl_extraInitializers = [];
    var _sourceMode_decorators;
    var _sourceMode_initializers = [];
    var _sourceMode_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateRoomDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.category = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _category_initializers, void 0));
                this.coverUrl = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _coverUrl_initializers, void 0));
                this.sourceMode = (__runInitializers(this, _coverUrl_extraInitializers), __runInitializers(this, _sourceMode_initializers, void 0));
                __runInitializers(this, _sourceMode_extraInitializers);
            }
            return CreateRoomDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsString)()];
            _category_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _coverUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _sourceMode_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsIn)(['camera', 'screen'])];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _coverUrl_decorators, { kind: "field", name: "coverUrl", static: false, private: false, access: { has: function (obj) { return "coverUrl" in obj; }, get: function (obj) { return obj.coverUrl; }, set: function (obj, value) { obj.coverUrl = value; } }, metadata: _metadata }, _coverUrl_initializers, _coverUrl_extraInitializers);
            __esDecorate(null, null, _sourceMode_decorators, { kind: "field", name: "sourceMode", static: false, private: false, access: { has: function (obj) { return "sourceMode" in obj; }, get: function (obj) { return obj.sourceMode; }, set: function (obj, value) { obj.sourceMode = value; } }, metadata: _metadata }, _sourceMode_initializers, _sourceMode_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var SessionDescriptionDto = function () {
    var _a;
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _sdp_decorators;
    var _sdp_initializers = [];
    var _sdp_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SessionDescriptionDto() {
                this.type = __runInitializers(this, _type_initializers, void 0);
                this.sdp = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _sdp_initializers, void 0));
                __runInitializers(this, _sdp_extraInitializers);
            }
            return SessionDescriptionDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _type_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['offer', 'answer'])];
            _sdp_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _sdp_decorators, { kind: "field", name: "sdp", static: false, private: false, access: { has: function (obj) { return "sdp" in obj; }, get: function (obj) { return obj.sdp; }, set: function (obj, value) { obj.sdp = value; } }, metadata: _metadata }, _sdp_initializers, _sdp_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var LiveMessageDto = function () {
    var _a;
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    return _a = /** @class */ (function () {
            function LiveMessageDto() {
                this.content = __runInitializers(this, _content_initializers, void 0);
                __runInitializers(this, _content_extraInitializers);
            }
            return LiveMessageDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _content_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var SaveReplayDto = function () {
    var _a;
    var _saveMode_decorators;
    var _saveMode_initializers = [];
    var _saveMode_extraInitializers = [];
    var _assetId_decorators;
    var _assetId_initializers = [];
    var _assetId_extraInitializers = [];
    var _uploadToken_decorators;
    var _uploadToken_initializers = [];
    var _uploadToken_extraInitializers = [];
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
    var _coverAssetId_decorators;
    var _coverAssetId_initializers = [];
    var _coverAssetId_extraInitializers = [];
    var _coverUploadToken_decorators;
    var _coverUploadToken_initializers = [];
    var _coverUploadToken_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SaveReplayDto() {
                this.saveMode = __runInitializers(this, _saveMode_initializers, void 0);
                this.assetId = (__runInitializers(this, _saveMode_extraInitializers), __runInitializers(this, _assetId_initializers, void 0));
                this.uploadToken = (__runInitializers(this, _assetId_extraInitializers), __runInitializers(this, _uploadToken_initializers, void 0));
                this.title = (__runInitializers(this, _uploadToken_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.category = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _category_initializers, void 0));
                this.coverUrl = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _coverUrl_initializers, void 0));
                this.coverAssetId = (__runInitializers(this, _coverUrl_extraInitializers), __runInitializers(this, _coverAssetId_initializers, void 0));
                this.coverUploadToken = (__runInitializers(this, _coverAssetId_extraInitializers), __runInitializers(this, _coverUploadToken_initializers, void 0));
                __runInitializers(this, _coverUploadToken_extraInitializers);
            }
            return SaveReplayDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _saveMode_decorators = [(0, class_validator_1.IsIn)(['REPLAY', 'UPLOAD'])];
            _assetId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            _uploadToken_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _title_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _category_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _coverUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _coverAssetId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)()];
            _coverUploadToken_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _saveMode_decorators, { kind: "field", name: "saveMode", static: false, private: false, access: { has: function (obj) { return "saveMode" in obj; }, get: function (obj) { return obj.saveMode; }, set: function (obj, value) { obj.saveMode = value; } }, metadata: _metadata }, _saveMode_initializers, _saveMode_extraInitializers);
            __esDecorate(null, null, _assetId_decorators, { kind: "field", name: "assetId", static: false, private: false, access: { has: function (obj) { return "assetId" in obj; }, get: function (obj) { return obj.assetId; }, set: function (obj, value) { obj.assetId = value; } }, metadata: _metadata }, _assetId_initializers, _assetId_extraInitializers);
            __esDecorate(null, null, _uploadToken_decorators, { kind: "field", name: "uploadToken", static: false, private: false, access: { has: function (obj) { return "uploadToken" in obj; }, get: function (obj) { return obj.uploadToken; }, set: function (obj, value) { obj.uploadToken = value; } }, metadata: _metadata }, _uploadToken_initializers, _uploadToken_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: function (obj) { return "category" in obj; }, get: function (obj) { return obj.category; }, set: function (obj, value) { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
            __esDecorate(null, null, _coverUrl_decorators, { kind: "field", name: "coverUrl", static: false, private: false, access: { has: function (obj) { return "coverUrl" in obj; }, get: function (obj) { return obj.coverUrl; }, set: function (obj, value) { obj.coverUrl = value; } }, metadata: _metadata }, _coverUrl_initializers, _coverUrl_extraInitializers);
            __esDecorate(null, null, _coverAssetId_decorators, { kind: "field", name: "coverAssetId", static: false, private: false, access: { has: function (obj) { return "coverAssetId" in obj; }, get: function (obj) { return obj.coverAssetId; }, set: function (obj, value) { obj.coverAssetId = value; } }, metadata: _metadata }, _coverAssetId_initializers, _coverAssetId_extraInitializers);
            __esDecorate(null, null, _coverUploadToken_decorators, { kind: "field", name: "coverUploadToken", static: false, private: false, access: { has: function (obj) { return "coverUploadToken" in obj; }, get: function (obj) { return obj.coverUploadToken; }, set: function (obj, value) { obj.coverUploadToken = value; } }, metadata: _metadata }, _coverUploadToken_initializers, _coverUploadToken_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var LiveRtcExchangeDto = function () {
    var _a;
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _sdp_decorators;
    var _sdp_initializers = [];
    var _sdp_extraInitializers = [];
    return _a = /** @class */ (function () {
            function LiveRtcExchangeDto() {
                this.type = __runInitializers(this, _type_initializers, void 0);
                this.sdp = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _sdp_initializers, void 0));
                __runInitializers(this, _sdp_extraInitializers);
            }
            return LiveRtcExchangeDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _type_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)(['offer', 'answer'])];
            _sdp_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _sdp_decorators, { kind: "field", name: "sdp", static: false, private: false, access: { has: function (obj) { return "sdp" in obj; }, get: function (obj) { return obj.sdp; }, set: function (obj, value) { obj.sdp = value; } }, metadata: _metadata }, _sdp_initializers, _sdp_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var LiveFrameDto = function () {
    var _a;
    var _image_decorators;
    var _image_initializers = [];
    var _image_extraInitializers = [];
    return _a = /** @class */ (function () {
            function LiveFrameDto() {
                this.image = __runInitializers(this, _image_initializers, void 0);
                __runInitializers(this, _image_extraInitializers);
            }
            return LiveFrameDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _image_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _image_decorators, { kind: "field", name: "image", static: false, private: false, access: { has: function (obj) { return "image" in obj; }, get: function (obj) { return obj.image; }, set: function (obj, value) { obj.image = value; } }, metadata: _metadata }, _image_initializers, _image_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var LiveController = function () {
    var _classDecorators = [(0, common_1.Controller)('lives')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createRoom_decorators;
    var _listRooms_decorators;
    var _getRoom_decorators;
    var _publishToSrs_decorators;
    var _playFromSrs_decorators;
    var _getFrame_decorators;
    var _updateFrame_decorators;
    var _startRoom_decorators;
    var _stopRoom_decorators;
    var _createViewer_decorators;
    var _removeViewer_decorators;
    var _submitViewerOffer_decorators;
    var _getPendingViewers_decorators;
    var _submitViewerAnswer_decorators;
    var _getViewerAnswer_decorators;
    var _listMessages_decorators;
    var _createMessage_decorators;
    var _saveReplay_decorators;
    var _streamRoomFeed_decorators;
    var _streamPublisherSignals_decorators;
    var _streamViewerSignals_decorators;
    var _getSession_decorators;
    var LiveController = _classThis = /** @class */ (function () {
        function LiveController_1(liveService, authService) {
            this.liveService = (__runInitializers(this, _instanceExtraInitializers), liveService);
            this.authService = authService;
        }
        LiveController_1.prototype.createRoom = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.createRoom(user, dto))];
                    }
                });
            });
        };
        LiveController_1.prototype.listRooms = function (keyword, status, category, broadcasterId, limit) {
            return (0, api_response_dto_1.ok)(this.liveService.listRooms({
                keyword: keyword,
                status: status,
                category: category,
                broadcasterId: broadcasterId !== undefined ? Number(broadcasterId) : undefined,
                limit: limit !== undefined ? Number(limit) : undefined,
            }));
        };
        LiveController_1.prototype.getRoom = function (id) {
            return (0, api_response_dto_1.ok)(this.liveService.getRoom(id));
        };
        LiveController_1.prototype.publishToSrs = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.liveService.publishToSrs(id, user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        LiveController_1.prototype.playFromSrs = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.liveService.playFromSrs(id, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        LiveController_1.prototype.getFrame = function (id) {
            return (0, api_response_dto_1.ok)(this.liveService.getFrame(id));
        };
        LiveController_1.prototype.updateFrame = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.updateFrame(id, user, dto))];
                    }
                });
            });
        };
        LiveController_1.prototype.startRoom = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.startRoom(id, user))];
                    }
                });
            });
        };
        LiveController_1.prototype.stopRoom = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.stopRoom(id, user))];
                    }
                });
            });
        };
        LiveController_1.prototype.createViewer = function (id) {
            return (0, api_response_dto_1.ok)(this.liveService.createViewer(id));
        };
        LiveController_1.prototype.removeViewer = function (id, viewerId) {
            return (0, api_response_dto_1.ok)(this.liveService.removeViewer(id, viewerId));
        };
        LiveController_1.prototype.submitViewerOffer = function (id, viewerId, dto) {
            return (0, api_response_dto_1.ok)(this.liveService.submitViewerOffer(id, viewerId, dto));
        };
        LiveController_1.prototype.getPendingViewers = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.getPendingViewers(id, user))];
                    }
                });
            });
        };
        LiveController_1.prototype.submitViewerAnswer = function (authorization, id, viewerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.submitViewerAnswer(id, viewerId, user, dto))];
                    }
                });
            });
        };
        LiveController_1.prototype.getViewerAnswer = function (id, viewerId) {
            return (0, api_response_dto_1.ok)(this.liveService.getViewerAnswer(id, viewerId));
        };
        LiveController_1.prototype.listMessages = function (id) {
            return (0, api_response_dto_1.ok)(this.liveService.listMessages(id));
        };
        LiveController_1.prototype.createMessage = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, (0, api_response_dto_1.ok)(this.liveService.createMessage(id, user, dto))];
                    }
                });
            });
        };
        LiveController_1.prototype.saveReplay = function (authorization, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization)];
                        case 1:
                            user = _b.sent();
                            _a = api_response_dto_1.ok;
                            return [4 /*yield*/, this.liveService.saveReplay(id, user, dto)];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        LiveController_1.prototype.streamRoomFeed = function (id, response) {
            this.liveService.subscribeRoomFeed(id, response);
        };
        LiveController_1.prototype.streamPublisherSignals = function (authorization, token, id, response) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.authService.requireUser(authorization !== null && authorization !== void 0 ? authorization : (token ? "Bearer ".concat(token) : undefined))];
                        case 1:
                            user = _a.sent();
                            this.liveService.subscribePublisherSignals(id, user, response);
                            return [2 /*return*/];
                    }
                });
            });
        };
        LiveController_1.prototype.streamViewerSignals = function (id, viewerId, response) {
            this.liveService.subscribeViewerSignals(id, viewerId, response);
        };
        LiveController_1.prototype.getSession = function (id) {
            return (0, api_response_dto_1.ok)(this.liveService.getSession(id));
        };
        return LiveController_1;
    }());
    __setFunctionName(_classThis, "LiveController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createRoom_decorators = [(0, common_1.Post)('rooms')];
        _listRooms_decorators = [(0, common_1.Get)('rooms')];
        _getRoom_decorators = [(0, common_1.Get)('rooms/:id')];
        _publishToSrs_decorators = [(0, common_1.Post)('rooms/:id/publish')];
        _playFromSrs_decorators = [(0, common_1.Post)('rooms/:id/play')];
        _getFrame_decorators = [(0, common_1.Get)('rooms/:id/frame')];
        _updateFrame_decorators = [(0, common_1.Post)('rooms/:id/frame')];
        _startRoom_decorators = [(0, common_1.Post)('rooms/:id/start')];
        _stopRoom_decorators = [(0, common_1.Post)('rooms/:id/stop')];
        _createViewer_decorators = [(0, common_1.Post)('rooms/:id/viewers')];
        _removeViewer_decorators = [(0, common_1.Delete)('rooms/:id/viewers/:viewerId')];
        _submitViewerOffer_decorators = [(0, common_1.Post)('rooms/:id/viewers/:viewerId/offer')];
        _getPendingViewers_decorators = [(0, common_1.Get)('rooms/:id/publisher/pending-viewers')];
        _submitViewerAnswer_decorators = [(0, common_1.Post)('rooms/:id/viewers/:viewerId/answer')];
        _getViewerAnswer_decorators = [(0, common_1.Get)('rooms/:id/viewers/:viewerId/answer')];
        _listMessages_decorators = [(0, common_1.Get)('rooms/:id/messages')];
        _createMessage_decorators = [(0, common_1.Post)('rooms/:id/messages')];
        _saveReplay_decorators = [(0, common_1.Post)('rooms/:id/replay')];
        _streamRoomFeed_decorators = [(0, common_1.Get)('rooms/:id/events')];
        _streamPublisherSignals_decorators = [(0, common_1.Get)('rooms/:id/publisher/events')];
        _streamViewerSignals_decorators = [(0, common_1.Get)('rooms/:id/viewers/:viewerId/events')];
        _getSession_decorators = [(0, common_1.Get)('sessions/:id')];
        __esDecorate(_classThis, null, _createRoom_decorators, { kind: "method", name: "createRoom", static: false, private: false, access: { has: function (obj) { return "createRoom" in obj; }, get: function (obj) { return obj.createRoom; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listRooms_decorators, { kind: "method", name: "listRooms", static: false, private: false, access: { has: function (obj) { return "listRooms" in obj; }, get: function (obj) { return obj.listRooms; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getRoom_decorators, { kind: "method", name: "getRoom", static: false, private: false, access: { has: function (obj) { return "getRoom" in obj; }, get: function (obj) { return obj.getRoom; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _publishToSrs_decorators, { kind: "method", name: "publishToSrs", static: false, private: false, access: { has: function (obj) { return "publishToSrs" in obj; }, get: function (obj) { return obj.publishToSrs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _playFromSrs_decorators, { kind: "method", name: "playFromSrs", static: false, private: false, access: { has: function (obj) { return "playFromSrs" in obj; }, get: function (obj) { return obj.playFromSrs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getFrame_decorators, { kind: "method", name: "getFrame", static: false, private: false, access: { has: function (obj) { return "getFrame" in obj; }, get: function (obj) { return obj.getFrame; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateFrame_decorators, { kind: "method", name: "updateFrame", static: false, private: false, access: { has: function (obj) { return "updateFrame" in obj; }, get: function (obj) { return obj.updateFrame; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _startRoom_decorators, { kind: "method", name: "startRoom", static: false, private: false, access: { has: function (obj) { return "startRoom" in obj; }, get: function (obj) { return obj.startRoom; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _stopRoom_decorators, { kind: "method", name: "stopRoom", static: false, private: false, access: { has: function (obj) { return "stopRoom" in obj; }, get: function (obj) { return obj.stopRoom; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createViewer_decorators, { kind: "method", name: "createViewer", static: false, private: false, access: { has: function (obj) { return "createViewer" in obj; }, get: function (obj) { return obj.createViewer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeViewer_decorators, { kind: "method", name: "removeViewer", static: false, private: false, access: { has: function (obj) { return "removeViewer" in obj; }, get: function (obj) { return obj.removeViewer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _submitViewerOffer_decorators, { kind: "method", name: "submitViewerOffer", static: false, private: false, access: { has: function (obj) { return "submitViewerOffer" in obj; }, get: function (obj) { return obj.submitViewerOffer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPendingViewers_decorators, { kind: "method", name: "getPendingViewers", static: false, private: false, access: { has: function (obj) { return "getPendingViewers" in obj; }, get: function (obj) { return obj.getPendingViewers; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _submitViewerAnswer_decorators, { kind: "method", name: "submitViewerAnswer", static: false, private: false, access: { has: function (obj) { return "submitViewerAnswer" in obj; }, get: function (obj) { return obj.submitViewerAnswer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getViewerAnswer_decorators, { kind: "method", name: "getViewerAnswer", static: false, private: false, access: { has: function (obj) { return "getViewerAnswer" in obj; }, get: function (obj) { return obj.getViewerAnswer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listMessages_decorators, { kind: "method", name: "listMessages", static: false, private: false, access: { has: function (obj) { return "listMessages" in obj; }, get: function (obj) { return obj.listMessages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createMessage_decorators, { kind: "method", name: "createMessage", static: false, private: false, access: { has: function (obj) { return "createMessage" in obj; }, get: function (obj) { return obj.createMessage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveReplay_decorators, { kind: "method", name: "saveReplay", static: false, private: false, access: { has: function (obj) { return "saveReplay" in obj; }, get: function (obj) { return obj.saveReplay; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _streamRoomFeed_decorators, { kind: "method", name: "streamRoomFeed", static: false, private: false, access: { has: function (obj) { return "streamRoomFeed" in obj; }, get: function (obj) { return obj.streamRoomFeed; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _streamPublisherSignals_decorators, { kind: "method", name: "streamPublisherSignals", static: false, private: false, access: { has: function (obj) { return "streamPublisherSignals" in obj; }, get: function (obj) { return obj.streamPublisherSignals; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _streamViewerSignals_decorators, { kind: "method", name: "streamViewerSignals", static: false, private: false, access: { has: function (obj) { return "streamViewerSignals" in obj; }, get: function (obj) { return obj.streamViewerSignals; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSession_decorators, { kind: "method", name: "getSession", static: false, private: false, access: { has: function (obj) { return "getSession" in obj; }, get: function (obj) { return obj.getSession; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LiveController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LiveController = _classThis;
}();
exports.LiveController = LiveController;
