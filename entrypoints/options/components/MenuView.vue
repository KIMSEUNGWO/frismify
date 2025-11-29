<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from "vue-router";

const route = useRoute();
const isFold = ref(false);

// Fold 토글
const toggleFold = () => {
  isFold.value = !isFold.value;
};

// Fold 상태 변경 시 body에 클래스 추가/제거
watch(isFold, (newValue) => {
  if (newValue) {
    document.body.classList.add('sidebar-folded');
  } else {
    document.body.classList.remove('sidebar-folded');
  }
}, { immediate: true });

// 화면 크기에 따라 자동 fold (1024px 이하)
const handleResize = () => {
  isFold.value = window.innerWidth <= 1024;
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
});

</script>

<template>
  <aside :data-is-fold="isFold">
    <div class="aside-top">
      <button class="fold-btn" @click="toggleFold">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.5 18V6C20.5 5.72386 20.2761 5.5 20 5.5H8.75V18.5H20V20H4V18.5H7.25V5.5H4C3.72386 5.5 3.5 5.72386 3.5 6V18C3.5 18.2761 3.72386 18.5 4 18.5V20L3.7959 19.9893C2.78722 19.887 2 19.0357 2 18V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20V18.5C20.2761 18.5 20.5 18.2761 20.5 18Z" fill="#94A3B8"/>
        </svg>
      </button>
      <img src="/logo.svg" width="36px" height="36px" alt="logo" class="logo"/>
    </div>
    <div class="menu-container">
      <div class="group-menu main">
        <h3>main</h3>
        <div class="menu-list">
          <RouterLink to="/" class="menu" :class="{ 'active': route.path === '/' }">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6.91553C4 5.54096 4 4.85367 4.42778 4.42761C4.85322 4 5.54078 4 6.91667 4C8.29256 4 8.97933 4 9.40556 4.42761C9.83333 4.85367 9.83333 5.54096 9.83333 6.91553C9.83333 8.29011 9.83333 8.9774 9.40556 9.40345C8.97933 9.83107 8.29178 9.83107 6.91667 9.83107C5.54156 9.83107 4.854 9.83107 4.42778 9.40345C4 8.97817 4 8.29089 4 6.91553ZM4 15.0845C4 13.7099 4 13.0226 4.42778 12.5965C4.854 12.1689 5.54156 12.1689 6.91667 12.1689C8.29178 12.1689 8.97933 12.1689 9.40556 12.5965C9.83333 13.0226 9.83333 13.7099 9.83333 15.0845C9.83333 16.459 9.83333 17.1463 9.40556 17.5724C8.97933 18 8.29178 18 6.91667 18C5.54156 18 4.854 18 4.42778 17.5724C4 17.1471 4 16.459 4 15.0845ZM12.1667 6.91553C12.1667 5.54096 12.1667 4.85367 12.5944 4.42761C13.0207 4 13.7082 4 15.0833 4C16.4584 4 17.146 4 17.5722 4.42761C18 4.85367 18 5.54096 18 6.91553C18 8.29011 18 8.9774 17.5722 9.40345C17.146 9.83107 16.4584 9.83107 15.0833 9.83107C13.7082 9.83107 13.0207 9.83107 12.5944 9.40345C12.1667 8.9774 12.1667 8.29011 12.1667 6.91553ZM12.1667 15.0845C12.1667 13.7099 12.1667 13.0226 12.5944 12.5965C13.0207 12.1689 13.7082 12.1689 15.0833 12.1689C16.4584 12.1689 17.146 12.1689 17.5722 12.5965C18 13.0226 18 13.7099 18 15.0845C18 16.459 18 17.1463 17.5722 17.5724C17.146 18 16.4584 18 15.0833 18C13.7082 18 13.0207 18 12.5944 17.5724C12.1667 17.1463 12.1667 16.459 12.1667 15.0845Z" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="menu-name">Dashboard</span>
          </RouterLink>
          <RouterLink to="/tools" class="menu" :class="{ 'active': route.path.startsWith('/tools') }">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.2257 6.29972C13.0746 6.4539 12.9899 6.66119 12.9899 6.87708C12.9899 7.09298 13.0746 7.30027 13.2257 7.45445L14.5454 8.77414C14.6996 8.92527 14.9069 9.00992 15.1228 9.00992C15.3387 9.00992 15.546 8.92527 15.7002 8.77414L18.2621 6.21311C18.5261 5.94753 18.9739 6.03166 19.0729 6.39292C19.3221 7.29928 19.308 8.25787 19.0323 9.15652C18.7566 10.0552 18.2306 10.8567 17.516 11.4673C16.8013 12.078 15.9275 12.4724 14.9968 12.6046C14.0661 12.7368 13.1171 12.6011 12.2607 12.2136L5.73626 18.7378C5.40813 19.0658 4.96312 19.2501 4.49914 19.25C4.03516 19.2499 3.59022 19.0655 3.26219 18.7374C2.93416 18.4093 2.74992 17.9643 2.75 17.5003C2.75008 17.0364 2.93447 16.5914 3.2626 16.2634L9.787 9.73917C9.39945 8.88278 9.26381 7.93373 9.39597 7.00307C9.52813 6.07241 9.92262 5.19864 10.5333 4.484C11.1439 3.76936 11.9455 3.2434 12.8441 2.96768C13.7428 2.69196 14.7014 2.67788 15.6078 2.92708C15.9691 3.02606 16.0532 3.4731 15.7884 3.73869L13.2257 6.29972Z" stroke="#94A3B8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="menu-name">Tools</span>
          </RouterLink>
          <RouterLink to="/shortcuts" class="menu" :class="{ 'active': route.path.startsWith('/shortcuts') }">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.24999 6.41668L8.24998 15.5834C8.24998 16.5959 7.42917 17.4167 6.41665 17.4167C5.40413 17.4167 4.58332 16.5959 4.58332 15.5833C4.58333 14.5708 5.40414 13.75 6.41666 13.75H15.5833C16.5958 13.75 17.4166 14.5708 17.4166 15.5833C17.4166 16.5959 16.5958 17.4167 15.5833 17.4167C14.5708 17.4167 13.75 16.5959 13.75 15.5833V6.41668C13.75 5.40416 14.5708 4.58334 15.5833 4.58334C16.5958 4.58334 17.4166 5.40416 17.4166 6.41669C17.4166 7.4292 16.5958 8.25001 15.5833 8.25001H6.41665C5.40412 8.25001 4.58331 7.4292 4.58331 6.41668C4.58331 5.40415 5.40413 4.58334 6.41665 4.58334C7.42918 4.58334 8.24999 5.40416 8.24999 6.41668Z" stroke="#94A3B8"/>
            </svg>
            <span class="menu-name">Shortcuts</span>
          </RouterLink>
        </div>
      </div>
      <div class="group-menu">
        <h3>support</h3>
      </div>
    </div>
    <div class="aside-bottom">
      <div class="profile-box">
        <div class="profile">
          <img src="/profile/P1.png" class="profile-img" alt="profile"/>
          <div class="profile-info">
            <h3 class="profile-name">Seungwoo Kim</h3>
            <span class="profile-tier">Free Tier</span>
          </div>
        </div>
        <button class="profile-more-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="#94A3B8" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
