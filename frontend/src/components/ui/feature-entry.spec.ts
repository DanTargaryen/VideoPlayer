import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FeatureEntryCard from './FeatureEntryCard.vue';

const Icon = { template: '<span class="fake-icon" />' };
const mountCard = (props: Record<string, unknown> = {}, slots = {}) => mount(FeatureEntryCard, { props: { title: 'Upload', description: 'Send video', icon: Icon, ...props }, slots, global: { stubs: { 'el-icon': { template: '<span class="el-icon"><slot /></span>' }, RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } });

describe('FeatureEntryCard', () => {
  it('renders title and description', () => { const w = mountCard(); expect(w.text()).toContain('Upload'); expect(w.text()).toContain('Send video'); });
  it('renders as div without destination', () => { expect(mountCard().element.tagName).toBe('DIV'); });
  it('renders as router link with destination', () => { const w = mountCard({ to: '/upload' }); expect(w.element.tagName).toBe('A'); expect(w.attributes('href')).toBe('/upload'); });
  it('uses primary tone by default', () => { expect(mountCard().find('.feature-icon').classes()).not.toContain('accent'); });
  it.each(['accent', 'live', 'neutral'] as const)('applies %s tone', (tone) => { expect(mountCard({ tone }).find('.feature-icon').classes()).toContain(tone); });
  it('mounts provided icon component', () => { expect(mountCard().find('.fake-icon').exists()).toBe(true); });
  it('keeps long title in strong element', () => { expect(mountCard({ title: 'A very long title' }).get('strong').text()).toBe('A very long title'); });
  it('keeps description in small element', () => { expect(mountCard({ description: 'Details' }).get('small').text()).toBe('Details'); });
  it('does not render navigation href when to is empty', () => { expect(mountCard({ to: '' }).element.tagName).toBe('DIV'); });
});
