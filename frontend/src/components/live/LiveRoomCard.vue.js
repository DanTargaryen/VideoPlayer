/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed } from 'vue';
const props = defineProps();
const broadcasterLabel = computed(() => props.item.broadcaster?.nickname ?? `用户 #${props.item.broadcaster?.id ?? '-'}`);
const broadcasterInitial = computed(() => broadcasterLabel.value.slice(0, 1));
const sourceModeLabel = computed(() => (props.item.sourceMode === 'screen' ? '屏幕共享' : '摄像头直播'));
const statusLabel = computed(() => {
    if (props.item.status === 'LIVING') {
        return '直播中';
    }
    if (props.item.status === 'ENDED') {
        return '已结束';
    }
    return '待开播';
});
const statusClass = computed(() => {
    if (props.item.status === 'LIVING') {
        return 'status-live';
    }
    if (props.item.status === 'ENDED') {
        return 'status-ended';
    }
    return 'status-idle';
});
const timeLabel = computed(() => {
    const value = props.item.status === 'LIVING' ? props.item.startedAt : props.item.createdAt;
    return value ? new Date(value).toLocaleString('zh-CN') : '刚刚创建';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['viewer-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['content-block']} */ ;
/** @type {__VLS_StyleScopedClasses['content-block']} */ ;
/** @type {__VLS_StyleScopedClasses['broadcaster']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "card" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: (`/live/${__VLS_ctx.item.id}`),
    ...{ class: "cover-link" },
}));
const __VLS_2 = __VLS_1({
    to: (`/live/${__VLS_ctx.item.id}`),
    ...{ class: "cover-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (__VLS_ctx.item.coverUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.item.coverUrl),
        alt: (__VLS_ctx.item.title),
        ...{ class: "cover" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cover cover-fallback" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.sourceModeLabel);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cover-overlay" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: (['status-badge', __VLS_ctx.statusClass]) },
});
(__VLS_ctx.statusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "viewer-pill" },
});
(__VLS_ctx.item.viewerCount ?? 0);
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "avatar-chip" },
});
(__VLS_ctx.broadcasterInitial);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "content-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.item.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "broadcaster" },
});
(__VLS_ctx.broadcasterLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.sourceModeLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.timeLabel);
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-link']} */ ;
/** @type {__VLS_StyleScopedClasses['cover']} */ ;
/** @type {__VLS_StyleScopedClasses['cover']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-fallback']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['viewer-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['content-block']} */ ;
/** @type {__VLS_StyleScopedClasses['broadcaster']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            broadcasterLabel: broadcasterLabel,
            broadcasterInitial: broadcasterInitial,
            sourceModeLabel: sourceModeLabel,
            statusLabel: statusLabel,
            statusClass: statusClass,
            timeLabel: timeLabel,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
