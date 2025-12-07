<script setup lang="ts">
import { ref, computed } from 'vue';

interface ThrottleProfile {
  id: string;
  name: string;
  description: string;
  downloadThroughput: number; // bytes per second
  uploadThroughput: number;   // bytes per second
  latency: number;             // milliseconds
}

const isThrottling = ref(false);
const selectedProfile = ref<string>('fast-3g');

const throttleProfiles: ThrottleProfile[] = [
  {
    id: 'gprs',
    name: 'GPRS',
    description: '50 Kbps',
    downloadThroughput: 50 * 1024 / 8,
    uploadThroughput: 20 * 1024 / 8,
    latency: 500,
  },
  {
    id: 'regular-2g',
    name: 'Regular 2G',
    description: '250 Kbps',
    downloadThroughput: 250 * 1024 / 8,
    uploadThroughput: 50 * 1024 / 8,
    latency: 300,
  },
  {
    id: 'good-2g',
    name: 'Good 2G',
    description: '450 Kbps',
    downloadThroughput: 450 * 1024 / 8,
    uploadThroughput: 150 * 1024 / 8,
    latency: 150,
  },
  {
    id: 'regular-3g',
    name: 'Regular 3G',
    description: '750 Kbps',
    downloadThroughput: 750 * 1024 / 8,
    uploadThroughput: 250 * 1024 / 8,
    latency: 100,
  },
  {
    id: 'good-3g',
    name: 'Good 3G',
    description: '1.5 Mbps',
    downloadThroughput: 1.5 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 40,
  },
  {
    id: 'fast-3g',
    name: 'Fast 3G',
    description: '1.6 Mbps',
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 768 * 1024 / 8,
    latency: 20,
  },
  {
    id: 'regular-4g',
    name: 'Regular 4G',
    description: '4 Mbps',
    downloadThroughput: 4 * 1024 * 1024 / 8,
    uploadThroughput: 3 * 1024 * 1024 / 8,
    latency: 20,
  },
  {
    id: 'dsl',
    name: 'DSL',
    description: '2 Mbps',
    downloadThroughput: 2 * 1024 * 1024 / 8,
    uploadThroughput: 1 * 1024 * 1024 / 8,
    latency: 5,
  },
  {
    id: 'wifi',
    name: 'WiFi',
    description: '30 Mbps',
    downloadThroughput: 30 * 1024 * 1024 / 8,
    uploadThroughput: 15 * 1024 * 1024 / 8,
    latency: 2,
  },
];

const currentProfile = computed(() => {
  return throttleProfiles.find(p => p.id === selectedProfile.value) || throttleProfiles[5];
});

