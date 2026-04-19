<template>
  <div ref="rootRef" class="search-suggest-box">
    <div class="search-row">
      <div class="search-input-container">
        <input
          v-model="inputValue"
          :placeholder="placeholder"
          class="search-input"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown.down.prevent="highlightNext"
          @keydown.up.prevent="highlightPrevious"
          @keydown.enter.prevent="confirmSearch"
          @keydown.esc.prevent="closePanel"
        />
        <button class="search-icon-btn" @click="searchWithCurrentInput">
          <el-icon :size="20"><Search /></el-icon>
        </button>
        <button v-if="inputValue" class="clear-btn" @click="inputValue = ''">
          <el-icon :size="16"><Close /></el-icon>
        </button>
      </div>
    </div>

    <div v-if="showPanel" class="suggest-panel">
      <button
        v-for="(item, index) in suggestions"
        :key="`${item}-${index}`"
        type="button"
        class="suggest-item"
        :class="{ active: index === highlightedIndex }"
        :title="item"
        @mouseenter="highlightedIndex = index"
        @mousedown.prevent
        @click="searchWithSuggestion(item)"
      >
        <span class="suggest-text">{{ item }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Search, Close } from '@element-plus/icons-vue';

import { fetchSearchSuggestions } from '@/api/platform';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    debounceMs?: number;
  }>(),
  {
    placeholder: '搜索视频或用户',
    debounceMs: 300,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [value: string];
}>();

const rootRef = ref<HTMLElement | null>(null);
const inputValue = ref(props.modelValue);
const suggestions = ref<string[]>([]);
const highlightedIndex = ref(-1);
const isFocused = ref(false);
const isPanelOpen = ref(false);
const debounceTimer = ref<number | null>(null);
const blurTimer = ref<number | null>(null);
const requestSerial = ref(0);

const showPanel = computed(
  () => isPanelOpen.value && inputValue.value.trim().length > 0 && suggestions.value.length > 0,
);

watch(
  () => props.modelValue,
  (value) => {
    if (value !== inputValue.value) {
      inputValue.value = value;
    }
  },
);

watch(inputValue, (value) => {
  emit('update:modelValue', value);
  scheduleSuggestions(value);
});

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentMousedown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMousedown);
  clearDebounceTimer();
  clearBlurTimer();
});

function clearDebounceTimer() {
  if (debounceTimer.value !== null) {
    window.clearTimeout(debounceTimer.value);
    debounceTimer.value = null;
  }
}

function clearBlurTimer() {
  if (blurTimer.value !== null) {
    window.clearTimeout(blurTimer.value);
    blurTimer.value = null;
  }
}

function scheduleSuggestions(keyword: string) {
  clearDebounceTimer();

  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    suggestions.value = [];
    highlightedIndex.value = -1;
    isPanelOpen.value = false;
    return;
  }

  debounceTimer.value = window.setTimeout(() => {
    void loadSuggestions(normalizedKeyword);
  }, props.debounceMs);
}

async function loadSuggestions(keyword: string) {
  const serial = requestSerial.value + 1;
  requestSerial.value = serial;

  try {
    const result = await fetchSearchSuggestions(keyword);
    if (requestSerial.value !== serial || keyword !== inputValue.value.trim()) {
      return;
    }

    suggestions.value = result.list;
    highlightedIndex.value = result.list.length > 0 ? 0 : -1;
    isPanelOpen.value = isFocused.value && result.list.length > 0;
  } catch {
    if (requestSerial.value !== serial) {
      return;
    }

    suggestions.value = [];
    highlightedIndex.value = -1;
    isPanelOpen.value = false;
  }
}

function handleFocus() {
  clearBlurTimer();
  isFocused.value = true;
  if (inputValue.value.trim() && suggestions.value.length > 0) {
    isPanelOpen.value = true;
  }
}

function handleBlur() {
  isFocused.value = false;
  clearBlurTimer();
  blurTimer.value = window.setTimeout(() => {
    closePanel();
  }, 180);
}

function handleDocumentMousedown(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (!rootRef.value?.contains(target)) {
    closePanel();
  }
}

function closePanel() {
  clearBlurTimer();
  isPanelOpen.value = false;
  highlightedIndex.value = -1;
}

function highlightNext() {
  if (suggestions.value.length === 0) {
    return;
  }

  isPanelOpen.value = true;
  highlightedIndex.value =
    highlightedIndex.value < suggestions.value.length - 1 ? highlightedIndex.value + 1 : 0;
}

function highlightPrevious() {
  if (suggestions.value.length === 0) {
    return;
  }

  isPanelOpen.value = true;
  highlightedIndex.value =
    highlightedIndex.value > 0 ? highlightedIndex.value - 1 : suggestions.value.length - 1;
}

function confirmSearch() {
  if (showPanel.value && highlightedIndex.value >= 0 && suggestions.value[highlightedIndex.value]) {
    searchWithSuggestion(suggestions.value[highlightedIndex.value]);
    return;
  }

  searchWithCurrentInput();
}

function searchWithSuggestion(value: string) {
  inputValue.value = value;
  suggestions.value = [];
  emit('update:modelValue', value);
  emit('search', value);
  closePanel();
}

function searchWithCurrentInput() {
  const keyword = inputValue.value.trim();

  if (!keyword) {
    closePanel();
    return;
  }

  emit('update:modelValue', keyword);
  emit('search', keyword);
  closePanel();
}
</script>

<style scoped>
.search-suggest-box {
  position: relative;
  width: 100%;
}

.search-row {
  display: flex;
  justify-content: center;
  width: 100%;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 500px;
  height: 40px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.377);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

.search-input-container:focus-within {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15);
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0 50px 0 16px;
  border: none;
  background: transparent;
  color: #ffffff;
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-icon-btn {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  transition: color 0.2s ease;
}

.search-icon-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.clear-btn {
  position: absolute;
  right: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: color 0.2s ease;
}

.clear-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.suggest-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 40;
  overflow: hidden;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.38);
  backdrop-filter: blur(14px);
}

.suggest-item {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border: 0;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.suggest-item:hover,
.suggest-item.active {
  background: rgba(59, 130, 246, 0.16);
  color: #ffffff;
}

.suggest-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
