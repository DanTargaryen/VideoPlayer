/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed } from 'vue';
const props = defineProps();
const broadcasterLabel = computed(() => props.item.broadcaster?.nickname ?? `用户 #${props.item.broadcaster?.id ?? '-'}`);
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
    const startedAt = props.item.startedAt ? new Date(props.item.startedAt).toLocaleString('zh-CN') : '';
    if (props.item.status === 'LIVING' && startedAt) {
        return `开播时间 ${startedAt}`;
    }
    const endedAt = props.item.endedAt ? new Date(props.item.endedAt).toLocaleString('zh-CN') : '';
    if (props.item.status === 'ENDED' && endedAt) {
        return `结束时间 ${endedAt}`;
    }
    const createdAt = props.item.createdAt ? new Date(props.item.createdAt).toLocaleString('zh-CN') : '';
    return createdAt ? `创建时间 ${createdAt}` : '等待主播开始推流';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
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
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "title-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "title-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.item.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.broadcasterLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: (['status-badge', __VLS_ctx.statusClass]) },
});
(__VLS_ctx.statusLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.sourceModeLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.item.viewerCount ?? 0);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.item.id);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "time-text" },
});
(__VLS_ctx.timeLabel);
const __VLS_4 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    to: (`/live/${__VLS_ctx.item.id}`),
    ...{ class: "primary-link" },
}));
const __VLS_6 = __VLS_5({
    to: (`/live/${__VLS_ctx.item.id}`),
    ...{ class: "primary-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
(__VLS_ctx.item.status === 'LIVING' ? '进入直播间' : '查看房间');
var __VLS_7;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-link']} */ ;
/** @type {__VLS_StyleScopedClasses['cover']} */ ;
/** @type {__VLS_StyleScopedClasses['cover']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-fallback']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['time-text']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            broadcasterLabel: broadcasterLabel,
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