const startThrottling = async () => {
  if (isThrottling.value) {
    stopThrottling();
    return;
  }

  const profile = currentProfile.value;

  try {
    // Send message to Background Script (chrome.debugger는 Background에서만 작동)
    const { MessageType } = await import('@/core/InstanceManager');
    const response = await chrome.runtime.sendMessage({
      type: MessageType.START_NETWORK_THROTTLE,
      downloadThroughput: profile.downloadThroughput,
      uploadThroughput: profile.uploadThroughput,
      latency: profile.latency,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to start throttling');
    }

    isThrottling.value = true;

    console.log('[Accessibility] Network throttling started:', profile.name);
    console.log('Download:', formatSpeed(profile.downloadThroughput));
    console.log('Upload:', formatSpeed(profile.uploadThroughput));
    console.log('Latency:', profile.latency, 'ms');

    const { toastManager } = await import('@/core/ToastManager');
    toastManager.success(
      `Network throttling enabled: ${profile.name}`,
      3000,
      'accessibility'
    );
  } catch (error) {
    console.error('[Accessibility] Failed to start network throttling:', error);

    const { toastManager } = await import('@/core/ToastManager');
    toastManager.error(
      'Failed to enable network throttling',
      5000,
      'accessibility'
    );
  }
};

const stopThrottling = async () => {
  if (!isThrottling.value) return;

  try {
    // Send message to Background Script
    const { MessageType } = await import('@/core/InstanceManager');
    const response = await chrome.runtime.sendMessage({
      type: MessageType.STOP_NETWORK_THROTTLE,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to stop throttling');
    }

    isThrottling.value = false;

    console.log('[Accessibility] Network throttling stopped');

    const { toastManager } = await import('@/core/ToastManager');
    toastManager.success('Network throttling disabled', 2000, 'accessibility');
  } catch (error) {
    console.error('[Accessibility] Failed to stop network throttling:', error);
    isThrottling.value = false;
  }
};

const changeProfile = (profileId: string) => {
  selectedProfile.value = profileId;

  if (isThrottling.value) {
    // Restart with new profile
    stopThrottling();
    startThrottling();
  }
};

const formatSpeed = (bytesPerSecond: number): string => {
  const kbps = (bytesPerSecond * 8) / 1024;
  if (kbps < 1024) {
    return `${kbps.toFixed(0)} Kbps`;
  }
  const mbps = kbps / 1024;
  return `${mbps.toFixed(1)} Mbps`;
};
</script>

<template>
  <div class="network-throttle-tab">
    <!-- Controls -->
    <div class="controls">
      <button
        class="throttle-button"
        :class="{ active: isThrottling }"
        @click="startThrottling"
      >
        <svg v-if="!isThrottling" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        {{ isThrottling ? 'Stop Throttling' : 'Start Throttling' }}
      </button>
    </div>

    <!-- Profile Selection -->
    <div class="profile-selection">
      <h3>Network Profile</h3>
      <div class="profile-grid">
        <div
          v-for="profile in throttleProfiles"
          :key="profile.id"
          class="profile-card"
          :class="{
            active: selectedProfile === profile.id,
            slow: profile.downloadThroughput < 100000,
            medium: profile.downloadThroughput >= 100000 && profile.downloadThroughput < 1000000,
            fast: profile.downloadThroughput >= 1000000
          }"
          @click="changeProfile(profile.id)"
        >
          <div class="profile-header">
            <h4>{{ profile.name }}</h4>
            <div v-if="selectedProfile === profile.id" class="check-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <p class="profile-description">{{ profile.description }}</p>
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-label">↓</span>
              <span class="stat-value">{{ formatSpeed(profile.downloadThroughput) }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">↑</span>
              <span class="stat-value">{{ formatSpeed(profile.uploadThroughput) }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">⏱</span>
              <span class="stat-value">{{ profile.latency }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Profile Info -->
    <div v-if="isThrottling" class="info-panel">
      <div class="info-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Throttling Active</span>
      </div>
      <p>
        Simulating <strong>{{ currentProfile.name }}</strong> network conditions.
      </p>
      <div class="network-details">
        <div class="detail-row">
          <span class="detail-label">Download Speed:</span>
          <span class="detail-value">{{ formatSpeed(currentProfile.downloadThroughput) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Upload Speed:</span>
          <span class="detail-value">{{ formatSpeed(currentProfile.uploadThroughput) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Latency:</span>
          <span class="detail-value">{{ currentProfile.latency }}ms</span>
        </div>
      </div>
      <p class="info-note">
        Note: For accurate network throttling, use Chrome DevTools (F12 → Network tab). Browser extensions have limited access to network controls.
      </p>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <p>Network Throttling</p>
      <span>Test how your website performs on slower network connections</span>
    </div>
  </div>
</template>

<style scoped>
.network-throttle-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Controls */
.controls {
  display: flex;
  gap: 12px;
}

.throttle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: var(--gradient-point);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.throttle-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.throttle-button.active {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
}

.throttle-button.active:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
}

/* Profile Selection */
.profile-selection h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.profile-card {
  padding: 12px;
  background: var(--card-bg-color);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-card:hover {
  background: var(--card-bg-hover);
  transform: translateY(-2px);
}

.profile-card.active {
  border-color: var(--purple);
  background: var(--card-bg-hover);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.profile-card.slow {
  border-left: 3px solid #ef4444;
}

.profile-card.medium {
  border-left: 3px solid #f59e0b;
}

.profile-card.fast {
  border-left: 3px solid #10b981;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.profile-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--font-color-1);
}

.check-icon {
  color: var(--purple);
}

.profile-description {
  margin: 0 0 8px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--font-color-2);
}

.profile-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.stat-label {
  color: var(--font-color-2);
  font-weight: 600;
}

.stat-value {
  color: var(--font-color-1);
  font-size: 9px;
}

/* Info Panel */
.info-panel {
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--purple);
}

.info-panel p {
  margin: 0 0 12px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--font-color-1);
}

.network-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-label {
  color: var(--font-color-2);
  font-weight: 500;
}

.detail-value {
  color: var(--font-color-1);
  font-weight: 600;
}

.info-note {
  font-size: 11px;
  color: var(--font-color-2);
  font-style: italic;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #999;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--font-color-1);
}

.empty-state span {
  font-size: 12px;
  line-height: 1.5;
  color: var(--font-color-2);
}
</style>