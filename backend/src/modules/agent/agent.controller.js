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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
var common_1 = require("@nestjs/common");
var class_validator_1 = require("class-validator");
var api_response_dto_1 = require("../../common/dto/api-response.dto");
var ReviewPreviewDto = function () {
    var _a;
    var _targetType_decorators;
    var _targetType_initializers = [];
    var _targetType_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _metadata_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ReviewPreviewDto() {
                this.targetType = __runInitializers(this, _targetType_initializers, void 0);
                this.content = (__runInitializers(this, _targetType_extraInitializers), __runInitializers(this, _content_initializers, void 0));
                this.metadata = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _metadata_initializers, void 0));
                __runInitializers(this, _metadata_extraInitializers);
            }
            return ReviewPreviewDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _targetType_decorators = [(0, class_validator_1.IsString)()];
            _content_decorators = [(0, class_validator_1.IsString)()];
            _metadata_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsObject)()];
            __esDecorate(null, null, _targetType_decorators, { kind: "field", name: "targetType", static: false, private: false, access: { has: function (obj) { return "targetType" in obj; }, get: function (obj) { return obj.targetType; }, set: function (obj, value) { obj.targetType = value; } }, metadata: _metadata }, _targetType_initializers, _targetType_extraInitializers);
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var AgentController = function () {
    var _classDecorators = [(0, common_1.Controller)('agent')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _reviewPreview_decorators;
    var _getResults_decorators;
    var AgentController = _classThis = /** @class */ (function () {
        function AgentController_1() {
            __runInitializers(this, _instanceExtraInitializers);
        }
        AgentController_1.prototype.reviewPreview = function (dto) {
            return (0, api_response_dto_1.ok)({
                targetType: dto.targetType,
                riskLevel: 'LOW',
                suggestedAction: 'MANUAL_REVIEW',
                summary: 'Mock agent output for development.',
                hitRules: [],
            });
        };
        AgentController_1.prototype.getResults = function (targetType, targetId) {
            return (0, api_response_dto_1.ok)({
                targetType: targetType,
                targetId: targetId,
                results: [],
            });
        };
        return AgentController_1;
    }());
    __setFunctionName(_classThis, "AgentController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _reviewPreview_decorators = [(0, common_1.Post)('review-preview')];
        _getResults_decorators = [(0, common_1.Get)('results')];
        __esDecorate(_classThis, null, _reviewPreview_decorators, { kind: "method", name: "reviewPreview", static: false, private: false, access: { has: function (obj) { return "reviewPreview" in obj; }, get: function (obj) { return obj.reviewPreview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getResults_decorators, { kind: "method", name: "getResults", static: false, private: false, access: { has: function (obj) { return "getResults" in obj; }, get: function (obj) { return obj.getResults; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AgentController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AgentController = _classThis;
}();
exports.AgentController = AgentController;
