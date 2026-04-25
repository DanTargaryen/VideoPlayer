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
exports.FrameExtractService = void 0;
var common_1 = require("@nestjs/common");
var node_child_process_1 = require("node:child_process");
var node_crypto_1 = require("node:crypto");
var promises_1 = require("node:fs/promises");
var path = require("node:path");
var node_util_1 = require("node:util");
var execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
var FrameExtractService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var FrameExtractService = _classThis = /** @class */ (function () {
        function FrameExtractService_1(configService) {
            this.configService = configService;
        }
        FrameExtractService_1.prototype.extractFrames = function (options) {
            return __awaiter(this, void 0, void 0, function () {
                var ffmpegBin, fps, minFrameCount, maxFrameCount, frameDir, outputPattern, error_1, frameFiles, deduplicated, selected;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ffmpegBin = this.configService.get('FFMPEG_PATH') || 'ffmpeg';
                            fps = this.getFrameFps();
                            minFrameCount = this.getMinFrameCount();
                            maxFrameCount = Math.max(this.getMaxFrameCount(), minFrameCount);
                            frameDir = path.join(options.workingDir, 'frames');
                            return [4 /*yield*/, (0, promises_1.mkdir)(frameDir, { recursive: true })];
                        case 1:
                            _a.sent();
                            outputPattern = path.join(frameDir, 'frame-%03d.jpg');
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, execFileAsync(ffmpegBin, [
                                    '-y',
                                    '-i',
                                    options.inputPath,
                                    '-vf',
                                    "fps=".concat(fps),
                                    '-q:v',
                                    '3',
                                    outputPattern,
                                ])];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _a.sent();
                            throw new common_1.BadRequestException("Failed to extract frames with ffmpeg: ".concat(this.getErrorMessage(error_1)));
                        case 5: return [4 /*yield*/, (0, promises_1.readdir)(frameDir)];
                        case 6:
                            frameFiles = (_a.sent())
                                .filter(function (name) { return name.endsWith('.jpg'); })
                                .sort(function (left, right) { return left.localeCompare(right); })
                                .map(function (name) { return path.join(frameDir, name); });
                            if (frameFiles.length === 0) {
                                throw new common_1.BadRequestException('No frames extracted from video');
                            }
                            return [4 /*yield*/, this.removeExactDuplicateFrames(frameFiles)];
                        case 7:
                            deduplicated = _a.sent();
                            selected = deduplicated.length >= minFrameCount ? deduplicated : frameFiles;
                            selected = this.pickEvenlyDistributedFrames(selected, maxFrameCount);
                            if (selected.length < minFrameCount && frameFiles.length > selected.length) {
                                selected = this.pickEvenlyDistributedFrames(frameFiles, minFrameCount);
                            }
                            if (selected.length === 0) {
                                throw new common_1.BadRequestException('Failed to prepare frames for AI summary');
                            }
                            return [2 /*return*/, selected];
                    }
                });
            });
        };
        FrameExtractService_1.prototype.getFrameFps = function () {
            var _a;
            var value = Number((_a = this.configService.get('AI_SUMMARY_FRAME_FPS')) !== null && _a !== void 0 ? _a : '2');
            if (!Number.isFinite(value) || value <= 0) {
                return 2;
            }
            return value;
        };
        FrameExtractService_1.prototype.getMinFrameCount = function () {
            var _a;
            var value = Number((_a = this.configService.get('AI_SUMMARY_MIN_FRAMES')) !== null && _a !== void 0 ? _a : '4');
            if (!Number.isFinite(value) || value < 1) {
                return 4;
            }
            return Math.max(1, Math.floor(value));
        };
        FrameExtractService_1.prototype.getMaxFrameCount = function () {
            var _a;
            var value = Number((_a = this.configService.get('AI_SUMMARY_MAX_FRAMES')) !== null && _a !== void 0 ? _a : '6');
            if (!Number.isFinite(value) || value < 1) {
                return 6;
            }
            return Math.max(1, Math.floor(value));
        };
        FrameExtractService_1.prototype.removeExactDuplicateFrames = function (frameFiles) {
            return __awaiter(this, void 0, void 0, function () {
                var seenHashes, uniqueFrames, _i, frameFiles_1, framePath, file, hash;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            seenHashes = new Set();
                            uniqueFrames = [];
                            _i = 0, frameFiles_1 = frameFiles;
                            _a.label = 1;
                        case 1:
                            if (!(_i < frameFiles_1.length)) return [3 /*break*/, 4];
                            framePath = frameFiles_1[_i];
                            return [4 /*yield*/, (0, promises_1.readFile)(framePath)];
                        case 2:
                            file = _a.sent();
                            hash = (0, node_crypto_1.createHash)('sha1').update(file).digest('hex');
                            if (seenHashes.has(hash)) {
                                return [3 /*break*/, 3];
                            }
                            seenHashes.add(hash);
                            uniqueFrames.push(framePath);
                            _a.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, uniqueFrames];
                    }
                });
            });
        };
        FrameExtractService_1.prototype.pickEvenlyDistributedFrames = function (frameFiles, targetCount) {
            if (frameFiles.length <= targetCount) {
                return __spreadArray([], frameFiles, true);
            }
            var pickedIndices = new Set();
            var pickedFiles = [];
            var lastIndex = frameFiles.length - 1;
            var interval = targetCount === 1 ? 0 : lastIndex / (targetCount - 1);
            for (var i = 0; i < targetCount; i += 1) {
                var index = Math.round(interval * i);
                if (pickedIndices.has(index)) {
                    continue;
                }
                pickedIndices.add(index);
                pickedFiles.push(frameFiles[index]);
            }
            if (pickedFiles.length === targetCount) {
                return pickedFiles;
            }
            for (var i = 0; i < frameFiles.length && pickedFiles.length < targetCount; i += 1) {
                if (pickedIndices.has(i)) {
                    continue;
                }
                pickedIndices.add(i);
                pickedFiles.push(frameFiles[i]);
            }
            return pickedFiles;
        };
        FrameExtractService_1.prototype.getErrorMessage = function (error) {
            if (error instanceof Error) {
                return error.message;
            }
            return String(error);
        };
        return FrameExtractService_1;
    }());
    __setFunctionName(_classThis, "FrameExtractService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FrameExtractService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FrameExtractService = _classThis;
}();
exports.FrameExtractService = FrameExtractService;
