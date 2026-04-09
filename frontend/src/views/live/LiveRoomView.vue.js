/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { createLiveMessage, createLiveRoom, createLiveViewer, fetchLiveMessages, fetchLiveRoom, fetchLiveRooms, fetchLiveSession, leaveLiveViewer, startLiveRoom, stopLiveRoom, submitLiveViewerAnswer, submitLiveViewerOffer, } from '@/api/platform';
import LiveRoomCard from '@/components/live/LiveRoomCard.vue';
import { useAppStore } from '@/stores/app';
const WEBRTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isLoggedIn, nickname, token, userId } = storeToRefs(appStore);
const studioVisible = ref(false);
const preparing = ref(false);
const starting = ref(false);
const joining = ref(false);
const stopping = ref(false);
const sendingMessage = ref(false);
const previewRef = ref(null);
const viewerRef = ref(null);
const previewStream = ref(null);
const remoteStream = ref(null);
const activeRoom = ref(null);
const liveSession = ref(null);
const fetchedSession = ref(null);
const hubRooms = ref([]);
const liveMessages = ref([]);
const chatDraft = ref('');
const viewerPeer = ref(null);
const viewerRoomId = ref(null);
const viewerId = ref(null);
const publisherPeers = new Map();
let hubPollTimer = null;
let roomEventSource = null;
let publisherEventSource = null;
let viewerEventSource = null;
const studioForm = reactive({
    title: '我的直播间',
    categoryId: 5,
    coverUrl: '',
    mode: 'camera',
});
const routeRoomId = computed(() => {
    const id = Number(route.params.id);
    return Number.isFinite(id) && id > 0 ? id : null;
});
const displayedSession = computed(() => liveSession.value ?? fetchedSession.value);
const currentRoomId = computed(() => routeRoomId.value ?? activeRoom.value?.id ?? null);
const isCurrentHostRoom = computed(() => Boolean(activeRoom.value && routeRoomId.value === activeRoom.value.id));
const isViewerMode = computed(() => Boolean(routeRoomId.value && !isCurrentHostRoom.value));
const hasPreview = computed(() => Boolean(previewStream.value));
const hasRemotePlayback = computed(() => Boolean(remoteStream.value));
const isLive = computed(() => displayedSession.value?.status === 'LIVING');
const canJoinAsViewer = computed(() => isViewerMode.value && displayedSession.value?.status === 'LIVING');
const canSendMessage = computed(() => Boolean(currentRoomId.value && isLoggedIn.value && displayedSession.value?.status === 'LIVING'));
const activeSourceMode = computed(() => activeRoom.value?.sourceMode ?? displayedSession.value?.sourceMode ?? studioForm.mode);
const sourceModeLabel = computed(() => (activeSourceMode.value === 'screen' ? '屏幕共享直播' : '摄像头直播'));
const shareLink = computed(() => routeRoomId.value && typeof window !== 'undefined' ? `${window.location.origin}/live/${routeRoomId.value}` : '');
const recommendedRooms = computed(() => hubRooms.value.filter((room) => room.id !== routeRoomId.value).slice(0, routeRoomId.value ? 4 : 8));
const panelTitle = computed(() => {
    if (isViewerMode.value) {
        return displayedSession.value?.title ?? '直播观看区';
    }
    return activeRoom.value?.title ?? '直播预览区';
});
const panelSubtitle = computed(() => {
    if (isViewerMode.value) {
        return displayedSession.value?.status === 'LIVING'
            ? '当前页面会实时接收主播画面、房间状态和聊天消息。'
            : '当前直播间未开播或已经结束。';
    }
    if (activeRoom.value) {
        return '你的直播间已创建完成，房间状态、观众接入和聊天消息会实时同步。';
    }
    return '点击“我要直播”创建直播间，并开启摄像头或屏幕共享预览。';
});
const placeholderTitle = computed(() => {
    if (isViewerMode.value) {
        return displayedSession.value?.status === 'LIVING' ? '正在等待主播画面接入' : '当前直播未开播';
    }
    return '点击“我要直播”开始创建直播间';
});
const placeholderDescription = computed(() => {
    if (isViewerMode.value) {
        return displayedSession.value?.status === 'LIVING'
            ? '如果未自动接入，可以点击“进入观看”重新发起连接。'
            : '主播结束直播后，房间状态会在这里实时更新。';
    }
    return '完成摄像头或屏幕共享预览后，即可开始直播。';
});
function openStudio() {
    if (!isLoggedIn.value) {
        ElMessage.warning('请先登录用户账号，再开启直播');
        router.push('/login');
        return;
    }
    studioVisible.value = true;
}
function createPeerConnection() {
    return new RTCPeerConnection(WEBRTC_CONFIG);
}
function formatTime(value) {
    if (!value) {
        return '暂无';
    }
    return new Date(value).toLocaleString('zh-CN');
}
function parseSse(event) {
    return JSON.parse(event.data);
}
function buildApiUrl(path, params) {
    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
    const url = new URL(`${apiBase}${path}`, window.location.origin);
    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}
