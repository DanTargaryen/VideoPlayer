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
exports.AiSummaryService = void 0;
var common_1 = require("@nestjs/common");
var promises_1 = require("node:fs/promises");
var path = require("node:path");
var video_summary_prompt_1 = require("./constants/video-summary-prompt");
var DEFAULT_DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
var AiSummaryService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AiSummaryService = _classThis = /** @class */ (function () {
        function AiSummaryService_1(configService) {
            this.configService = configService;
            this.logger = new common_1.Logger(AiSummaryService.name);
        }
        AiSummaryService_1.prototype.generateSummary = function (framePaths) {
            return __awaiter(this, void 0, void 0, function () {
                var apiKey, model, baseUrl, endpoint, controller, timeoutId, content, _i, framePaths_1, framePath, _a, _b, response, message, payload, summary, error_1;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (framePaths.length === 0) {
                                throw new common_1.BadGatewayException('No frames available for AI summary');
                            }
                            apiKey = this.configService.get('DASHSCOPE_API_KEY');
                            if (!apiKey) {
                                throw new common_1.InternalServerErrorException('DASHSCOPE_API_KEY is not configured');
                            }
                            model = this.configService.get('QWEN_VL_MODEL') || 'qwen3.6-plus';
                            baseUrl = this.configService.get('DASHSCOPE_BASE_URL') || DEFAULT_DASHSCOPE_BASE_URL;
                            endpoint = "".concat(baseUrl.replace(/\/$/, ''), "/chat/completions");
                            controller = new AbortController();
                            timeoutId = setTimeout(function () { return controller.abort(); }, 60000);
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 10, 11, 12]);
                            content = [{ type: 'text', text: video_summary_prompt_1.VIDEO_SUMMARY_PROMPT }];
                            _i = 0, framePaths_1 = framePaths;
                            _e.label = 2;
                        case 2:
                            if (!(_i < framePaths_1.length)) return [3 /*break*/, 5];
                            framePath = framePaths_1[_i];
                            _b = (_a = content).push;
                            _c = {
                                type: 'image_url'
                            };
                            _d = {};
                            return [4 /*yield*/, this.toDataUrl(framePath)];
                        case 3:
                            _b.apply(_a, [(_c.image_url = (_d.url = _e.sent(),
                                    _d),
                                    _c)]);
                            _e.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [4 /*yield*/, fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: "Bearer ".concat(apiKey),
                                },
                                body: JSON.stringify({
                                    model: model,
                                    temperature: 0.2,
                                    messages: [
                                        {
                                            role: 'user',
                                            content: content,
                                        },
                                    ],
                                }),
                                signal: controller.signal,
                            })];
                        case 6:
                            response = _e.sent();
                            if (!!response.ok) return [3 /*break*/, 8];
                            return [4 /*yield*/, response.text()];
                        case 7:
                            message = _e.sent();
                            throw new common_1.BadGatewayException("Qwen API request failed with status ".concat(response.status, ": ").concat(message || 'empty response'));
                        case 8: return [4 /*yield*/, response.json()];
                        case 9:
                            payload = (_e.sent());
                            summary = this.extractSummary(payload);
                            if (!summary) {
                                throw new common_1.BadGatewayException('Qwen API returned empty summary');
                            }
                            return [2 /*return*/, {
                                    summary: summary,
                                    model: model,
                                }];
                        case 10:
                            error_1 = _e.sent();
                            if (error_1 instanceof common_1.BadGatewayException || error_1 instanceof common_1.InternalServerErrorException) {
                                throw error_1;
                            }
                            this.logger.error("Failed to call Qwen API: ".concat(this.getErrorMessage(error_1)));
                            throw new common_1.BadGatewayException('Failed to generate summary from Qwen API');
                        case 11:
                            clearTimeout(timeoutId);
                            return [7 /*endfinally*/];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        AiSummaryService_1.prototype.toDataUrl = function (framePath) {
            return __awaiter(this, void 0, void 0, function () {
                var buffer, extension, mimeType;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, promises_1.readFile)(framePath)];
                        case 1:
                            buffer = _a.sent();
                            extension = path.extname(framePath).toLowerCase();
                            mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
                            return [2 /*return*/, "data:".concat(mimeType, ";base64,").concat(buffer.toString('base64'))];
                    }
                });
            });
        };
        AiSummaryService_1.prototype.extractSummary = function (payload) {
            var _a, _b, _c;
            var content = (_c = (_b = (_a = payload.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
            if (!content) {
                return '';
            }
            if (typeof content === 'string') {
                return content.trim();
            }
            return content
                .map(function (part) { var _a, _b; return (_b = (_a = part.text) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''; })
                .filter(Boolean)
                .join('\n')
                .trim();
        };
        AiSummaryService_1.prototype.getErrorMessage = function (error) {
            if (error instanceof Error) {
                return error.message;
            }
            return String(error);
        };
        return AiSummaryService_1;
    }());
    __setFunctionName(_classThis, "AiSummaryService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AiSummaryService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AiSummaryService = _classThis;
}();
exports.AiSummaryService = AiSummaryService;
