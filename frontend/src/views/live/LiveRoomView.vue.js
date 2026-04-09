/// <reference types="../../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { createLiveMessage, createLiveRoom, createLiveViewer, fetchLiveViewerAnswer, fetchLiveMessages, fetchPendingLiveViewers, fetchLiveRoom, fetchLiveRooms, fetchLiveSession, leaveLiveViewer, saveLiveReplay, startLiveRoom, stopLiveRoom, submitLiveViewerAnswer, submitLiveViewerOffer, uploadVideo, } from '@/api/platform';
import LiveRoomCard from '@/components/live/LiveRoomCard.vue';
import { useAppStore } from '@/stores/app';
const WEBRTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isLoggedIn, nickname, token, userId } = storeToRefs(appStore);
const studioVisible = ref(false), saveReplayVisible = ref(false), preparing = ref(false), starting = ref(false), joining = ref(false), stopping = ref(false), sendingMessage = ref(false), savingReplay = ref(false), uploadingStudioCover = ref(false), uploadingReplayCover = ref(false);
const previewRef = ref(null), viewerRef = ref(null), studioCoverInputRef = ref(null), replayCoverInputRef = ref(null);
const previewStream = ref(null), remoteStream = ref(null), mediaRecorder = ref(null), recordedBlob = ref(null), recordingPreviewUrl = ref('');
const activeRoom = ref(null), liveSession = ref(null), fetchedSession = ref(null), hubRooms = ref([]), liveMessages = ref([]), activeDanmaku = ref([]), chatDraft = ref('');
const viewerPeer = ref(null), viewerRoomId = ref(null), viewerId = ref(null);
const publisherPeers = new Map(), displayedDanmakuIds = new Set(), danmakuTimers = new Map();
let nextDanmakuUid = 1, nextDanmakuTrack = 0, danmakuRoomId = null, hubPollTimer = null, publisherPollTimer = null, viewerAnswerPollTimer = null, roomEventSource = null, publisherEventSource = null, viewerEventSource = null, recordedChunks = [];
const studioForm = reactive({ title: '一起聊聊今天的内容', coverUrl: '', mode: 'camera' });
const replayForm = reactive({ title: '', description: '', coverUrl: '' });
const routeRoomId = computed(() => { const id = Number(route.params.id); return Number.isFinite(id) && id > 0 ? id : null; });
const displayedSession = computed(() => liveSession.value ?? fetchedSession.value);
const currentRoomId = computed(() => routeRoomId.value ?? activeRoom.value?.id ?? null);
const isCurrentHostRoom = computed(() => Boolean(activeRoom.value && routeRoomId.value === activeRoom.value.id));
const isViewerMode = computed(() => Boolean(routeRoomId.value && !isCurrentHostRoom.value));
const hasPreview = computed(() => Boolean(previewStream.value));
const hasRemotePlayback = computed(() => Boolean(remoteStream.value));
const displayedReplayUrl = computed(() => recordingPreviewUrl.value || activeRoom.value?.replayUrl || displayedSession.value?.replayUrl || '');
const hasReplayPlayback = computed(() => Boolean(displayedReplayUrl.value));
const isLive = computed(() => displayedSession.value?.status === 'LIVING');
const canJoinAsViewer = computed(() => isViewerMode.value && displayedSession.value?.status === 'LIVING');
const canSendMessage = computed(() => Boolean(routeRoomId.value && isLoggedIn.value && displayedSession.value?.status === 'LIVING'));
const canOpenReplaySaver = computed(() => Boolean(activeRoom.value && recordedBlob.value && displayedSession.value?.status !== 'LIVING'));
const activeSourceMode = computed(() => activeRoom.value?.sourceMode ?? displayedSession.value?.sourceMode ?? studioForm.mode);
const sourceModeLabel = computed(() => (activeSourceMode.value === 'screen' ? '屏幕共享直播' : '摄像头直播'));
const shareLink = computed(() => currentRoomId.value && typeof window !== 'undefined' ? `${window.location.origin}/live/${currentRoomId.value}` : '');
const plazaRooms = computed(() => hubRooms.value.filter((room) => room.id !== routeRoomId.value));
const broadcasterName = computed(() => activeRoom.value?.broadcaster?.nickname ?? displayedSession.value?.broadcaster?.nickname ?? nickname.value);
const roomTitle = computed(() => displayedSession.value?.title ?? activeRoom.value?.title ?? '直播间');
const roomSubtitle = computed(() => isViewerMode.value ? (isLive.value ? '正在接收主播画面与实时弹幕。' : '当前直播未开始或已经结束。') : (isLive.value ? '你的直播正在推流，广场里的用户已经可以进入观看。' : '这是你的开播控制台。'));
const statusText = computed(() => displayedSession.value?.status === 'LIVING' ? '直播中' : displayedSession.value?.status === 'ENDED' ? '已结束' : '待开播');
const placeholderTitle = computed(() => isViewerMode.value ? (displayedSession.value?.status === 'LIVING' ? '正在等待主播画面接入' : '当前直播未开播') : '请先准备直播预览');
const placeholderDescription = computed(() => isViewerMode.value ? (displayedSession.value?.status === 'LIVING' ? '如果未自动接入，可以点击“进入观看”重新连接。' : '主播结束后，你仍然可以在右侧查看弹幕记录。') : '完成摄像头或屏幕共享预览后，即可开始直播。');
const showQuickSaveActions = computed(() => Boolean(isCurrentHostRoom.value && recordedBlob.value && displayedSession.value?.status === 'ENDED'));
const openStudio = () => { if (!isLoggedIn.value) {
    ElMessage.warning('请先登录用户账号');
    router.push('/login');
    return;
} studioVisible.value = true; };
const goToMyRoom = () => { if (activeRoom.value)
    void router.push(`/live/${activeRoom.value.id}`); };
const createPeerConnection = () => new RTCPeerConnection(WEBRTC_CONFIG);
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN') : '暂无';
const parseSse = (event) => JSON.parse(event.data);
function buildApiUrl(path, params) { const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, ''); const url = new URL(`${apiBase}${path}`, window.location.origin); Object.entries(params ?? {}).forEach(([key, value]) => { if (value !== undefined && value !== '')
    url.searchParams.set(key, String(value)); }); return url.toString(); }