function appendLiveMessage(message) {
    const next = [...liveMessages.value.filter((item) => item.id !== message.id), message];
    next.sort((left, right) => left.id - right.id);
    liveMessages.value = next.slice(-80);
}
function closeRoomEventSource() {
    roomEventSource?.close();
    roomEventSource = null;
}
function closePublisherEventSource() {
    publisherEventSource?.close();
    publisherEventSource = null;
}
function closeViewerEventSource() {
    viewerEventSource?.close();
    viewerEventSource = null;
}
function clearHubPolling() {
    if (hubPollTimer) {
        clearInterval(hubPollTimer);
        hubPollTimer = null;
    }
}
async function attachPreviewStream() {
    await nextTick();
    if (!previewRef.value) {
        return;
    }
    previewRef.value.srcObject = previewStream.value;
    if (previewStream.value) {
        await previewRef.value.play().catch(() => undefined);
    }
}
async function attachViewerStream() {
    await nextTick();
    if (!viewerRef.value) {
        return;
    }
    viewerRef.value.srcObject = remoteStream.value;
    if (remoteStream.value) {
        await viewerRef.value.play().catch(() => undefined);
    }
}
function stopPreviewStream() {
    previewStream.value?.getTracks().forEach((track) => track.stop());
    previewStream.value = null;
    if (previewRef.value) {
        previewRef.value.srcObject = null;
    }
}
function clearRemoteStream() {
    remoteStream.value?.getTracks().forEach((track) => track.stop());
    remoteStream.value = null;
    if (viewerRef.value) {
        viewerRef.value.srcObject = null;
    }
}
function cleanupPublisherPeers() {
    closePublisherEventSource();
    publisherPeers.forEach((peer) => peer.close());
    publisherPeers.clear();
}
function cleanupViewerPeer(notifyServer = true) {
    const roomId = viewerRoomId.value;
    const currentViewerId = viewerId.value;
    closeViewerEventSource();
    viewerPeer.value?.close();
    viewerPeer.value = null;
    viewerRoomId.value = null;
    viewerId.value = null;
    clearRemoteStream();
    if (notifyServer && roomId && currentViewerId) {
        void leaveLiveViewer(roomId, currentViewerId).catch(() => undefined);
    }
}
async function waitForIceGatheringComplete(peer) {
    if (peer.iceGatheringState === 'complete') {
        return;
    }
    await new Promise((resolve) => {
        const timeout = window.setTimeout(() => {
            peer.removeEventListener('icegatheringstatechange', handleChange);
            resolve();
        }, 5000);
        function handleChange() {
            if (peer.iceGatheringState === 'complete') {
                window.clearTimeout(timeout);
                peer.removeEventListener('icegatheringstatechange', handleChange);
                resolve();
            }
        }
        peer.addEventListener('icegatheringstatechange', handleChange);
    });
}
async function requestStream(mode) {
    if (!navigator.mediaDevices) {
        throw new Error('当前浏览器不支持媒体采集');
    }
    if (mode === 'camera') {
        return navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
    }
    const devices = navigator.mediaDevices;
    if (!devices.getDisplayMedia) {
        throw new Error('当前浏览器不支持屏幕共享');
    }
    return devices.getDisplayMedia({
        video: true,
        audio: true,
    });
}
function applySessionUpdate(session) {
    if (activeRoom.value?.id === session.roomId) {
        liveSession.value = {
            ...liveSession.value,
            ...session,
            title: activeRoom.value.title,
            broadcaster: activeRoom.value.broadcaster,
        };
    }
    else {
        fetchedSession.value = session;
    }
    if (session.status !== 'LIVING' && viewerRoomId.value === session.roomId) {
        cleanupViewerPeer(false);
    }
}
function openRoomEventSourceFor(roomId) {
    closeRoomEventSource();
    roomEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/events`));
    roomEventSource.addEventListener('snapshot', (event) => {
        const payload = parseSse(event);
        applySessionUpdate(payload.session);
        liveMessages.value = payload.messages.slice(-80);
    });
    roomEventSource.addEventListener('session', (event) => {
        applySessionUpdate(parseSse(event));
    });
    roomEventSource.addEventListener('chat-message', (event) => {
        appendLiveMessage(parseSse(event));
    });
    roomEventSource.addEventListener('system-message', (event) => {
        appendLiveMessage(parseSse(event));
    });
}
function handleViewerSignal(peer, payload) {
    if (!payload.answer || viewerPeer.value !== peer || peer.currentRemoteDescription) {
        return;
    }
    void peer.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch(() => undefined);
}
function openViewerEventSourceFor(roomId, currentViewerId, peer) {
    closeViewerEventSource();
    viewerEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/viewers/${currentViewerId}/events`));
    viewerEventSource.addEventListener('snapshot', (event) => {
        handleViewerSignal(peer, parseSse(event));
    });
    viewerEventSource.addEventListener('viewer-answer', (event) => {
        handleViewerSignal(peer, parseSse(event));
    });
    viewerEventSource.addEventListener('room-ended', () => {
        cleanupViewerPeer(false);
    });
}
function openPublisherEventSourceFor(roomId) {
    closePublisherEventSource();
    if (!token.value) {
        return;
    }
    publisherEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/publisher/events`, {
        token: token.value,
    }));
    publisherEventSource.addEventListener('snapshot', (event) => {
        const payload = parseSse(event);
        payload.pendingViewers.forEach((viewer) => {
            void answerViewer(roomId, viewer);
        });
    });
    publisherEventSource.addEventListener('viewer-offer', (event) => {
        const payload = parseSse(event);
        void answerViewer(roomId, payload);
    });
}
async function handlePreparePreview() {
    if (!isLoggedIn.value) {
        ElMessage.warning('请先登录用户账号');
        return;
    }
    preparing.value = true;
    try {
        stopPreviewStream();
        const stream = await requestStream(studioForm.mode);
        stream.getVideoTracks().forEach((track) => {
            track.addEventListener('ended', () => {
                if (studioForm.mode === 'screen' && isLive.value) {
                    void handleStopLive();
                }
            });
        });
        previewStream.value = stream;
        await attachPreviewStream();
        studioVisible.value = false;
        ElMessage.success(`${sourceModeLabel.value}预览已就绪`);
    }
    catch (error) {
        ElMessage.error(error instanceof Error ? error.message : '获取直播画面失败');
    }
    finally {
        preparing.value = false;
    }
}
async function answerViewer(roomId, viewer) {
    if (!previewStream.value || publisherPeers.has(viewer.viewerId)) {
        return;
    }
    const peer = createPeerConnection();
    publisherPeers.set(viewer.viewerId, peer);
    previewStream.value.getTracks().forEach((track) => {
        peer.addTrack(track, previewStream.value);
    });
    peer.addEventListener('connectionstatechange', () => {
        if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
            publisherPeers.delete(viewer.viewerId);
            peer.close();
        }
    });
    try {
        await peer.setRemoteDescription(new RTCSessionDescription(viewer.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await waitForIceGatheringComplete(peer);
        if (!peer.localDescription) {
            throw new Error('主播应答生成失败');
        }
        await submitLiveViewerAnswer(roomId, viewer.viewerId, {
            type: 'answer',
            sdp: peer.localDescription.sdp ?? '',
        });
    }
    catch (error) {
        publisherPeers.delete(viewer.viewerId);
        peer.close();
        throw error;
    }
}
async function handleStartLive() {
    if (!previewStream.value) {
        ElMessage.warning('请先准备预览画面');
        return;
    }
    starting.value = true;
    try {
        cleanupPublisherPeers();
        const room = await createLiveRoom({
            title: studioForm.title,
            categoryId: studioForm.categoryId,
            coverUrl: studioForm.coverUrl || undefined,
            sourceMode: studioForm.mode,
        });
        const session = await startLiveRoom(room.id);
        activeRoom.value = room;
        liveSession.value = {
            id: session.sessionId,
            roomId: room.id,
            title: room.title,
            status: session.status,
            playUrl: room.playUrl,
            coverUrl: room.coverUrl,
            sourceMode: room.sourceMode,
            broadcaster: room.broadcaster,
            viewerCount: 0,
            startedAt: new Date().toISOString(),
            endedAt: null,
        };
        fetchedSession.value = null;
        liveMessages.value = [];
        await router.replace(`/live/${room.id}`);
        openPublisherEventSourceFor(room.id);
        void loadHubRooms();
        ElMessage.success('直播已开始，观众可以通过分享地址进入观看');
    }
    catch {
        ElMessage.error('开启直播失败，请稍后重试');
    }
    finally {
        starting.value = false;
    }
}
async function handleStopLive() {
    stopping.value = true;
    try {
        if (activeRoom.value && isLive.value) {
            await stopLiveRoom(activeRoom.value.id);
        }
    }
    catch {
        ElMessage.warning('直播已本地结束，但远端停播状态同步失败');
    }
    finally {
        cleanupPublisherPeers();
        stopPreviewStream();
        if (liveSession.value) {
            liveSession.value = {
                ...liveSession.value,
                status: 'ENDED',
                endedAt: new Date().toISOString(),
            };
        }
        void loadHubRooms();
        stopping.value = false;
        ElMessage.success('直播已结束');
    }
}
async function ensureViewerConnection(roomId) {
    if (joining.value || (viewerPeer.value && viewerRoomId.value === roomId)) {
        return;
    }
    joining.value = true;
    cleanupViewerPeer();
    try {
        const ticket = await createLiveViewer(roomId);
        const peer = createPeerConnection();
        viewerPeer.value = peer;
        viewerRoomId.value = roomId;
        viewerId.value = ticket.viewerId;
        openViewerEventSourceFor(roomId, ticket.viewerId, peer);
        peer.addEventListener('track', (event) => {
            remoteStream.value = event.streams[0];
            void attachViewerStream();
        });
        peer.addEventListener('connectionstatechange', () => {
            if (['closed', 'failed', 'disconnected'].includes(peer.connectionState) && viewerPeer.value === peer) {
                cleanupViewerPeer();
            }
        });
        const offer = await peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await peer.setLocalDescription(offer);
        await waitForIceGatheringComplete(peer);
        if (!peer.localDescription) {
            throw new Error('观众 offer 生成失败');
        }
        await submitLiveViewerOffer(roomId, ticket.viewerId, {
            type: 'offer',
            sdp: peer.localDescription.sdp ?? '',
        });
    }
    catch {
        cleanupViewerPeer();
        ElMessage.error('加入直播失败');
    }
    finally {
        joining.value = false;
    }
}
async function handleJoinViewer() {
    if (!routeRoomId.value) {
        return;
    }
    await ensureViewerConnection(routeRoomId.value);
}
function handleLeaveViewer() {
    cleanupViewerPeer();
    ElMessage.success('已离开直播');
}
async function handleSendMessage() {
    if (!canSendMessage.value || !currentRoomId.value) {
        return;
    }
    const content = chatDraft.value.trim();
    if (!content) {
        ElMessage.warning('请输入聊天内容');
        return;
    }
    sendingMessage.value = true;
    try {
        await createLiveMessage(currentRoomId.value, {
            content,
        });
        chatDraft.value = '';
    }
    catch {
        ElMessage.error('发送消息失败，请确认已登录且直播中');
    }
    finally {
        sendingMessage.value = false;
    }
}
async function syncRouteSession() {
    const roomId = routeRoomId.value;
    if (!roomId) {
        fetchedSession.value = null;
        liveMessages.value = [];
        closeRoomEventSource();
        cleanupViewerPeer();
        return;
    }
    try {
        const session = await fetchLiveSession(roomId);
        applySessionUpdate(session);
        if (session.broadcaster?.id === userId.value) {
            activeRoom.value = await fetchLiveRoom(roomId);
            if (session.status === 'LIVING' && previewStream.value) {
                openPublisherEventSourceFor(roomId);
            }
        }
        liveMessages.value = await fetchLiveMessages(roomId);
        openRoomEventSourceFor(roomId);
        if (session.status === 'LIVING' && activeRoom.value?.id !== roomId) {
            await ensureViewerConnection(roomId);
        }
        if (session.status !== 'LIVING' && activeRoom.value?.id !== roomId) {
            cleanupViewerPeer(false);
        }
    }
    catch {
        fetchedSession.value = null;
        liveMessages.value = [];
        closeRoomEventSource();
        cleanupViewerPeer(false);
    }
}
async function loadHubRooms() {
    try {
        hubRooms.value = await fetchLiveRooms({
            limit: 12,
        });
    }
    catch {
        hubRooms.value = [];
    }
}
function startHubPolling() {
    clearHubPolling();
    hubPollTimer = setInterval(() => {
        void loadHubRooms();
    }, 5000);
}
watch(previewRef, () => {
    void attachPreviewStream();
});
watch(viewerRef, () => {
    void attachViewerStream();
});
watch(() => route.params.id, () => {
    if (activeRoom.value && routeRoomId.value !== activeRoom.value.id) {
        closePublisherEventSource();
    }
    void syncRouteSession();
    void loadHubRooms();
});
watch(() => [isCurrentHostRoom.value, isLive.value, Boolean(previewStream.value)], ([hostRoom, living, hasStream]) => {
    if (hostRoom && living && hasStream && routeRoomId.value) {
        openPublisherEventSourceFor(routeRoomId.value);
        return;
    }
    closePublisherEventSource();
});
onMounted(() => {
    void syncRouteSession();
    void loadHubRooms();
    startHubPolling();
});
onUnmounted(() => {
    closeRoomEventSource();
    closePublisherEventSource();
    clearHubPolling();
    cleanupPublisherPeers();
    cleanupViewerPeer();
    stopPreviewStream();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['hub-head']} */ ;
/** @type {__VLS_StyleScopedClasses['player-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-block']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-head']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['hub-head']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['layout']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-compose']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-actions" },
});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.openStudio)
};
__VLS_3.slots.default;
var __VLS_3;
if (__VLS_ctx.isCurrentHostRoom || __VLS_ctx.routeRoomId === null) {
    const __VLS_8 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        plain: true,
        size: "large",
        disabled: (!__VLS_ctx.hasPreview),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        plain: true,
        size: "large",
        disabled: (!__VLS_ctx.hasPreview),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (__VLS_ctx.handlePreparePreview)
    };
    __VLS_11.slots.default;
    var __VLS_11;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "player-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.panelTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.panelSubtitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "status-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "pill" },
});
(__VLS_ctx.sourceModeLabel);
if (__VLS_ctx.isLive) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill pill-live" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill pill-idle" },
    });
}
if (__VLS_ctx.isViewerMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pill pill-viewer" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "player-shell" },
});
if (__VLS_ctx.isViewerMode && __VLS_ctx.hasRemotePlayback) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
        ref: "viewerRef",
        ...{ class: "player-video" },
        autoplay: true,
        playsinline: true,
        controls: true,
    });
    /** @type {typeof __VLS_ctx.viewerRef} */ ;
}
else if (__VLS_ctx.hasPreview) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
        ref: "previewRef",
        ...{ class: "player-video" },
        autoplay: true,
        muted: true,
        playsinline: true,
    });
    /** @type {typeof __VLS_ctx.previewRef} */ ;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "player-placeholder" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.placeholderTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.placeholderDescription);
}
if (!__VLS_ctx.isViewerMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "control-bar" },
    });
    const __VLS_16 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.preparing),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.preparing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.handlePreparePreview)
    };
    __VLS_19.slots.default;
    var __VLS_19;
    const __VLS_24 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.starting),
        disabled: (!__VLS_ctx.hasPreview || __VLS_ctx.isLive),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.starting),
        disabled: (!__VLS_ctx.hasPreview || __VLS_ctx.isLive),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.handleStartLive)
    };
    __VLS_27.slots.default;
    var __VLS_27;
    const __VLS_32 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        type: "danger",
        plain: true,
        loading: (__VLS_ctx.stopping),
        disabled: (!__VLS_ctx.hasPreview && !__VLS_ctx.isLive),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        type: "danger",
        plain: true,
        loading: (__VLS_ctx.stopping),
        disabled: (!__VLS_ctx.hasPreview && !__VLS_ctx.isLive),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.handleStopLive)
    };
    __VLS_35.slots.default;
    var __VLS_35;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "control-bar" },
    });
    const __VLS_40 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.joining),
        disabled: (!__VLS_ctx.canJoinAsViewer),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.joining),
        disabled: (!__VLS_ctx.canJoinAsViewer),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.handleJoinViewer)
    };
    __VLS_43.slots.default;
    (__VLS_ctx.hasRemotePlayback ? '重新连接' : '进入观看');
    var __VLS_43;
    const __VLS_48 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        plain: true,
        disabled: (!__VLS_ctx.hasRemotePlayback),
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        plain: true,
        disabled: (!__VLS_ctx.hasRemotePlayback),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (__VLS_ctx.handleLeaveViewer)
    };
    __VLS_51.slots.default;
    var __VLS_51;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "panel side-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (!__VLS_ctx.activeRoom && !__VLS_ctx.displayedSession) {
    const __VLS_56 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        description: "还没有创建或进入直播间",
    }));
    const __VLS_58 = __VLS_57({
        description: "还没有创建或进入直播间",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.activeRoom?.title ?? __VLS_ctx.displayedSession?.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.activeRoom?.id ?? __VLS_ctx.displayedSession?.roomId ?? __VLS_ctx.routeRoomId ?? '-');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.activeRoom?.broadcaster?.nickname ?? __VLS_ctx.displayedSession?.broadcaster?.nickname ?? __VLS_ctx.nickname);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.displayedSession?.viewerCount ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.sourceModeLabel);
    if (__VLS_ctx.activeRoom) {
        const __VLS_60 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            modelValue: (__VLS_ctx.shareLink),
            readonly: true,
        }));
        const __VLS_62 = __VLS_61({
            modelValue: (__VLS_ctx.shareLink),
            readonly: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        {
            const { prepend: __VLS_thisSlot } = __VLS_63.slots;
        }
        var __VLS_63;
    }
    if (__VLS_ctx.activeRoom) {
        const __VLS_64 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            modelValue: (__VLS_ctx.activeRoom.rtmpUrl),
            readonly: true,
        }));
        const __VLS_66 = __VLS_65({
            modelValue: (__VLS_ctx.activeRoom.rtmpUrl),
            readonly: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_67.slots.default;
        {
            const { prepend: __VLS_thisSlot } = __VLS_67.slots;
        }
        var __VLS_67;
    }
    if (__VLS_ctx.activeRoom) {
        const __VLS_68 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            modelValue: (__VLS_ctx.activeRoom.streamKey),
            readonly: true,
        }));
        const __VLS_70 = __VLS_69({
            modelValue: (__VLS_ctx.activeRoom.streamKey),
            readonly: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        {
            const { prepend: __VLS_thisSlot } = __VLS_71.slots;
        }
        var __VLS_71;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.nickname);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.isLoggedIn ? '已登录' : '未登录');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.displayedSession?.status ?? 'IDLE');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "meta-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.isViewerMode ? '观众观看' : '主播控制台');
if (__VLS_ctx.displayedSession?.startedAt) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatTime(__VLS_ctx.displayedSession.startedAt));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-block chat-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.liveMessages.length);
if (__VLS_ctx.currentRoomId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.liveMessages))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "chat-item" },
            ...{ class: (item.kind === 'SYSTEM' ? 'chat-item-system' : '') },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.sender.nickname);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatTime(item.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.content);
    }
    if (__VLS_ctx.liveMessages.length === 0) {
        const __VLS_72 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            description: "直播开始后可在这里互动",
        }));
        const __VLS_74 = __VLS_73({
            description: "直播开始后可在这里互动",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    }
}
else {
    const __VLS_76 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        description: "进入直播间后可查看聊天消息",
    }));
    const __VLS_78 = __VLS_77({
        description: "进入直播间后可查看聊天消息",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-compose" },
});
const __VLS_80 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.chatDraft),
    disabled: (!__VLS_ctx.canSendMessage),
    maxlength: "200",
    placeholder: "输入聊天内容，按回车发送",
}));
const __VLS_82 = __VLS_81({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.chatDraft),
    disabled: (!__VLS_ctx.canSendMessage),
    maxlength: "200",
    placeholder: "输入聊天内容，按回车发送",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
let __VLS_84;
let __VLS_85;
let __VLS_86;
const __VLS_87 = {
    onKeyup: (__VLS_ctx.handleSendMessage)
};
var __VLS_83;
const __VLS_88 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.sendingMessage),
    disabled: (!__VLS_ctx.canSendMessage),
}));
const __VLS_90 = __VLS_89({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.sendingMessage),
    disabled: (!__VLS_ctx.canSendMessage),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
let __VLS_92;
let __VLS_93;
let __VLS_94;
const __VLS_95 = {
    onClick: (__VLS_ctx.handleSendMessage)
};
__VLS_91.slots.default;
var __VLS_91;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
    ...{ class: "feature-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel hub-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hub-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.routeRoomId ? '更多直播间' : '直播广场');
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.routeRoomId ? '继续浏览其他正在直播或刚结束的房间。' : '这里汇总了平台内正在直播和最近结束的房间。');
if (__VLS_ctx.recommendedRooms.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "room-grid" },
    });
    for (const [room] of __VLS_getVForSourceType((__VLS_ctx.recommendedRooms))) {
        /** @type {[typeof LiveRoomCard, ]} */ ;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent(LiveRoomCard, new LiveRoomCard({
            key: (room.id),
            item: (room),
        }));
        const __VLS_97 = __VLS_96({
            key: (room.id),
            item: (room),
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
    }
}
else {
    const __VLS_99 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        description: "当前还没有可展示的直播房间",
    }));
    const __VLS_101 = __VLS_100({
        description: "当前还没有可展示的直播房间",
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
}
const __VLS_103 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
    modelValue: (__VLS_ctx.studioVisible),
    title: "创建直播间",
    width: "560px",
}));
const __VLS_105 = __VLS_104({
    modelValue: (__VLS_ctx.studioVisible),
    title: "创建直播间",
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
__VLS_106.slots.default;
if (!__VLS_ctx.isLoggedIn) {
    const __VLS_107 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
        title: "请先登录用户账号，再发起直播。",
        type: "warning",
        closable: (false),
        showIcon: true,
    }));
    const __VLS_109 = __VLS_108({
        title: "请先登录用户账号，再发起直播。",
        type: "warning",
        closable: (false),
        showIcon: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
}
const __VLS_111 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    model: (__VLS_ctx.studioForm),
    labelPosition: "top",
}));
const __VLS_113 = __VLS_112({
    model: (__VLS_ctx.studioForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
__VLS_114.slots.default;
const __VLS_115 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
    label: "直播标题",
}));
const __VLS_117 = __VLS_116({
    label: "直播标题",
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
__VLS_118.slots.default;
const __VLS_119 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
    modelValue: (__VLS_ctx.studioForm.title),
    maxlength: "50",
    showWordLimit: true,
}));
const __VLS_121 = __VLS_120({
    modelValue: (__VLS_ctx.studioForm.title),
    maxlength: "50",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
var __VLS_118;
const __VLS_123 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
    label: "分类 ID",
}));
const __VLS_125 = __VLS_124({
    label: "分类 ID",
}, ...__VLS_functionalComponentArgsRest(__VLS_124));
__VLS_126.slots.default;
const __VLS_127 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
    modelValue: (__VLS_ctx.studioForm.categoryId),
    min: (1),
    max: (10),
}));
const __VLS_129 = __VLS_128({
    modelValue: (__VLS_ctx.studioForm.categoryId),
    min: (1),
    max: (10),
}, ...__VLS_functionalComponentArgsRest(__VLS_128));
var __VLS_126;
const __VLS_131 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    label: "封面地址（可选）",
}));
const __VLS_133 = __VLS_132({
    label: "封面地址（可选）",
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
__VLS_134.slots.default;
const __VLS_135 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
    modelValue: (__VLS_ctx.studioForm.coverUrl),
    placeholder: "可以留空，后续再补封面",
}));
const __VLS_137 = __VLS_136({
    modelValue: (__VLS_ctx.studioForm.coverUrl),
    placeholder: "可以留空，后续再补封面",
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
var __VLS_134;
const __VLS_139 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    label: "直播方式",
}));
const __VLS_141 = __VLS_140({
    label: "直播方式",
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
__VLS_142.slots.default;
const __VLS_143 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    modelValue: (__VLS_ctx.studioForm.mode),
}));
const __VLS_145 = __VLS_144({
    modelValue: (__VLS_ctx.studioForm.mode),
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
__VLS_146.slots.default;
const __VLS_147 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
    value: "camera",
}));
const __VLS_149 = __VLS_148({
    value: "camera",
}, ...__VLS_functionalComponentArgsRest(__VLS_148));
__VLS_150.slots.default;
var __VLS_150;
const __VLS_151 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
    value: "screen",
}));
const __VLS_153 = __VLS_152({
    value: "screen",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
__VLS_154.slots.default;
var __VLS_154;
var __VLS_146;
var __VLS_142;
var __VLS_114;
{
    const { footer: __VLS_thisSlot } = __VLS_106.slots;
    const __VLS_155 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
        ...{ 'onClick': {} },
    }));
    const __VLS_157 = __VLS_156({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_156));
    let __VLS_159;
    let __VLS_160;
    let __VLS_161;
    const __VLS_162 = {
        onClick: (...[$event]) => {
            __VLS_ctx.studioVisible = false;
        }
    };
    __VLS_158.slots.default;
    var __VLS_158;
    const __VLS_163 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.preparing),
        disabled: (!__VLS_ctx.isLoggedIn),
    }));
    const __VLS_165 = __VLS_164({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.preparing),
        disabled: (!__VLS_ctx.isLoggedIn),
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    let __VLS_167;
    let __VLS_168;
    let __VLS_169;
    const __VLS_170 = {
        onClick: (__VLS_ctx.handlePreparePreview)
    };
    __VLS_166.slots.default;
    var __VLS_166;
}
var __VLS_106;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['layout']} */ ;
/** @type {__VLS_StyleScopedClasses['player-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['status-group']} */ ;
/** @type {__VLS_StyleScopedClasses['pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-live']} */ ;
/** @type {__VLS_StyleScopedClasses['pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-idle']} */ ;
/** @type {__VLS_StyleScopedClasses['pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-viewer']} */ ;
/** @type {__VLS_StyleScopedClasses['player-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['player-video']} */ ;
/** @type {__VLS_StyleScopedClasses['player-video']} */ ;
/** @type {__VLS_StyleScopedClasses['player-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['control-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['control-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-block']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-block']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-block']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-block']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-head']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-list']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-compose']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-block']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-list']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hub-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['room-grid']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LiveRoomCard: LiveRoomCard,
            isLoggedIn: isLoggedIn,
            nickname: nickname,
            studioVisible: studioVisible,
            preparing: preparing,
            starting: starting,
            joining: joining,
            stopping: stopping,
            sendingMessage: sendingMessage,
            previewRef: previewRef,
            viewerRef: viewerRef,
            activeRoom: activeRoom,
            liveMessages: liveMessages,
            chatDraft: chatDraft,
            studioForm: studioForm,
            routeRoomId: routeRoomId,
            displayedSession: displayedSession,
            currentRoomId: currentRoomId,
            isCurrentHostRoom: isCurrentHostRoom,
            isViewerMode: isViewerMode,
            hasPreview: hasPreview,
            hasRemotePlayback: hasRemotePlayback,
            isLive: isLive,
            canJoinAsViewer: canJoinAsViewer,
            canSendMessage: canSendMessage,
            sourceModeLabel: sourceModeLabel,
            shareLink: shareLink,
            recommendedRooms: recommendedRooms,
            panelTitle: panelTitle,
            panelSubtitle: panelSubtitle,
            placeholderTitle: placeholderTitle,
            placeholderDescription: placeholderDescription,
            openStudio: openStudio,
            formatTime: formatTime,
            handlePreparePreview: handlePreparePreview,
            handleStartLive: handleStartLive,
            handleStopLive: handleStopLive,
            handleJoinViewer: handleJoinViewer,
            handleLeaveViewer: handleLeaveViewer,
            handleSendMessage: handleSendMessage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
