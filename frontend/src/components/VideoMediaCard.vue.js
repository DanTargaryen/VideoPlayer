/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed } from 'vue';
const props = defineProps();
const creatorId = computed(() => props.item.creator?.id ?? props.item.creatorId ?? null);
const creatorLabel = computed(() => props.item.creator?.nickname ?? `用户 #${creatorId.value ?? '-'}`);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-link']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-link']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: (__VLS_ctx.item.coverUrl),
    alt: (__VLS_ctx.item.title),
    ...{ class: "cover" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "title-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.item.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.item.description);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.creatorLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.item.likeCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.item.favoriteCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "meta-chip" },
});
(__VLS_ctx.item.commentCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "actions" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: (`/video/${__VLS_ctx.item.id}`),
    ...{ class: "primary-link" },
}));
const __VLS_2 = __VLS_1({
    to: (`/video/${__VLS_ctx.item.id}`),
    ...{ class: "primary-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
var __VLS_3;
if (__VLS_ctx.creatorId) {
    const __VLS_4 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        to: (`/users/${__VLS_ctx.creatorId}`),
        ...{ class: "secondary-link" },
    }));
    const __VLS_6 = __VLS_5({
        to: (`/users/${__VLS_ctx.creatorId}`),
        ...{ class: "secondary-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    var __VLS_7;
}
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['cover']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-link']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary-link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            creatorId: creatorId,
            creatorLabel: creatorLabel,
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