function resetDanmaku(roomId) { danmakuRoomId = roomId; activeDanmaku.value = []; displayedDanmakuIds.clear(); nextDanmakuTrack = 0; danmakuTimers.forEach((timer) => window.clearTimeout(timer)); danmakuTimers.clear(); }
function pushDanmaku(message) { if (!routeRoomId.value || danmakuRoomId !== routeRoomId.value || message.kind !== 'CHAT' || displayedDanmakuIds.has(message.id))
    return; displayedDanmakuIds.add(message.id); const track = nextDanmakuTrack % 6; nextDanmakuTrack += 1; const item = { uid: nextDanmakuUid++, top: 18 + track * 42, duration: 9000 + track * 350, sender: message.sender.nickname, content: message.content }; activeDanmaku.value = [...activeDanmaku.value, item].slice(-18); const timer = window.setTimeout(() => { activeDanmaku.value = activeDanmaku.value.filter((entry) => entry.uid !== item.uid); danmakuTimers.delete(item.uid); }, item.duration); danmakuTimers.set(item.uid, timer); }
const seedDanmaku = (messages) => messages.filter((item) => item.kind === 'CHAT').slice(-4).forEach((item) => pushDanmaku(item));
function appendLiveMessage(message) { const next = [...liveMessages.value.filter((item) => item.id !== message.id), message]; next.sort((left, right) => left.id - right.id); liveMessages.value = next.slice(-80); pushDanmaku(message); }
const closeRoomEventSource = () => { roomEventSource?.close(); roomEventSource = null; };
const closePublisherEventSource = () => { publisherEventSource?.close(); publisherEventSource = null; };
const closeViewerEventSource = () => { viewerEventSource?.close(); viewerEventSource = null; };
const clearHubPolling = () => { if (hubPollTimer) {
    clearInterval(hubPollTimer);
    hubPollTimer = null;
} };
const stopPublisherPolling = () => { if (publisherPollTimer) {
    clearInterval(publisherPollTimer);
    publisherPollTimer = null;
} };
const stopViewerAnswerPolling = () => { if (viewerAnswerPollTimer) {
    clearInterval(viewerAnswerPollTimer);
    viewerAnswerPollTimer = null;
} };
async function attachPreviewStream() { await nextTick(); if (!previewRef.value)
    return; previewRef.value.srcObject = previewStream.value; if (previewStream.value)
    await previewRef.value.play().catch(() => undefined); }
async function attachViewerStream() { await nextTick(); if (!viewerRef.value)
    return; viewerRef.value.srcObject = remoteStream.value; if (remoteStream.value)
    await viewerRef.value.play().catch(() => undefined); }
function stopPreviewStream() { previewStream.value?.getTracks().forEach((track) => track.stop()); previewStream.value = null; if (previewRef.value)
    previewRef.value.srcObject = null; }
function clearRemoteStream() { remoteStream.value?.getTracks().forEach((track) => track.stop()); remoteStream.value = null; if (viewerRef.value)
    viewerRef.value.srcObject = null; }
function clearRecordingPreviewUrl() { if (recordingPreviewUrl.value) {
    URL.revokeObjectURL(recordingPreviewUrl.value);
    recordingPreviewUrl.value = '';
} }
function resetRecordedContent() { clearRecordingPreviewUrl(); recordedBlob.value = null; recordedChunks = []; }
function cleanupPublisherPeers() { closePublisherEventSource(); stopPublisherPolling(); publisherPeers.forEach((peer) => peer.close()); publisherPeers.clear(); }
function cleanupViewerPeer(notifyServer = true) { const roomId = viewerRoomId.value; const currentViewerId = viewerId.value; closeViewerEventSource(); stopViewerAnswerPolling(); viewerPeer.value?.close(); viewerPeer.value = null; viewerRoomId.value = null; viewerId.value = null; clearRemoteStream(); if (notifyServer && roomId && currentViewerId)
    void leaveLiveViewer(roomId, currentViewerId).catch(() => undefined); }
async function waitForIceGatheringComplete(peer) { if (peer.iceGatheringState === 'complete')
    return; await new Promise((resolve) => { const timeout = window.setTimeout(() => { peer.removeEventListener('icegatheringstatechange', handleChange); resolve(); }, 5000); function handleChange() { if (peer.iceGatheringState === 'complete') {
    window.clearTimeout(timeout);
    peer.removeEventListener('icegatheringstatechange', handleChange);
    resolve();
} } peer.addEventListener('icegatheringstatechange', handleChange); }); }
const getRecordingMimeType = () => typeof MediaRecorder === 'undefined' ? '' : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((item) => MediaRecorder.isTypeSupported(item)) ?? '';
function startLocalRecording() { if (!previewStream.value || typeof MediaRecorder === 'undefined')
    return; recordedChunks = []; const mimeType = getRecordingMimeType(); const recorder = mimeType ? new MediaRecorder(previewStream.value, { mimeType }) : new MediaRecorder(previewStream.value); recorder.addEventListener('dataavailable', (event) => { if (event.data && event.data.size > 0)
    recordedChunks.push(event.data); }); recorder.addEventListener('stop', () => { if (recordedChunks.length === 0)
    return; clearRecordingPreviewUrl(); recordedBlob.value = new Blob(recordedChunks, { type: recorder.mimeType || 'video/webm' }); recordingPreviewUrl.value = URL.createObjectURL(recordedBlob.value); }); mediaRecorder.value = recorder; recorder.start(1000); }
async function stopLocalRecording() { const recorder = mediaRecorder.value; if (!recorder || recorder.state === 'inactive') {
    mediaRecorder.value = null;
    return;
} await new Promise((resolve) => { const finalize = () => { recorder.removeEventListener('stop', finalize); mediaRecorder.value = null; resolve(); }; recorder.addEventListener('stop', finalize); recorder.stop(); }); }
async function requestStream(mode) { if (!navigator.mediaDevices)
    throw new Error('当前浏览器不支持媒体采集'); if (mode === 'camera')
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true }); const devices = navigator.mediaDevices; if (!devices.getDisplayMedia)
    throw new Error('当前浏览器不支持屏幕共享'); return devices.getDisplayMedia({ video: true, audio: true }); }
function applySessionUpdate(session) { if (activeRoom.value?.id === session.roomId) {
    liveSession.value = { ...liveSession.value, ...session, title: activeRoom.value.title, broadcaster: activeRoom.value.broadcaster };
}
else {
    fetchedSession.value = session;
} if (session.status !== 'LIVING' && viewerRoomId.value === session.roomId)
    cleanupViewerPeer(false); }
