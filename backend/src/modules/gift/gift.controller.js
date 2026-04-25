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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftController = void 0;
var common_1 = require("@nestjs/common");
var class_validator_1 = require("class-validator");
var api_response_dto_1 = require("../../common/dto/api-response.dto");
var SendGiftDto = function () {
    var _a;
    var _sessionId_decorators;
    var _sessionId_initializers = [];
    var _sessionId_extraInitializers = [];
    var _receiverId_decorators;
    var _receiverId_initializers = [];
    var _receiverId_extraInitializers = [];
    var _giftName_decorators;
    var _giftName_initializers = [];
    var _giftName_extraInitializers = [];
    var _giftCost_decorators;
    var _giftCost_initializers = [];
    var _giftCost_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SendGiftDto() {
                this.sessionId = __runInitializers(this, _sessionId_initializers, void 0);
                this.receiverId = (__runInitializers(this, _sessionId_extraInitializers), __runInitializers(this, _receiverId_initializers, void 0));
                this.giftName = (__runInitializers(this, _receiverId_extraInitializers), __runInitializers(this, _giftName_initializers, void 0));
                this.giftCost = (__runInitializers(this, _giftName_extraInitializers), __runInitializers(this, _giftCost_initializers, void 0));
                this.quantity = (__runInitializers(this, _giftCost_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
                __runInitializers(this, _quantity_extraInitializers);
            }
            return SendGiftDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _sessionId_decorators = [(0, class_validator_1.IsInt)()];
            _receiverId_decorators = [(0, class_validator_1.IsInt)()];
            _giftName_decorators = [(0, class_validator_1.IsString)()];
            _giftCost_decorators = [(0, class_validator_1.IsInt)()];
            _quantity_decorators = [(0, class_validator_1.IsInt)()];
            __esDecorate(null, null, _sessionId_decorators, { kind: "field", name: "sessionId", static: false, private: false, access: { has: function (obj) { return "sessionId" in obj; }, get: function (obj) { return obj.sessionId; }, set: function (obj, value) { obj.sessionId = value; } }, metadata: _metadata }, _sessionId_initializers, _sessionId_extraInitializers);
            __esDecorate(null, null, _receiverId_decorators, { kind: "field", name: "receiverId", static: false, private: false, access: { has: function (obj) { return "receiverId" in obj; }, get: function (obj) { return obj.receiverId; }, set: function (obj, value) { obj.receiverId = value; } }, metadata: _metadata }, _receiverId_initializers, _receiverId_extraInitializers);
            __esDecorate(null, null, _giftName_decorators, { kind: "field", name: "giftName", static: false, private: false, access: { has: function (obj) { return "giftName" in obj; }, get: function (obj) { return obj.giftName; }, set: function (obj, value) { obj.giftName = value; } }, metadata: _metadata }, _giftName_initializers, _giftName_extraInitializers);
            __esDecorate(null, null, _giftCost_decorators, { kind: "field", name: "giftCost", static: false, private: false, access: { has: function (obj) { return "giftCost" in obj; }, get: function (obj) { return obj.giftCost; }, set: function (obj, value) { obj.giftCost = value; } }, metadata: _metadata }, _giftCost_initializers, _giftCost_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var GiftController = function () {
    var _classDecorators = [(0, common_1.Controller)('gift-coins')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getWallet_decorators;
    var _claimDaily_decorators;
    var _sendGift_decorators;
    var GiftController = _classThis = /** @class */ (function () {
        function GiftController_1() {
            __runInitializers(this, _instanceExtraInitializers);
        }
        GiftController_1.prototype.getWallet = function () {
            return (0, api_response_dto_1.ok)({
                balance: 100,
                totalClaimed: 100,
                totalSpent: 0,
            });
        };
        GiftController_1.prototype.claimDaily = function () {
            return (0, api_response_dto_1.ok)({
                claimed: true,
                amount: 10,
                balance: 110,
            });
        };
        GiftController_1.prototype.sendGift = function (dto) {
            return (0, api_response_dto_1.ok)(__assign(__assign({}, dto), { balance: 90 }));
        };
        return GiftController_1;
    }());
    __setFunctionName(_classThis, "GiftController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getWallet_decorators = [(0, common_1.Get)('wallet')];
        _claimDaily_decorators = [(0, common_1.Post)('daily-claim')];
        _sendGift_decorators = [(0, common_1.Post)('send')];
        __esDecorate(_classThis, null, _getWallet_decorators, { kind: "method", name: "getWallet", static: false, private: false, access: { has: function (obj) { return "getWallet" in obj; }, get: function (obj) { return obj.getWallet; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _claimDaily_decorators, { kind: "method", name: "claimDaily", static: false, private: false, access: { has: function (obj) { return "claimDaily" in obj; }, get: function (obj) { return obj.claimDaily; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendGift_decorators, { kind: "method", name: "sendGift", static: false, private: false, access: { has: function (obj) { return "sendGift" in obj; }, get: function (obj) { return obj.sendGift; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GiftController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GiftController = _classThis;
}();
exports.GiftController = GiftController;
