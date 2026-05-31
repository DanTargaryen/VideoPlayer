<template>
  <section class="text-card">
    <p>
      <template v-for="(segment, index) in segments" :key="`${segment.text}-${index}`">
        <RouterLink v-if="segment.kind === 'topic'" :to="{ path: '/search', query: { keyword: segment.text.slice(1, -1), tab: 'video' } }">
          {{ segment.text }}
        </RouterLink>
        <RouterLink v-else-if="segment.kind === 'mention'" :to="{ path: '/search', query: { keyword: segment.text.slice(1), tab: 'user' } }">
          {{ segment.text }}
        </RouterLink>
        <span v-else>{{ segment.text }}</span>
      </template>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DynamicFeedItem } from '@/types/api';

type TextSegment = {
  text: string;
  kind: 'normal' | 'topic' | 'mention';
};

const props = defineProps<{
  item: DynamicFeedItem;
}>();

const segments = computed(() => parseSegments(props.item.description || props.item.title || ''));

function parseSegments(value: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /(#([^#\s]+)#|@[\w\u4e00-\u9fa5_-]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) {
      segments.push({ text: value.slice(cursor, match.index), kind: 'normal' });
    }

    segments.push({
      text: match[0],
      kind: match[0].startsWith('#') ? 'topic' : 'mention',
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), kind: 'normal' });
  }

  return segments.length > 0 ? segments : [{ text: value, kind: 'normal' }];
}
</script>

<style scoped>
.text-card {
  display: grid;
}

.text-card p {
  margin: 0;
  color: var(--color-text-main);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

.text-card a {
  color: var(--color-primary);
  font-weight: 800;
}

.text-card a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
