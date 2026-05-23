<template>
  <RouterLink :to="to" class="channel-card" :style="{ backgroundImage: coverStyle }">
    <span class="channel-shade" aria-hidden="true"></span>
    <span class="channel-icon" aria-hidden="true">
      <el-icon :size="30">
        <component :is="icon" />
      </el-icon>
    </span>
    <span class="channel-copy">
      <strong>{{ title }}</strong>
      <small>{{ description }}</small>
      <em>{{ countText }}</em>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  description: string;
  countText: string;
  to: string;
  image?: string;
  icon: object;
}>();

const coverStyle = computed(() =>
  props.image
    ? `linear-gradient(90deg, rgba(12, 20, 34, 0.66), rgba(12, 20, 34, 0.18)), url("${props.image}")`
    : 'linear-gradient(135deg, #24395f, #6f87ad)',
);
</script>

<style scoped>
.channel-card {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 124px;
  overflow: hidden;
  padding: 22px;
  border-radius: 16px;
  background-position: center;
  background-size: cover;
  color: #fff;
  text-decoration: none;
  box-shadow: 0 14px 30px rgba(23, 32, 51, 0.12);
  transition:
    transform var(--gl-transition),
    box-shadow var(--gl-transition),
    filter var(--gl-transition);
}

.channel-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 42px rgba(23, 32, 51, 0.18);
  filter: saturate(1.04);
}

.channel-card:active {
  transform: translateY(-1px) scale(0.99);
}

.channel-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(23, 32, 51, 0.04), rgba(23, 32, 51, 0.22)),
    radial-gradient(circle at 10% 15%, rgba(255, 255, 255, 0.2), transparent 34%);
}

.channel-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.94);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.channel-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.channel-copy strong {
  overflow: hidden;
  font-size: 18px;
  font-weight: 800;
  line-height: 25px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-copy small,
.channel-copy em {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.84);
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-copy em {
  color: rgba(255, 255, 255, 0.94);
}
</style>