aside {
  width: 260px;
  background-color: var(--bg-darker);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease-in-out;
  overflow: hidden;
}

/* Fold 상태 */
aside[data-is-fold="true"] {
  width: 70px;
}
aside[data-is-fold="true"] {
  .logo, .menu-name, .group-menu h3, .profile-box { display: none; }
  .menu {
    padding: 8px;
    justify-content: center;
  }
  .aside-top {
    padding: 21px 16px !important;
  }
}

.aside-top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 20px 16px 24px;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
}

.fold-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
}

.fold-btn svg {
  transition: transform 0.3s ease-in-out;
}

/* Fold 상태일 때 아이콘 회전 */
aside[data-is-fold="true"] .fold-btn svg {
  transform: rotate(180deg);
}

.fold-btn:hover {
  background: var(--card-bg-hover);
}

.menu-container {
  padding: 26px 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 21px;
}

.group-menu > h3 {
  margin-left: 8px;
  margin-bottom: 8px;
  color: var(--font-color-2);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.menu {
  border-radius: 8px;
  padding: 11px 8px;
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 8px;
}
.menu svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.menu-name {
  font-size: 14px;
  color: var(--font-color-2);
  font-weight: 400;
  overflow: hidden;
}

.menu:hover {
  background-color: var(--card-bg-hover);
}

.menu.active {
  background: var(--gradient-point);
}
.menu.active .menu-name {
  font-weight: 600;
  color: var(--font-color-1);
}
.menu.active path {
  stroke: white;
}

.aside-bottom {
  padding: 16px;
}
.profile-box {
  border-radius: 8px;
  background-color: var(--card-bg-color);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.profile {
  display: flex;
  align-items: center;
}
.profile-info {
  flex-grow: 1;
}
.profile-img {
  width: 36px;
  height: 36px;
  margin-right: 12px;
  border-radius: 100%;
}
.profile-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--font-color-1);
}
.profile-tier {
  font-size: 12px;
  font-weight: 400;
  color: var(--font-color-2);
}

.profile-more-btn {
  width: 21px;
  height: 21px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}
.profile-more-btn:hover {
  background: var(--card-bg-hover);
}

/* 반응형은 JS로 자동 처리 */
</style>