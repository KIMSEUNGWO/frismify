
<template>
  <div ref="modal" class="frismify-container">
    <header class="frismify-header" @mousedown="onMouseDown">
      <div class="plugin-info">
        <div ref="iconContainer" class="plugin-icon-small"></div>
        <h3>{{ title }}</h3>
      </div>
      <button type="button" class="close-btn" @click="modalClose">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"/></svg>
      </button>
    </header>
    <RouterView/>
  </div>
</template>

<script setup lang="ts">

import {useRouter} from "vue-router";
import {modalManager} from "@/core/ModalManager";
import {PluginManager} from "@/core";
import {ref} from "vue";

const pluginId: string = String(inject('pluginId'));

const manager = PluginManager.getInstance();

const router = useRouter();
const iconContainer = ref<HTMLDivElement>();
const title = ref('');

onMounted(() => {
  router.replace(`/${pluginId}`);
  const plugin = manager.get(pluginId);
  title.value = plugin?.name ?? '';
  if (iconContainer.value) {
    plugin?.icon(iconContainer.value);
  }
  window.addEventListener('resize', snapBackIntoView);
})
onUnmounted(() => {
  window.removeEventListener('resize', snapBackIntoView);
})


const modalClose = () => modalManager.removeModal();

// --------------
// 드래그 모달 로직
// --------------

const modal = ref<HTMLElement | null>();
let isDragging = false;
let startX = 0;
let startY = 0;
let startRight = 0;
let startTop = 0;

const PADDING = 20; // 화면 패딩

const onMouseDown = (e: MouseEvent) => {
  if (!modal.value) return;

  const el = modal.value;

  isDragging = true;

  startX = e.clientX;
  startY = e.clientY;

  // 현 스타일 값을 정확히 사용 — rect 기반이 아님
  startRight = parseFloat(getComputedStyle(el).right);
  startTop = parseFloat(getComputedStyle(el).top);

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging || !modal.value) return;

  const el = modal.value;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  el.style.right = `${startRight - dx}px`;
  el.style.top = `${startTop + dy}px`;
}

const onMouseUp = () => {
  if (!modal.value) return;
  isDragging = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  snapBackIntoView();
}

const snapBackIntoView = () => {
  if (!modal.value) return;
  const el = modal.value;

  const rect = el.getBoundingClientRect();
  const computed = getComputedStyle(el);

  let currentRight = parseFloat(computed.right);
  let currentTop = parseFloat(computed.top);

  const maxTop = window.innerHeight - rect.height - PADDING;

  // 1) Right boundary
  if (rect.right > window.innerWidth - PADDING) {
    currentRight = PADDING;
  }
  // 2) Left boundary
  if (rect.left < PADDING) {
    currentRight = window.innerWidth - rect.width - PADDING;
  }

  // 3) Top/Bottom boundary
  if (rect.top < PADDING) currentTop = PADDING;
  if (rect.bottom > window.innerHeight - PADDING)
    currentTop = maxTop;

  // Transition 적용
  el.style.transition = "all 0.2s ease";
  el.style.right = `${currentRight}px`;
  el.style.top = `${currentTop}px`;

  setTimeout(() => {
    el.style.transition = "";
  }, 200);
}

</script>

<style scoped>

.frismify-container {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--bg-dark);
  z-index: 999;
  padding: 20px;
  color: var(--font-color-1);
  border-radius: 21px;
  max-height: calc(100vh - 40px);

}

.frismify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  cursor: grabbing;
}
.plugin-info {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}
.plugin-info h3 {
  font-size: 14px;
  color: var(--font-color-1);
  font-weight: 500;

}
.close-btn {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn svg {
  width: 60%;
  height: 60%;
  fill: var(--font-color-2);
}
.close-btn:hover {
  background: var(--card-bg-hover);
}

.plugin-icon-small {
  width: 26px;
  height: 26px;
  border-radius: 6px;
}
</style>
