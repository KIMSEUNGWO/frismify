
<template>
  <div ref="modal" class="prismify-container" :data-is-fold="modalMin" :style="{ zIndex: baseZIndex + modalIndex }" @mousedown="bringToFront">
    <header class="prismify-header" @mousedown="onMouseDown">
      <div class="plugin-info">
        <div ref="iconContainer" class="plugin-icon-small"></div>
        <h3>{{ title }}</h3>
      </div>
      <div class="btn-list">
        <button type="button" class="arrange-btn" @click="arrangeModals" title="Arrange modals">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8h4V4H3v4zm6 12h4v-4H9v4zm-6 0h4v-4H3v4zm0-6h4v-4H3v4zm6 0h4v-4H9v4zm6-10v4h4V4h-4zm-6 4h4V4H9v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="min-btn" @click="modalMinToggle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 12.998H6C5.73478 12.998 5.48043 12.8926 5.29289 12.7051C5.10536 12.5176 5 12.2632 5 11.998C5 11.7328 5.10536 11.4784 5.29289 11.2909C5.48043 11.1034 5.73478 10.998 6 10.998H18C18.2652 10.998 18.5196 11.1034 18.7071 11.2909C18.8946 11.4784 19 11.7328 19 11.998C19 12.2632 18.8946 12.5176 18.7071 12.7051C18.5196 12.8926 18.2652 12.998 18 12.998Z"/>
          </svg>
        </button>
        <button type="button" class="close-btn" @click="modalClose">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"/></svg>
        </button>
      </div>
    </header>
    <RouterView id="modal-content" :isFold="modalMin" @disabledFold="disabledFold"/>
  </div>
</template>

<script setup lang="ts">

import {useRouter} from "vue-router";
import {modalManager} from "@/core/ModalManager";
import {PluginManager, pluginManagerProxy} from "@/core";
import {ref, computed, onMounted, onUnmounted, inject} from "vue";
import {allPlugins} from "@/plugins";

const pluginId: string = String(inject('pluginId'));

const router = useRouter();
const iconContainer = ref<HTMLDivElement>();
const title = ref('');
const modalMin = ref<boolean>(false);
const modalIndex = ref<number>(0);
const baseZIndex = 2147483645; // Base z-index for modals

const updateModalIndex = () => {
  modalIndex.value = modalManager.getModalIndex(pluginId);
};

const onStackChange = () => {
  updateModalIndex();
};

onMounted(() => {
  router.replace(`/${pluginId}`);
  const plugin = allPlugins.find(plugin => plugin.id === pluginId);
  title.value = plugin?.name ?? '';
  if (iconContainer.value) {
    plugin?.icon(iconContainer.value);
  }
  updateModalIndex();
  window.addEventListener('resize', snapBackIntoView);
  window.addEventListener('modal-stack-change', onStackChange);
})
onUnmounted(() => {
  window.removeEventListener('resize', snapBackIntoView);
  window.removeEventListener('modal-stack-change', onStackChange);
})

const bringToFront = () => {
  modalManager.bringToFront(pluginId);
};

const modalClose = () => modalManager.removeModal(pluginId);

const modalMinToggle = () => {
  modalMin.value = !modalMin.value;
}
const disabledFold = () => modalMin.value = false;

// --------------
// 정렬 로직
// --------------

const arrangeModals = (e: MouseEvent) => {
  e.stopPropagation(); // Prevent bringToFront from triggering
  modalManager.arrangeModals();
};

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
const MODAL_GAP = 10; // 모달 간 간격

const onMouseDown = (e: MouseEvent) => {
  if (!modal.value) return;

  // 버튼 클릭은 드래그 시작하지 않음
  if ((e.target as HTMLElement).closest('button')) return;

  const el = modal.value;

  isDragging = true;

  startX = e.clientX;
  startY = e.clientY;

  // 현 스타일 값을 정확히 사용 — rect 기반이 아님
  startRight = parseFloat(getComputedStyle(el).right);
  startTop = parseFloat(getComputedStyle(el).top);

  // 드래그 중 transition 비활성화 (부드러운 드래그)
  el.style.transition = 'none';

  // 전역 이벤트 리스너 등록
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave);

  // 텍스트 선택 방지
  e.preventDefault();
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

  // 이벤트 리스너 정리
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('mouseleave', onMouseLeave);

  snapBackIntoView();
}

const onMouseLeave = (e: MouseEvent) => {
  // 마우스가 document 밖으로 나갔을 때 (브라우저 창 밖)
  if (e.relatedTarget === null && isDragging) {
    onMouseUp();
  }
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

.prismify-container {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--bg-dark);
  z-index: 2147483645;
  padding: 20px;
  color: var(--font-color-1);
  border-radius: 21px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar for modal */
.prismify-container::-webkit-scrollbar {
  width: 8px;
}

.prismify-container::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0;
}

.prismify-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.prismify-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.prismify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  cursor: grab;
  user-select: none; /* 텍스트 선택 방지 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.prismify-header:active {
  cursor: grabbing;
}

.plugin-info {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  pointer-events: none; /* 드래그 시 텍스트 선택 방지 */
}

.plugin-info h3 {
  font-size: 14px;
  color: var(--font-color-1);
  font-weight: 500;
  white-space: nowrap;
}

.btn-list {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: right;
  pointer-events: auto; /* 버튼 클릭 가능하도록 */
}
.btn-list button {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer; /* 버튼 커서 */
}

.btn-list button svg {
  width: 60%;
  height: 60%;
  fill: var(--font-color-2);
}
.btn-list button:hover {
  background: var(--card-bg-hover);
}

.plugin-icon-small {
  width: 26px;
  height: 26px;
  border-radius: 6px;
}

#modal-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prismify-container[data-is-fold="true"] {
  .prismify-header {
    margin: 0;
  }
  #modal-content {
    display: none;
  }
}
</style>
