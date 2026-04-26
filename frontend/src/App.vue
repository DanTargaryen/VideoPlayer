<template>
  <LoadingSplash v-if="booting" full-page />
  <RouterView v-else />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import LoadingSplash from '@/components/LoadingSplash.vue';
import router from '@/router';

const booting = ref(true);

onMounted(async () => {
  await router.isReady();
  window.setTimeout(() => {
    booting.value = false;
  }, 900);
});
</script>
