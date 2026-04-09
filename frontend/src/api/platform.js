import http from './http';
export async function login(payload) {
    const { data } = await http.post('/auth/login', payload);
    return data.data;
}
export async function fetchRecommendFeed(params) {
    const { data } = await http.get('/feeds/recommend', {
        params,
    });
    return data.data;
}
export async function createLiveRoom(payload) {
    const { data } = await http.post('/lives/rooms', payload);
    return data.data;
}
export async function fetchLiveRooms(params) {
    const { data } = await http.get('/lives/rooms', {
        params,
    });
    return data.data;
}
export async function fetchLiveRoom(roomId) {
    const { data } = await http.get(`/lives/rooms/${roomId}`);
    return data.data;
}
export async function startLiveRoom(roomId) {
    const { data } = await http.post(`/lives/rooms/${roomId}/start`);
    return data.data;
}
export async function stopLiveRoom(roomId) {
    const { data } = await http.post(`/lives/rooms/${roomId}/stop`);
    return data.data;
}
export async function fetchLiveSession(sessionId) {
    const { data } = await http.get(`/lives/sessions/${sessionId}`);
    return data.data;
}
export async function createLiveViewer(roomId) {
    const { data } = await http.post(`/lives/rooms/${roomId}/viewers`);
    return data.data;
}
export async function leaveLiveViewer(roomId, viewerId) {
    const { data } = await http.delete(`/lives/rooms/${roomId}/viewers/${viewerId}`);
    return data.data;
}
export async function submitLiveViewerOffer(roomId, viewerId, payload) {
    const { data } = await http.post(`/lives/rooms/${roomId}/viewers/${viewerId}/offer`, payload);
    return data.data;
}
export async function fetchPendingLiveViewers(roomId) {
    const { data } = await http.get(`/lives/rooms/${roomId}/publisher/pending-viewers`);
    return data.data;
}
export async function submitLiveViewerAnswer(roomId, viewerId, payload) {
    const { data } = await http.post(`/lives/rooms/${roomId}/viewers/${viewerId}/answer`, payload);
    return data.data;
}
export async function fetchLiveViewerAnswer(roomId, viewerId) {
    const { data } = await http.get(`/lives/rooms/${roomId}/viewers/${viewerId}/answer`);
    return data.data;
}
export async function fetchLiveMessages(roomId) {
    const { data } = await http.get(`/lives/rooms/${roomId}/messages`);
    return data.data;
}
export async function createLiveMessage(roomId, payload) {
    const { data } = await http.post(`/lives/rooms/${roomId}/messages`, payload);
    return data.data;
}
export async function fetchFollowingFeed() {
    const { data } = await http.get('/feeds/following');
    return data.data;
}
export async function searchAll(payload) {
    const { data } = await http.get('/search/all', {
        params: payload,
    });
    return data.data;
}
export async function fetchVideoDetail(id) {
    const { data } = await http.get(`/videos/${id}`);
    return data.data;
}
export async function fetchRelatedVideos(videoId) {
    const { data } = await http.get(`/videos/${videoId}/recommendations`);
    return data.data;
}
export async function fetchUserHomepage(id) {
    const { data } = await http.get(`/users/${id}/homepage`);
    return data.data;
}
export async function uploadVideo(file, assetType = 'ORIGINAL') {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await http.post('/videos/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        params: { assetType },
    });
    return data.data;
}
export async function createVideo(payload) {
    const { data } = await http.post('/videos', payload);
    return data.data;
}
export async function updateVideoDraft(videoId, payload) {
    const { data } = await http.put(`/videos/${videoId}`, payload);
    return data.data;
}
export async function fetchVideoReviews(videoId) {
    const { data } = await http.get(`/videos/${videoId}/reviews`);
    return data.data;
}
export async function fetchCreatorDashboard() {
    const { data } = await http.get('/creator/dashboard');
    return data.data;
}
export async function fetchCreatorVideos() {
    const { data } = await http.get('/creator/videos');
    return data.data;
}
export async function submitReview(videoId) {
    const { data } = await http.post(`/videos/${videoId}/submit-review`);
    return data.data;
}
export async function fetchAdminDashboard() {
    const { data } = await http.get('/admin/dashboard');
    return data.data;
}
export async function fetchReviewQueue() {
    const { data } = await http.get('/admin/reviews/videos');
    return data.data;
}
export async function reviewVideo(reviewId, action, reason) {
    const { data } = await http.post(`/admin/reviews/videos/${reviewId}`, {
        action,
        reason,
    });
    return data.data;
}
export async function fetchTextReviewQueue(targetType) {
    const { data } = await http.get('/admin/reviews/text-content', {
        params: targetType ? { targetType } : {},
    });
    return data.data;
}
export async function moderateTextContent(targetType, id, action, reason) {
    const { data } = await http.post(`/admin/reviews/text-content/${targetType}/${id}`, { action, reason });
    return data.data;
}
export async function fetchReports() {
    const { data } = await http.get('/admin/reports');
    return data.data;
}
export async function handleReport(reportId, action, reason) {
    const { data } = await http.post(`/admin/reports/${reportId}`, {
        action,
        reason,
    });
    return data.data;
}
export async function fetchComments(videoId) {
    const { data } = await http.get(`/videos/${videoId}/comments`);
    return data.data;
}
export async function createComment(videoId, payload) {
    const { data } = await http.post(`/videos/${videoId}/comments`, payload);
    return data.data;
}
export async function reportContent(payload) {
    const { data } = await http.post('/reports', payload);
    return data.data;
}
export async function followUser(userId) {
    const { data } = await http.post(`/users/${userId}/follow`);
    return data.data;
}
export async function unfollowUser(userId) {
    const { data } = await http.delete(`/users/${userId}/follow`);
    return data.data;
}
export async function fetchNotifications() {
    const { data } = await http.get('/notifications');
    return data.data;
}
export async function fetchUnreadNotificationCount() {
    const { data } = await http.get('/notifications/unread-count');
    return data.data;
}
export async function readAllNotifications() {
    const { data } = await http.post('/notifications/read-all');
    return data.data;
}
export async function likeVideo(videoId) {
    const { data } = await http.post(`/videos/${videoId}/like`);
    return data.data;
}
export async function unlikeVideo(videoId) {
    const { data } = await http.delete(`/videos/${videoId}/like`);
    return data.data;
}
export async function favoriteVideo(videoId) {
    const { data } = await http.post(`/videos/${videoId}/favorite`);
    return data.data;
}
export async function unfavoriteVideo(videoId) {
    const { data } = await http.delete(`/videos/${videoId}/favorite`);
    return data.data;
}
export async function fetchDanmakus(videoId, fromMs = 0, toMs = 600000) {
    const { data } = await http.get(`/videos/${videoId}/danmaku`, {
        params: { fromMs, toMs },
    });
    return data.data;
}
export async function createDanmaku(videoId, payload) {
    const { data } = await http.post(`/videos/${videoId}/danmaku`, payload);
    return data.data;
}
