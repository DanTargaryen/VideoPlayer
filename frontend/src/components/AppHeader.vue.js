/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { fetchUnreadNotificationCount } from '@/api/platform';
import { useAppStore } from '@/stores/app';
import { primaryNavItems as navItems } from '@/utils/navigation';
const store = useAppStore();
const router = useRouter();
const route = useRoute();
const { siteName, nickname, isLoggedIn, isAdmin, token } = storeToRefs(store);
const unreadCount = ref(0);
const searchKeyword = ref(String(route.query.keyword ?? ''));
async function syncUnreadCount() {
    if (!isLoggedIn.value) {
        unreadCount.value = 0;
        return;
    }
    try {
        const result = await fetchUnreadNotificationCount();
        unreadCount.value = result.unreadCount;
    }
    catch {
        unreadCount.value = 0;
    }
}
function submitSearch() {
    router.push({
        path: '/search',
        query: {
            keyword: searchKeyword.value,
            tab: 'video',
        },
    });
}
function logout() {
    store.logout();
    unreadCount.value = 0;
    router.push('/');
}
watch(token, () => {
    void syncUnreadCount();
});
watch(() => route.query.keyword, (value) => {
    searchKeyword.value = String(value ?? '');
});
onMounted(() => {
    void syncUnreadCount();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['action-link']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand" },
});
(__VLS_ctx.siteName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-box" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索视频或用户",
    clearable: true,
}));
const __VLS_2 = __VLS_1({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索视频或用户",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onKeyup: (__VLS_ctx.submitSearch)
};
var __VLS_3;
const __VLS_8 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.submitSearch)
};
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
    const __VLS_16 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-link" },
    }));
    const __VLS_18 = __VLS_17({
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (item.label);
    var __VLS_19;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "nickname" },
});
(__VLS_ctx.nickname);
const __VLS_20 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    to: "/following",
    ...{ class: "action-link" },
}));
const __VLS_22 = __VLS_21({
    to: "/following",
    ...{ class: "action-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
var __VLS_23;
const __VLS_24 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    to: "/notifications",
    ...{ class: "action-link" },
}));
const __VLS_26 = __VLS_25({
    to: "/notifications",
    ...{ class: "action-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
if (__VLS_ctx.unreadCount > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge" },
    });
    (__VLS_ctx.unreadCount);
}
var __VLS_27;
const __VLS_28 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    to: "/user/dashboard",
    ...{ class: "action-link" },
}));
const __VLS_30 = __VLS_29({
    to: "/user/dashboard",
    ...{ class: "action-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
var __VLS_31;
if (__VLS_ctx.isAdmin) {
    const __VLS_32 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        to: "/admin/dashboard",
        ...{ class: "action-link" },
    }));
    const __VLS_34 = __VLS_33({
        to: "/admin/dashboard",
        ...{ class: "action-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    var __VLS_35;
}
if (!__VLS_ctx.isLoggedIn) {
    const __VLS_36 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        to: "/login",
        ...{ class: "action-link" },
    }));
    const __VLS_38 = __VLS_37({
        to: "/login",
        ...{ class: "action-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    var __VLS_39;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.logout) },
        ...{ class: "ghost-btn" },
    });
}
/** @type {__VLS_StyleScopedClasses['header']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['nickname']} */ ;
/** @type {__VLS_StyleScopedClasses['action-link']} */ ;
/** @type {__VLS_StyleScopedClasses['action-link']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['action-link']} */ ;
/** @type {__VLS_StyleScopedClasses['action-link']} */ ;
/** @type {__VLS_StyleScopedClasses['action-link']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            navItems: navItems,
            siteName: siteName,
            nickname: nickname,
            isLoggedIn: isLoggedIn,
            isAdmin: isAdmin,
            unreadCount: unreadCount,
            searchKeyword: searchKeyword,
            submitSearch: submitSearch,
            logout: logout,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