function openRoomEventSourceFor(roomId) { closeRoomEventSource(); roomEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/events`)); roomEventSource.addEventListener('snapshot', (event) => { const payload = parseSse(event); applySessionUpdate(payload.session); liveMessages.value = payload.messages.slice(-80); if (danmakuRoomId !== roomId)
    resetDanmaku(roomId); seedDanmaku(payload.messages); }); roomEventSource.addEventListener('session', (event) => applySessionUpdate(parseSse(event))); roomEventSource.addEventListener('chat-message', (event) => appendLiveMessage(parseSse(event))); roomEventSource.addEventListener('system-message', (event) => appendLiveMessage(parseSse(event))); }
function handleViewerSignal(peer, payload) { if (!payload.answer || viewerPeer.value !== peer || peer.currentRemoteDescription)
    return; void peer.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch(() => undefined); }
function openViewerEventSourceFor(roomId, currentViewerId, peer) { closeViewerEventSource(); viewerEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/viewers/${currentViewerId}/events`)); viewerEventSource.addEventListener('snapshot', (event) => handleViewerSignal(peer, parseSse(event))); viewerEventSource.addEventListener('viewer-answer', (event) => handleViewerSignal(peer, parseSse(event))); viewerEventSource.addEventListener('room-ended', () => cleanupViewerPeer(false)); }
function openPublisherEventSourceFor(roomId) { closePublisherEventSource(); if (!token.value)
    return; publisherEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/publisher/events`, { token: token.value })); publisherEventSource.addEventListener('snapshot', (event) => { const payload = parseSse(event); payload.pendingViewers.forEach((viewer) => { void answerViewer(roomId, viewer); }); }); publisherEventSource.addEventListener('viewer-offer', (event) => { const payload = parseSse(event); void answerViewer(roomId, payload); }); }
function startPublisherPolling(roomId) { stopPublisherPolling(); publisherPollTimer = setInterval(() => { void fetchPendingLiveViewers(roomId).then((items) => { items.forEach((viewer) => { void answerViewer(roomId, viewer); }); }).catch(() => undefined); }, 1200); }
function startViewerAnswerPolling(roomId, currentViewerId, peer) { stopViewerAnswerPolling(); viewerAnswerPollTimer = setInterval(() => { if (viewerPeer.value !== peer || peer.currentRemoteDescription) {
    stopViewerAnswerPolling();
    return;
} void fetchLiveViewerAnswer(roomId, currentViewerId).then((payload) => { if (payload.ready)
    handleViewerSignal(peer, { roomId, viewerId: currentViewerId, answer: payload.answer ?? null, updatedAt: payload.updatedAt }); }).catch(() => undefined); }, 1200); }
async function handlePreparePreview() { if (!isLoggedIn.value) {
    ElMessage.warning('请先登录用户账号');
    return;
} preparing.value = true; try {
    stopPreviewStream();
    const stream = await requestStream(studioForm.mode);
    stream.getVideoTracks().forEach((track) => track.addEventListener('ended', () => { if (studioForm.mode === 'screen' && isLive.value)
        void handleStopLive(); }));
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
} }
async function answerViewer(roomId, viewer) { if (!previewStream.value || publisherPeers.has(viewer.viewerId))
    return; const peer = createPeerConnection(); publisherPeers.set(viewer.viewerId, peer); previewStream.value.getTracks().forEach((track) => peer.addTrack(track, previewStream.value)); peer.addEventListener('connectionstatechange', () => { if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
    publisherPeers.delete(viewer.viewerId);
    peer.close();
} }); try {
    await peer.setRemoteDescription(new RTCSessionDescription(viewer.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await waitForIceGatheringComplete(peer);
    if (!peer.localDescription)
        throw new Error('主播应答生成失败');
    await submitLiveViewerAnswer(roomId, viewer.viewerId, { type: 'answer', sdp: peer.localDescription.sdp ?? '' });
}
catch (error) {
    publisherPeers.delete(viewer.viewerId);
    peer.close();
    throw error;
} }
async function handleStartLive() { if (!previewStream.value) {
    ElMessage.warning('请先准备预览画面');
    return;
} starting.value = true; try {
    cleanupPublisherPeers();
    resetRecordedContent();
    saveReplayVisible.value = false;
    const room = await createLiveRoom({ title: studioForm.title, coverUrl: studioForm.coverUrl || undefined, sourceMode: studioForm.mode });
    const session = await startLiveRoom(room.id);
    activeRoom.value = room;
    liveSession.value = { id: session.sessionId, roomId: room.id, title: room.title, status: session.status, playUrl: room.playUrl, coverUrl: room.coverUrl, sourceMode: room.sourceMode, broadcaster: room.broadcaster, viewerCount: 0, startedAt: new Date().toISOString(), endedAt: null };
    fetchedSession.value = null;
    liveMessages.value = [];
    resetDanmaku(room.id);
    await router.replace(`/live/${room.id}`);
    openPublisherEventSourceFor(room.id);
    startPublisherPolling(room.id);
    startLocalRecording();
    await loadHubRooms();
    ElMessage.success('直播已开始，其他用户现在可以在直播广场看到你');
}
catch {
    ElMessage.error('开启直播失败，请稍后重试');
}
finally {
    starting.value = false;
} }
async function handleStopLive() { stopping.value = true; try {
    if (activeRoom.value && isLive.value)
        await stopLiveRoom(activeRoom.value.id);
    await stopLocalRecording();
}
catch {
    ElMessage.warning('直播已结束，但远端状态同步失败');
}
finally {
    cleanupPublisherPeers();
    stopPreviewStream();
    if (liveSession.value)
        liveSession.value = { ...liveSession.value, status: 'ENDED', endedAt: new Date().toISOString() };
    void loadHubRooms();
    stopping.value = false;
    if (recordedBlob.value) {
        prepareReplayForm();
        saveReplayVisible.value = true;
    }
    ElMessage.success('直播已结束');
} }
async function ensureViewerConnection(roomId) { if (joining.value || (viewerPeer.value && viewerRoomId.value === roomId))
    return; joining.value = true; cleanupViewerPeer(); try {
    const ticket = await createLiveViewer(roomId);
    const peer = createPeerConnection();
    viewerPeer.value = peer;
    viewerRoomId.value = roomId;
    viewerId.value = ticket.viewerId;
    openViewerEventSourceFor(roomId, ticket.viewerId, peer);
    startViewerAnswerPolling(roomId, ticket.viewerId, peer);
    peer.addEventListener('track', (event) => { remoteStream.value = event.streams[0]; stopViewerAnswerPolling(); void attachViewerStream(); });
    peer.addEventListener('connectionstatechange', () => { if (['closed', 'failed', 'disconnected'].includes(peer.connectionState) && viewerPeer.value === peer)
        cleanupViewerPeer(); });
    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await peer.setLocalDescription(offer);
    await waitForIceGatheringComplete(peer);
    if (!peer.localDescription)
        throw new Error('观众 offer 生成失败');
    await submitLiveViewerOffer(roomId, ticket.viewerId, { type: 'offer', sdp: peer.localDescription.sdp ?? '' });
}
catch {
    cleanupViewerPeer();
    ElMessage.error('加入直播失败');
}
finally {
    joining.value = false;
} }
const handleJoinViewer = async () => { if (routeRoomId.value)
    await ensureViewerConnection(routeRoomId.value); };
const handleLeaveViewer = () => { cleanupViewerPeer(); ElMessage.success('已离开直播'); };
function prepareReplayForm() { replayForm.title = `${activeRoom.value?.title ?? '直播内容'} 回放`; replayForm.description = activeRoom.value ? `直播回放：${activeRoom.value.title}` : '直播回放'; replayForm.coverUrl = activeRoom.value?.coverUrl ?? studioForm.coverUrl ?? ''; }
const openReplaySaver = () => { if (canOpenReplaySaver.value) {
    prepareReplayForm();
    saveReplayVisible.value = true;
} };
function applyReplayResult(payload) { if (activeRoom.value)
    activeRoom.value = { ...activeRoom.value, replayUrl: payload.replayUrl, replayVideoId: payload.replayVideoId }; if (liveSession.value)
    liveSession.value = { ...liveSession.value, replayUrl: payload.replayUrl, replayVideoId: payload.replayVideoId }; if (fetchedSession.value)
    fetchedSession.value = { ...fetchedSession.value, replayUrl: payload.replayUrl, replayVideoId: payload.replayVideoId }; }
const sanitizeFileName = (value) => value.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'live-recording';
function downloadRecording() { if (!recordedBlob.value) {
    ElMessage.warning('当前没有可下载的录播文件');
    return;
} const url = URL.createObjectURL(recordedBlob.value); const link = document.createElement('a'); link.href = url; link.download = `${sanitizeFileName(activeRoom.value?.title ?? roomTitle.value)}-${Date.now()}.webm`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function handleSaveReplay() { if (!recordedBlob.value || !activeRoom.value)
    return; savingReplay.value = true; try {
    const safeTitle = replayForm.title.trim() || `${activeRoom.value.title} 回放`;
    const file = new File([recordedBlob.value], `live-recording-${Date.now()}.webm`, { type: recordedBlob.value.type || 'video/webm' });
    const uploaded = await uploadVideo(file, 'RECORDING');
    const replay = await saveLiveReplay(activeRoom.value.id, { saveMode: 'UPLOAD', assetId: uploaded.assetId, uploadToken: uploaded.uploadToken, title: safeTitle, description: replayForm.description, coverUrl: replayForm.coverUrl || activeRoom.value.coverUrl });
    applyReplayResult(replay);
    saveReplayVisible.value = false;
    ElMessage.success('录播已保存为稿件，可在创作中心继续编辑');
}
catch {
    ElMessage.error('保存稿件失败，请稍后重试');
}
finally {
    savingReplay.value = false;
} }
async function handleSendMessage() { if (!canSendMessage.value || !currentRoomId.value)
    return; const content = chatDraft.value.trim(); if (!content) {
    ElMessage.warning('请输入弹幕内容');
    return;
} sendingMessage.value = true; try {
    await createLiveMessage(currentRoomId.value, { content });
    chatDraft.value = '';
}
catch {
    ElMessage.error('发送弹幕失败，请确认已登录且直播中');
}
finally {
    sendingMessage.value = false;
} }
async function handleStudioCoverChange(event) { const input = event.target; const file = input.files?.[0]; input.value = ''; if (!file)
    return; uploadingStudioCover.value = true; try {
    const uploaded = await uploadVideo(file, 'COVER');
    studioForm.coverUrl = uploaded.url;
    ElMessage.success('直播封面上传成功');
}
catch {
    ElMessage.error('直播封面上传失败');
}
finally {
    uploadingStudioCover.value = false;
} }
async function handleReplayCoverChange(event) { const input = event.target; const file = input.files?.[0]; input.value = ''; if (!file)
    return; uploadingReplayCover.value = true; try {
    const uploaded = await uploadVideo(file, 'COVER');
    replayForm.coverUrl = uploaded.url;
    ElMessage.success('稿件封面上传成功');
}
catch {
    ElMessage.error('稿件封面上传失败');
}
finally {
    uploadingReplayCover.value = false;
} }
async function syncRouteSession() { const roomId = routeRoomId.value; if (!roomId) {
    fetchedSession.value = null;
    liveMessages.value = [];
    closeRoomEventSource();
    cleanupViewerPeer();
    resetDanmaku(null);
    return;
} try {
    const session = await fetchLiveSession(roomId);
    applySessionUpdate(session);
    if (session.broadcaster?.id === userId.value) {
        activeRoom.value = await fetchLiveRoom(roomId);
        if (session.status === 'LIVING' && previewStream.value) {
            openPublisherEventSourceFor(roomId);
            startPublisherPolling(roomId);
        }
    }
    const messages = await fetchLiveMessages(roomId);
    liveMessages.value = messages;
    resetDanmaku(roomId);
    seedDanmaku(messages);
    openRoomEventSourceFor(roomId);
    if (session.status === 'LIVING' && activeRoom.value?.id !== roomId)
        await ensureViewerConnection(roomId);
    if (session.status !== 'LIVING' && activeRoom.value?.id !== roomId)
        cleanupViewerPeer(false);
}
catch {
    fetchedSession.value = null;
    liveMessages.value = [];
    closeRoomEventSource();
    cleanupViewerPeer(false);
    resetDanmaku(null);
} }
async function loadHubRooms() { try {
    hubRooms.value = await fetchLiveRooms({ status: 'LIVING', limit: 18 });
}
catch {
    hubRooms.value = [];
} }
function startHubPolling() { clearHubPolling(); hubPollTimer = setInterval(() => { void loadHubRooms(); }, 5000); }
watch(previewRef, () => { void attachPreviewStream(); });
watch(viewerRef, () => { void attachViewerStream(); });
watch(() => route.params.id, () => { if (activeRoom.value && routeRoomId.value !== activeRoom.value.id)
    closePublisherEventSource(); void syncRouteSession(); void loadHubRooms(); });
watch(() => [isCurrentHostRoom.value, isLive.value, Boolean(previewStream.value)], ([hostRoom, living, hasStream]) => { if (hostRoom && living && hasStream && routeRoomId.value) {
    openPublisherEventSourceFor(routeRoomId.value);
    startPublisherPolling(routeRoomId.value);
    return;
} closePublisherEventSource(); stopPublisherPolling(); });
onMounted(() => { void syncRouteSession(); void loadHubRooms(); startHubPolling(); });
onUnmounted(() => { closeRoomEventSource(); closePublisherEventSource(); closeViewerEventSource(); clearHubPolling(); stopPublisherPolling(); stopViewerAnswerPolling(); cleanupPublisherPeers(); cleanupViewerPeer(); void stopLocalRecording(); stopPreviewStream(); clearRecordingPreviewUrl(); resetDanmaku(null); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-video-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['room-head']} */ ;
/** @type {__VLS_StyleScopedClasses['message-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['message-item']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['studio-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['room-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['home-studio-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['plaza-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['message-compose']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-row']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "live-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "hero-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "hero-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.plazaRooms.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "hero-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.isLoggedIn ? '已登录' : '游客');
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "hero-stat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.activeRoom ? '1' : '0');
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-actions" },
});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "danger",
    size: "large",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "danger",
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
if (__VLS_ctx.activeRoom) {
    const __VLS_8 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        plain: true,
        size: "large",
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        plain: true,
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (__VLS_ctx.goToMyRoom)
    };
    __VLS_11.slots.default;
    var __VLS_11;
}
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    plain: true,
    size: "large",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    plain: true,
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (__VLS_ctx.loadHubRooms)
};
__VLS_19.slots.default;
var __VLS_19;
if (!__VLS_ctx.routeRoomId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "panel home-studio-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    const __VLS_24 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        plain: true,
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.openStudio)
    };
    __VLS_27.slots.default;
    var __VLS_27;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "studio-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-shell preview-shell" },
    });
    if (__VLS_ctx.hasPreview) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            ref: "previewRef",
            ...{ class: "stage-video" },
            autoplay: true,
            muted: true,
            playsinline: true,
        });
        /** @type {typeof __VLS_ctx.previewRef} */ ;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-placeholder" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "panel-side" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.studioForm.title || '未填写');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.sourceModeLabel);
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
    (__VLS_ctx.studioForm.coverUrl ? '已上传封面' : '未设置封面');
    if (__VLS_ctx.studioForm.coverUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "side-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.studioForm.coverUrl),
            alt: "直播封面",
            ...{ class: "cover-preview" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-card actions-card" },
    });
    const __VLS_32 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.preparing),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.preparing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.handlePreparePreview)
    };
    __VLS_35.slots.default;
    var __VLS_35;
    const __VLS_40 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.starting),
        disabled: (!__VLS_ctx.hasPreview),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.starting),
        disabled: (!__VLS_ctx.hasPreview),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.handleStartLive)
    };
    __VLS_43.slots.default;
    var __VLS_43;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "room-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "panel stage-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-head room-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-kicker" },
    });
    (__VLS_ctx.isViewerMode ? 'Watching' : 'Studio');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.roomTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.roomSubtitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "head-tags" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tag" },
    });
    (__VLS_ctx.sourceModeLabel);
    if (__VLS_ctx.isLive) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tag tag-live" },
        });
    }
    else if (__VLS_ctx.displayedSession?.status === 'ENDED') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tag tag-ended" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tag tag-idle" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tag" },
    });
    (__VLS_ctx.displayedSession?.viewerCount ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-shell room-stage-shell" },
    });
    if (__VLS_ctx.isViewerMode && __VLS_ctx.hasRemotePlayback) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            ref: "viewerRef",
            ...{ class: "stage-video" },
            autoplay: true,
            playsinline: true,
            controls: true,
        });
        /** @type {typeof __VLS_ctx.viewerRef} */ ;
    }
    else if (!__VLS_ctx.isViewerMode && __VLS_ctx.hasPreview) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            ref: "previewRef",
            ...{ class: "stage-video" },
            autoplay: true,
            muted: true,
            playsinline: true,
        });
        /** @type {typeof __VLS_ctx.previewRef} */ ;
    }
    else if (__VLS_ctx.hasReplayPlayback) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            ...{ class: "stage-video" },
            src: (__VLS_ctx.displayedReplayUrl),
            controls: true,
            playsinline: true,
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-placeholder" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.placeholderTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.placeholderDescription);
    }
    if (__VLS_ctx.activeDanmaku.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "danmaku-layer" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.activeDanmaku))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.uid),
                ...{ class: "danmaku-item" },
                ...{ style: ({ top: `${item.top}px`, animationDuration: `${item.duration}ms` }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "danmaku-sender" },
            });
            (item.sender);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.content);
        }
    }
    if (!__VLS_ctx.isViewerMode) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "control-bar" },
        });
        const __VLS_48 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            ...{ 'onClick': {} },
            loading: (__VLS_ctx.preparing),
        }));
        const __VLS_50 = __VLS_49({
            ...{ 'onClick': {} },
            loading: (__VLS_ctx.preparing),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        let __VLS_52;
        let __VLS_53;
        let __VLS_54;
        const __VLS_55 = {
            onClick: (__VLS_ctx.handlePreparePreview)
        };
        __VLS_51.slots.default;
        var __VLS_51;
        const __VLS_56 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            ...{ 'onClick': {} },
            type: "danger",
            loading: (__VLS_ctx.starting),
            disabled: (!__VLS_ctx.hasPreview || __VLS_ctx.isLive),
        }));
        const __VLS_58 = __VLS_57({
            ...{ 'onClick': {} },
            type: "danger",
            loading: (__VLS_ctx.starting),
            disabled: (!__VLS_ctx.hasPreview || __VLS_ctx.isLive),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_60;
        let __VLS_61;
        let __VLS_62;
        const __VLS_63 = {
            onClick: (__VLS_ctx.handleStartLive)
        };
        __VLS_59.slots.default;
        var __VLS_59;
        const __VLS_64 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            ...{ 'onClick': {} },
            type: "danger",
            plain: true,
            loading: (__VLS_ctx.stopping),
            disabled: (!__VLS_ctx.hasPreview && !__VLS_ctx.isLive),
        }));
        const __VLS_66 = __VLS_65({
            ...{ 'onClick': {} },
            type: "danger",
            plain: true,
            loading: (__VLS_ctx.stopping),
            disabled: (!__VLS_ctx.hasPreview && !__VLS_ctx.isLive),
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        let __VLS_68;
        let __VLS_69;
        let __VLS_70;
        const __VLS_71 = {
            onClick: (__VLS_ctx.handleStopLive)
        };
        __VLS_67.slots.default;
        var __VLS_67;
        const __VLS_72 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            ...{ 'onClick': {} },
            plain: true,
            disabled: (!__VLS_ctx.canOpenReplaySaver),
        }));
        const __VLS_74 = __VLS_73({
            ...{ 'onClick': {} },
            plain: true,
            disabled: (!__VLS_ctx.canOpenReplaySaver),
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        let __VLS_76;
        let __VLS_77;
        let __VLS_78;
        const __VLS_79 = {
            onClick: (__VLS_ctx.openReplaySaver)
        };
        __VLS_75.slots.default;
        var __VLS_75;
        const __VLS_80 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            ...{ 'onClick': {} },
            plain: true,
            disabled: (!__VLS_ctx.recordedBlob),
        }));
        const __VLS_82 = __VLS_81({
            ...{ 'onClick': {} },
            plain: true,
            disabled: (!__VLS_ctx.recordedBlob),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        let __VLS_84;
        let __VLS_85;
        let __VLS_86;
        const __VLS_87 = {
            onClick: (__VLS_ctx.downloadRecording)
        };
        __VLS_83.slots.default;
        var __VLS_83;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "control-bar" },
        });
        const __VLS_88 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
            ...{ 'onClick': {} },
            loading: (__VLS_ctx.joining),
            disabled: (!__VLS_ctx.canJoinAsViewer),
        }));
        const __VLS_90 = __VLS_89({
            ...{ 'onClick': {} },
            loading: (__VLS_ctx.joining),
            disabled: (!__VLS_ctx.canJoinAsViewer),
        }, ...__VLS_functionalComponentArgsRest(__VLS_89));
        let __VLS_92;
        let __VLS_93;
        let __VLS_94;
        const __VLS_95 = {
            onClick: (__VLS_ctx.handleJoinViewer)
        };
        __VLS_91.slots.default;
        (__VLS_ctx.hasRemotePlayback ? '重新连接' : '进入观看');
        var __VLS_91;
        const __VLS_96 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
            ...{ 'onClick': {} },
            plain: true,
            disabled: (!__VLS_ctx.hasRemotePlayback),
        }));
        const __VLS_98 = __VLS_97({
            ...{ 'onClick': {} },
            plain: true,
            disabled: (!__VLS_ctx.hasRemotePlayback),
        }, ...__VLS_functionalComponentArgsRest(__VLS_97));
        let __VLS_100;
        let __VLS_101;
        let __VLS_102;
        const __VLS_103 = {
            onClick: (__VLS_ctx.handleLeaveViewer)
        };
        __VLS_99.slots.default;
        var __VLS_99;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "panel side-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.broadcasterName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.statusText);
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
    (__VLS_ctx.formatTime(__VLS_ctx.displayedSession?.startedAt));
    if (__VLS_ctx.shareLink) {
        const __VLS_104 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            modelValue: (__VLS_ctx.shareLink),
            readonly: true,
        }));
        const __VLS_106 = __VLS_105({
            modelValue: (__VLS_ctx.shareLink),
            readonly: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        __VLS_107.slots.default;
        {
            const { prepend: __VLS_thisSlot } = __VLS_107.slots;
        }
        var __VLS_107;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-card danmaku-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-head compact-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "message-count" },
    });
    (__VLS_ctx.liveMessages.length);
    if (__VLS_ctx.currentRoomId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "message-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.liveMessages))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (item.id),
                ...{ class: "message-item" },
                ...{ class: (item.kind === 'SYSTEM' ? 'message-item-system' : '') },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "message-meta" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.sender.nickname);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatTime(item.createdAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.content);
        }
        if (__VLS_ctx.liveMessages.length === 0) {
            const __VLS_108 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
                description: "直播开始后这里会显示弹幕",
            }));
            const __VLS_110 = __VLS_109({
                description: "直播开始后这里会显示弹幕",
            }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        }
    }
    else {
        const __VLS_112 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            description: "进入直播间后可查看弹幕",
        }));
        const __VLS_114 = __VLS_113({
            description: "进入直播间后可查看弹幕",
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message-compose" },
    });
    const __VLS_116 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.chatDraft),
        disabled: (!__VLS_ctx.canSendMessage),
        maxlength: "200",
        placeholder: "发一条弹幕，按回车发送",
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.chatDraft),
        disabled: (!__VLS_ctx.canSendMessage),
        maxlength: "200",
        placeholder: "发一条弹幕，按回车发送",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_120;
    let __VLS_121;
    let __VLS_122;
    const __VLS_123 = {
        onKeyup: (__VLS_ctx.handleSendMessage)
    };
    var __VLS_119;
    const __VLS_124 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.sendingMessage),
        disabled: (!__VLS_ctx.canSendMessage),
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.sendingMessage),
        disabled: (!__VLS_ctx.canSendMessage),
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_128;
    let __VLS_129;
    let __VLS_130;
    const __VLS_131 = {
        onClick: (__VLS_ctx.handleSendMessage)
    };
    __VLS_127.slots.default;
    var __VLS_127;
    if (__VLS_ctx.showQuickSaveActions) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "side-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "save-actions-inline" },
        });
        const __VLS_132 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
            ...{ 'onClick': {} },
            plain: true,
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onClick': {} },
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_136;
        let __VLS_137;
        let __VLS_138;
        const __VLS_139 = {
            onClick: (__VLS_ctx.downloadRecording)
        };
        __VLS_135.slots.default;
        var __VLS_135;
        const __VLS_140 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            ...{ 'onClick': {} },
            type: "danger",
            disabled: (!__VLS_ctx.canOpenReplaySaver),
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onClick': {} },
            type: "danger",
            disabled: (!__VLS_ctx.canOpenReplaySaver),
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_144;
        let __VLS_145;
        let __VLS_146;
        const __VLS_147 = {
            onClick: (__VLS_ctx.openReplaySaver)
        };
        __VLS_143.slots.default;
        var __VLS_143;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel plaza-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-kicker" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.plazaRooms.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "room-grid" },
    });
    for (const [room] of __VLS_getVForSourceType((__VLS_ctx.plazaRooms))) {
        /** @type {[typeof LiveRoomCard, ]} */ ;
        // @ts-ignore
        const __VLS_148 = __VLS_asFunctionalComponent(LiveRoomCard, new LiveRoomCard({
            key: (room.id),
            item: (room),
        }));
        const __VLS_149 = __VLS_148({
            key: (room.id),
            item: (room),
        }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    }
}
else {
    const __VLS_151 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
        description: "当前还没有正在直播中的房间",
    }));
    const __VLS_153 = __VLS_152({
        description: "当前还没有正在直播中的房间",
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
}
const __VLS_155 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
    modelValue: (__VLS_ctx.studioVisible),
    title: "创建直播",
    width: "620px",
}));
const __VLS_157 = __VLS_156({
    modelValue: (__VLS_ctx.studioVisible),
    title: "创建直播",
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
__VLS_158.slots.default;
if (!__VLS_ctx.isLoggedIn) {
    const __VLS_159 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
        title: "请先登录一个普通用户账号，再创建直播。",
        type: "warning",
        closable: (false),
        showIcon: true,
    }));
    const __VLS_161 = __VLS_160({
        title: "请先登录一个普通用户账号，再创建直播。",
        type: "warning",
        closable: (false),
        showIcon: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
}
const __VLS_163 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
    model: (__VLS_ctx.studioForm),
    labelPosition: "top",
}));
const __VLS_165 = __VLS_164({
    model: (__VLS_ctx.studioForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_164));
__VLS_166.slots.default;
const __VLS_167 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
    label: "直播标题",
}));
const __VLS_169 = __VLS_168({
    label: "直播标题",
}, ...__VLS_functionalComponentArgsRest(__VLS_168));
__VLS_170.slots.default;
const __VLS_171 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
    modelValue: (__VLS_ctx.studioForm.title),
    maxlength: "60",
    showWordLimit: true,
    placeholder: "例如：今晚一起做项目复盘",
}));
const __VLS_173 = __VLS_172({
    modelValue: (__VLS_ctx.studioForm.title),
    maxlength: "60",
    showWordLimit: true,
    placeholder: "例如：今晚一起做项目复盘",
}, ...__VLS_functionalComponentArgsRest(__VLS_172));
var __VLS_170;
const __VLS_175 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
    label: "直播形式",
}));
const __VLS_177 = __VLS_176({
    label: "直播形式",
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
__VLS_178.slots.default;
const __VLS_179 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
    modelValue: (__VLS_ctx.studioForm.mode),
}));
const __VLS_181 = __VLS_180({
    modelValue: (__VLS_ctx.studioForm.mode),
}, ...__VLS_functionalComponentArgsRest(__VLS_180));
__VLS_182.slots.default;
const __VLS_183 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
    value: "camera",
}));
const __VLS_185 = __VLS_184({
    value: "camera",
}, ...__VLS_functionalComponentArgsRest(__VLS_184));
__VLS_186.slots.default;
var __VLS_186;
const __VLS_187 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
    value: "screen",
}));
const __VLS_189 = __VLS_188({
    value: "screen",
}, ...__VLS_functionalComponentArgsRest(__VLS_188));
__VLS_190.slots.default;
var __VLS_190;
var __VLS_182;
var __VLS_178;
const __VLS_191 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
    label: "直播封面",
}));
const __VLS_193 = __VLS_192({
    label: "直播封面",
}, ...__VLS_functionalComponentArgsRest(__VLS_192));
__VLS_194.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "upload-row" },
});
const __VLS_195 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
    modelValue: (__VLS_ctx.studioForm.coverUrl),
    placeholder: "可直接粘贴封面地址，或上传本地封面",
}));
const __VLS_197 = __VLS_196({
    modelValue: (__VLS_ctx.studioForm.coverUrl),
    placeholder: "可直接粘贴封面地址，或上传本地封面",
}, ...__VLS_functionalComponentArgsRest(__VLS_196));
const __VLS_199 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.uploadingStudioCover),
}));
const __VLS_201 = __VLS_200({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.uploadingStudioCover),
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
let __VLS_203;
let __VLS_204;
let __VLS_205;
const __VLS_206 = {
    onClick: (...[$event]) => {
        __VLS_ctx.studioCoverInputRef?.click();
    }
};
__VLS_202.slots.default;
var __VLS_202;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleStudioCoverChange) },
    ref: "studioCoverInputRef",
    type: "file",
    accept: "image/*",
    ...{ class: "hidden-input" },
});
/** @type {typeof __VLS_ctx.studioCoverInputRef} */ ;
if (__VLS_ctx.studioForm.coverUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.studioForm.coverUrl),
        alt: "封面预览",
        ...{ class: "dialog-cover-preview" },
    });
}
var __VLS_194;
var __VLS_166;
{
    const { footer: __VLS_thisSlot } = __VLS_158.slots;
    const __VLS_207 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
        ...{ 'onClick': {} },
    }));
    const __VLS_209 = __VLS_208({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_208));
    let __VLS_211;
    let __VLS_212;
    let __VLS_213;
    const __VLS_214 = {
        onClick: (...[$event]) => {
            __VLS_ctx.studioVisible = false;
        }
    };
    __VLS_210.slots.default;
    var __VLS_210;
    const __VLS_215 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.preparing),
        disabled: (!__VLS_ctx.isLoggedIn),
    }));
    const __VLS_217 = __VLS_216({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.preparing),
        disabled: (!__VLS_ctx.isLoggedIn),
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
    let __VLS_219;
    let __VLS_220;
    let __VLS_221;
    const __VLS_222 = {
        onClick: (__VLS_ctx.handlePreparePreview)
    };
    __VLS_218.slots.default;
    var __VLS_218;
}
var __VLS_158;
const __VLS_223 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
    modelValue: (__VLS_ctx.saveReplayVisible),
    title: "保存直播内容",
    width: "680px",
}));
const __VLS_225 = __VLS_224({
    modelValue: (__VLS_ctx.saveReplayVisible),
    title: "保存直播内容",
    width: "680px",
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
__VLS_226.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "replay-dialog-body" },
});
if (__VLS_ctx.recordingPreviewUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
        ...{ class: "dialog-video-preview" },
        src: (__VLS_ctx.recordingPreviewUrl),
        controls: true,
        playsinline: true,
    });
}
const __VLS_227 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
    model: (__VLS_ctx.replayForm),
    labelPosition: "top",
}));
const __VLS_229 = __VLS_228({
    model: (__VLS_ctx.replayForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_228));
__VLS_230.slots.default;
const __VLS_231 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
    label: "稿件标题",
}));
const __VLS_233 = __VLS_232({
    label: "稿件标题",
}, ...__VLS_functionalComponentArgsRest(__VLS_232));
__VLS_234.slots.default;
const __VLS_235 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
    modelValue: (__VLS_ctx.replayForm.title),
    maxlength: "80",
    showWordLimit: true,
}));
const __VLS_237 = __VLS_236({
    modelValue: (__VLS_ctx.replayForm.title),
    maxlength: "80",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_236));
var __VLS_234;
const __VLS_239 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
    label: "稿件简介",
}));
const __VLS_241 = __VLS_240({
    label: "稿件简介",
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
__VLS_242.slots.default;
const __VLS_243 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
    modelValue: (__VLS_ctx.replayForm.description),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
}));
const __VLS_245 = __VLS_244({
    modelValue: (__VLS_ctx.replayForm.description),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
var __VLS_242;
const __VLS_247 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
    label: "稿件封面",
}));
const __VLS_249 = __VLS_248({
    label: "稿件封面",
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
__VLS_250.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "upload-row" },
});
const __VLS_251 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.replayForm.coverUrl),
    placeholder: "默认沿用直播封面，也可以重新上传",
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.replayForm.coverUrl),
    placeholder: "默认沿用直播封面，也可以重新上传",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
const __VLS_255 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.uploadingReplayCover),
}));
const __VLS_257 = __VLS_256({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.uploadingReplayCover),
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
let __VLS_259;
let __VLS_260;
let __VLS_261;
const __VLS_262 = {
    onClick: (...[$event]) => {
        __VLS_ctx.replayCoverInputRef?.click();
    }
};
__VLS_258.slots.default;
var __VLS_258;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleReplayCoverChange) },
    ref: "replayCoverInputRef",
    type: "file",
    accept: "image/*",
    ...{ class: "hidden-input" },
});
/** @type {typeof __VLS_ctx.replayCoverInputRef} */ ;
if (__VLS_ctx.replayForm.coverUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.replayForm.coverUrl),
        alt: "稿件封面预览",
        ...{ class: "dialog-cover-preview" },
    });
}
var __VLS_250;
var __VLS_230;
{
    const { footer: __VLS_thisSlot } = __VLS_226.slots;
    const __VLS_263 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
        ...{ 'onClick': {} },
        disabled: (!__VLS_ctx.recordedBlob),
    }));
    const __VLS_265 = __VLS_264({
        ...{ 'onClick': {} },
        disabled: (!__VLS_ctx.recordedBlob),
    }, ...__VLS_functionalComponentArgsRest(__VLS_264));
    let __VLS_267;
    let __VLS_268;
    let __VLS_269;
    const __VLS_270 = {
        onClick: (__VLS_ctx.downloadRecording)
    };
    __VLS_266.slots.default;
    var __VLS_266;
    const __VLS_271 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.savingReplay),
        disabled: (!__VLS_ctx.recordedBlob),
    }));
    const __VLS_273 = __VLS_272({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.savingReplay),
        disabled: (!__VLS_ctx.recordedBlob),
    }, ...__VLS_functionalComponentArgsRest(__VLS_272));
    let __VLS_275;
    let __VLS_276;
    let __VLS_277;
    const __VLS_278 = {
        onClick: (__VLS_ctx.handleSaveReplay)
    };
    __VLS_274.slots.default;
    var __VLS_274;
}
var __VLS_226;
/** @type {__VLS_StyleScopedClasses['live-page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['home-studio-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['studio-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-video']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-side']} */ ;
/** @type {__VLS_StyleScopedClasses['side-card']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['side-card']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['side-card']} */ ;
/** @type {__VLS_StyleScopedClasses['actions-card']} */ ;
/** @type {__VLS_StyleScopedClasses['room-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['room-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['head-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['tag-live']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['tag-ended']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['tag-idle']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['room-stage-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-video']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-video']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-video']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-layer']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-item']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-sender']} */ ;
/** @type {__VLS_StyleScopedClasses['control-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['control-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-card']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-row']} */ ;
/** @type {__VLS_StyleScopedClasses['side-card']} */ ;
/** @type {__VLS_StyleScopedClasses['danmaku-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['message-count']} */ ;
/** @type {__VLS_StyleScopedClasses['message-list']} */ ;
/** @type {__VLS_StyleScopedClasses['message-item']} */ ;
/** @type {__VLS_StyleScopedClasses['message-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['message-compose']} */ ;
/** @type {__VLS_StyleScopedClasses['side-card']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['save-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['plaza-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['room-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden-input']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-dialog-body']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-video-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden-input']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-cover-preview']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LiveRoomCard: LiveRoomCard,
            isLoggedIn: isLoggedIn,
            nickname: nickname,
            studioVisible: studioVisible,
            saveReplayVisible: saveReplayVisible,
            preparing: preparing,
            starting: starting,
            joining: joining,
            stopping: stopping,
            sendingMessage: sendingMessage,
            savingReplay: savingReplay,
            uploadingStudioCover: uploadingStudioCover,
            uploadingReplayCover: uploadingReplayCover,
            previewRef: previewRef,
            viewerRef: viewerRef,
            studioCoverInputRef: studioCoverInputRef,
            replayCoverInputRef: replayCoverInputRef,
            recordedBlob: recordedBlob,
            recordingPreviewUrl: recordingPreviewUrl,
            activeRoom: activeRoom,
            liveMessages: liveMessages,
            activeDanmaku: activeDanmaku,
            chatDraft: chatDraft,
            studioForm: studioForm,
            replayForm: replayForm,
            routeRoomId: routeRoomId,
            displayedSession: displayedSession,
            currentRoomId: currentRoomId,
            isViewerMode: isViewerMode,
            hasPreview: hasPreview,
            hasRemotePlayback: hasRemotePlayback,
            displayedReplayUrl: displayedReplayUrl,
            hasReplayPlayback: hasReplayPlayback,
            isLive: isLive,
            canJoinAsViewer: canJoinAsViewer,
            canSendMessage: canSendMessage,
            canOpenReplaySaver: canOpenReplaySaver,
            sourceModeLabel: sourceModeLabel,
            shareLink: shareLink,
            plazaRooms: plazaRooms,
            broadcasterName: broadcasterName,
            roomTitle: roomTitle,
            roomSubtitle: roomSubtitle,
            statusText: statusText,
            placeholderTitle: placeholderTitle,
            placeholderDescription: placeholderDescription,
            showQuickSaveActions: showQuickSaveActions,
            openStudio: openStudio,
            goToMyRoom: goToMyRoom,
            formatTime: formatTime,
            handlePreparePreview: handlePreparePreview,
            handleStartLive: handleStartLive,
            handleStopLive: handleStopLive,
            handleJoinViewer: handleJoinViewer,
            handleLeaveViewer: handleLeaveViewer,
            openReplaySaver: openReplaySaver,
            downloadRecording: downloadRecording,
            handleSaveReplay: handleSaveReplay,
            handleSendMessage: handleSendMessage,
            handleStudioCoverChange: handleStudioCoverChange,
            handleReplayCoverChange: handleReplayCoverChange,
            loadHubRooms: loadHubRooms,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
