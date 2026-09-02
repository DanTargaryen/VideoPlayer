import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, put, del } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('./http', () => ({ default: { get, post, put, delete: del } }));
import { fetchRecommendFeed, searchAll, fetchVideoDetail, createLiveRoom, updateVideoDraft, deleteCreatorVideo, fetchCoinWallet, claimDailyCoins } from './platform';

beforeEach(() => { vi.clearAllMocks(); get.mockResolvedValue({ data: { data: { ok: true } } }); post.mockResolvedValue({ data: { data: { ok: true } } }); put.mockResolvedValue({ data: { data: { ok: true } } }); del.mockResolvedValue({ data: { data: { ok: true } } }); });

describe('platform API wrappers', () => {
  it('unwraps recommend feed', async () => { await expect(fetchRecommendFeed({ page: 2 })).resolves.toEqual({ ok: true }); expect(get).toHaveBeenCalledWith('/feeds/recommend', { params: { page: 2 } }); });
  it('passes search parameters', async () => { await searchAll({ keyword: 'cat', tab: 'video' }); expect(get).toHaveBeenCalledWith('/search/all', { params: { keyword: 'cat', tab: 'video' } }); });
  it('fetches video detail by id', async () => { await fetchVideoDetail(42); expect(get).toHaveBeenCalledWith('/videos/42'); });
  it('creates live room with payload', async () => { const payload = { title: 'demo', sourceMode: 'camera' as const }; await createLiveRoom(payload); expect(post).toHaveBeenCalledWith('/lives/rooms', payload); });
  it('updates a draft', async () => { await updateVideoDraft(7, { title: 'new' }); expect(put).toHaveBeenCalledWith('/videos/7', { title: 'new' }); });
  it('deletes creator video', async () => { await deleteCreatorVideo(8); expect(del).toHaveBeenCalledWith('/videos/8'); });
  it('fetches coin wallet', async () => { await fetchCoinWallet(); expect(get).toHaveBeenCalledWith('/gift-coins/wallet'); });
  it('claims daily coins', async () => { await claimDailyCoins(); expect(post).toHaveBeenCalledWith('/gift-coins/daily-claim'); });
});
