/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchUserHomepage, followUser, unfollowUser } from '@/api/platform';
import { useAppStore } from '@/stores/app';
const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80';
const route = useRoute();
const store = useAppStore();
const loading = ref(false);
const homepage = ref(null);
const canFollow = computed(() => homepage.value && store.isLoggedIn && homepage.value.id !== store.userId);
async function loadHomepage() {
    loading.value = true;
    try {
        homepage.value = await fetchUserHomepage(Number(route.params.id));
    }
    catch {
        ElMessage.error('加载用户主页失败');
    }
    finally {
        loading.value = false;
    }
}
async function toggleFollow() {
    if (!homepage.value) {
        return;
    }
    try {
        if (homepage.value.isFollowing) {
            await unfollowUser(homepage.value.id);
            ElMessage.success('已取消关注');
        }
        else {
            await followUser(homepage.value.id);
            ElMessage.success('关注成功');
        }
        await loadHomepage();
    }
    catch {
        ElMessage.error('操作失败，请确认已登录');
    }
}
watch(() => route.params.id, () => {
    void loadHomepage();
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (__VLS_ctx.homepage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.homepage.avatarUrl || __VLS_ctx.fallbackAvatar),
        alt: (__VLS_ctx.homepage.nickname),
        ...{ class: "avatar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.homepage.nickname);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.homepage.bio || '这个用户还没有填写简介。');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "meta" },
    });
    (__VLS_ctx.homepage.followers);
    (__VLS_ctx.homepage.following);
    (__VLS_ctx.homepage.videos);
    if (__VLS_ctx.canFollow) {
        const __VLS_0 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.homepage.isFollowing ? 'default' : 'primary'),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.homepage.isFollowing ? 'default' : 'primary'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_4;
        let __VLS_5;
        let __VLS_6;
        const __VLS_7 = {
            onClick: (__VLS_ctx.toggleFollow)
        };
        __VLS_3.slots.default;
        (__VLS_ctx.homepage.isFollowing ? '取消关注' : '关注用户');
        var __VLS_3;
    }
}
if (__VLS_ctx.homepage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cards" },
    });
    for (const [card] of __VLS_getVForSourceType((__VLS_ctx.homepage.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (card.id),
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (card.coverUrl),
            alt: (card.title),
            ...{ class: "cover" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (card.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (card.description);
        const __VLS_8 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            to: (`/video/${card.id}`),
            ...{ class: "enter-link" },
        }));
        const __VLS_10 = __VLS_9({
            to: (`/video/${card.id}`),
            ...{ class: "enter-link" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
        var __VLS_11;
    }
    if (__VLS_ctx.homepage.items.length === 0) {
        const __VLS_12 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            description: "该用户还没有发布内容",
        }));
        const __VLS_14 = __VLS_13({
            description: "该用户还没有发布内容",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
}
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-head']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['meta']} */ ;
/** @type {__VLS_StyleScopedClasses['cards']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['cover']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['enter-link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            fallbackAvatar: fallbackAvatar,
            loading: loading,
            homepage: homepage,
            canFollow: canFollow,
            toggleFollow: toggleFollow,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
