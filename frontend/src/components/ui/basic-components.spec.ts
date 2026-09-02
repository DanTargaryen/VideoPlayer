import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from './EmptyState.vue';
import SectionHeader from './SectionHeader.vue';
import StatCard from './StatCard.vue';

describe('basic UI components', () => {
  it('renders empty state title and description', () => { const w = mount(EmptyState, { props: { title: 'Nothing', description: 'Try again' } }); expect(w.text()).toContain('Nothing'); expect(w.text()).toContain('Try again'); });
  it('renders empty state action slot', () => { const w = mount(EmptyState, { props: { title: 'x', description: 'y' }, slots: { action: '<button>Retry</button>' } }); expect(w.get('button').text()).toBe('Retry'); });
  it('omits empty state action without slot', () => { expect(mount(EmptyState, { props: { title: 'x', description: 'y' } }).find('.action').exists()).toBe(false); });
  it('renders section title', () => { expect(mount(SectionHeader, { props: { title: 'Feed' } }).get('h2').text()).toBe('Feed'); });
  it('renders optional eyebrow', () => { expect(mount(SectionHeader, { props: { title: 'Feed', eyebrow: 'Today' } }).find('.eyebrow').text()).toBe('Today'); });
  it('renders optional description', () => { expect(mount(SectionHeader, { props: { title: 'Feed', description: 'Latest' } }).find('.description').text()).toBe('Latest'); });
  it('omits optional text when absent', () => { const w = mount(SectionHeader, { props: { title: 'Feed' } }); expect(w.find('.eyebrow').exists()).toBe(false); expect(w.find('.description').exists()).toBe(false); });
  it('renders section actions slot', () => { expect(mount(SectionHeader, { props: { title: 'Feed' }, slots: { actions: '<button>More</button>' } }).get('button').text()).toBe('More'); });
  it('renders numeric stat values', () => { expect(mount(StatCard, { props: { label: 'Views', value: 42 } }).text()).toContain('42'); });
  it('renders string stat values', () => { expect(mount(StatCard, { props: { label: 'Status', value: 'Ready' } }).text()).toContain('Ready'); });
  it('renders stat description', () => { expect(mount(StatCard, { props: { label: 'Views', value: 42, description: 'This week' } }).text()).toContain('This week'); });
  it('omits stat description when empty', () => { expect(mount(StatCard, { props: { label: 'Views', value: 42 } }).find('p').exists()).toBe(false); });
});
