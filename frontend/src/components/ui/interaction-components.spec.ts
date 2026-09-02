import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import UserAvatar from './UserAvatar.vue';
import ChannelTabs from './ChannelTabs.vue';

describe('interactive UI components', () => {
  it('uses trimmed name initial', () => { expect(mount(UserAvatar, { props: { name: ' Alice ' } }).text()).toBe('A'); });
  it('uses G fallback initial', () => { expect(mount(UserAvatar).text()).toBe('G'); });
  it('uses image when src is present', () => { const w = mount(UserAvatar, { props: { src: '/a.png', name: 'Alice' } }); expect(w.find('img').exists()).toBe(true); expect(w.find('img').attributes('alt')).toBe('Alice'); });
  it('prefers explicit alt text', () => { expect(mount(UserAvatar, { props: { src: '/a.png', name: 'Alice', alt: 'Profile' } }).get('img').attributes('alt')).toBe('Profile'); });
  it('uses default image alt', () => { expect(mount(UserAvatar, { props: { src: '/a.png' } }).get('img').attributes('alt')).toBe('用户头像'); });
  it('applies default md size', () => { expect(mount(UserAvatar).classes()).toContain('avatar-md'); });
  it.each(['sm', 'lg', 'xl'] as const)('applies %s size', (size) => { expect(mount(UserAvatar, { props: { size } }).classes()).toContain(`avatar-${size}`); });
  it('applies online class', () => { expect(mount(UserAvatar, { props: { online: true } }).classes()).toContain('online'); });
  it('renders channel tabs', () => { const w = mount(ChannelTabs, { props: { modelValue: 'video', items: [{ label: 'Video', value: 'video' }, { label: 'Live', value: 'live' }] } }); expect(w.findAll('button')).toHaveLength(2); });
  it('marks selected channel tab', () => { const w = mount(ChannelTabs, { props: { modelValue: 'live', items: [{ label: 'Video', value: 'video' }, { label: 'Live', value: 'live' }] } }); expect(w.findAll('button')[1].classes()).toContain('active'); expect(w.findAll('button')[1].attributes('aria-selected')).toBe('true'); });
  it('marks other tabs unselected', () => { const w = mount(ChannelTabs, { props: { modelValue: 'live', items: [{ label: 'Video', value: 'video' }, { label: 'Live', value: 'live' }] } }); expect(w.findAll('button')[0].attributes('aria-selected')).toBe('false'); });
  it('emits selected tab value', async () => { const w = mount(ChannelTabs, { props: { modelValue: 'video', items: [{ label: 'Video', value: 'video' }, { label: 'Live', value: 'live' }] } }); await w.findAll('button')[1].trigger('click'); expect(w.emitted('update:modelValue')).toEqual([['live']]); });
  it('renders empty channel list', () => { expect(mount(ChannelTabs, { props: { modelValue: '', items: [] } }).findAll('button')).toHaveLength(0); });
});
