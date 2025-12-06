<template>
  <div class="image-converter-modal">
    <!-- Drop Zone -->
    <div
        class="drop-zone"
        @click="triggerFileInput"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        :class="{ 'drag-over': isDragging, 'has-files': files.length > 0 }"
    >
      <svg v-if="files.length === 0" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="drop-title">{{ files.length === 0 ? '이미지 파일을 드래그하거나 클릭하세요' : `${files.length}개 파일 선택됨` }}</p>
      <p class="drop-subtitle">PNG, JPEG, WebP, SVG 지원</p>
      <input
          type="file"
          multiple
          ref="fileInputRef"
          accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
          @change="handleFilesSelect"
      />
    </div>

    <!-- Format Selection -->
    <div v-if="files.length > 0" class="format-section">
      <h4 class="section-title">변환 형식</h4>
      <div class="format-pills">
        <button
            v-for="format in formats"
            :key="format.value"
            class="format-pill"
            :class="{ active: targetFormat === format.value }"
            @click="targetFormat = format.value"
        >
          <span class="format-icon">{{ format.icon }}</span>
          <span class="format-label">{{ format.label }}</span>
        </button>
      </div>
    </div>

    <!-- File List -->
    <div v-if="files.length > 0" class="file-list">
      <div class="file-list-header">
        <h4 class="section-title">파일 목록</h4>
        <button
            v-if="hasCompletedFiles"
            class="clear-button"
            @click="clearFiles"
            title="모두 지우기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="file-items">
        <div v-for="(file, index) in files" :key="index" class="file-item" :class="`status-${file.status}`">
          <div class="file-info">
            <div class="file-icon">
              <svg v-if="file.status === '대기 중'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                <path d="M3 15L8 10L12 14L16 10L21 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="file.status === '변환 중'" width="20" height="20" viewBox="0 0 24 24" fill="none" class="spinner">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="file.status === '완료'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="file.status === '실패'" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="file-details">
              <p class="file-name">{{ file.name }}</p>
              <p class="file-status">{{ file.status }}</p>
            </div>
          </div>
          <a
              v-if="file.downloadUrl && file.status === '완료'"
              :href="file.downloadUrl"
              :download="file.newName"
              class="download-link"
              title="다운로드"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div v-if="files.length > 0" class="action-footer">
      <button
          v-if="!allFilesCompleted"
          class="convert-button"
          @click="startConversion"
          :disabled="isConverting || !targetFormat"
      >
        <svg v-if="!isConverting" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div v-else class="button-spinner"></div>
        {{ isConverting ? '변환 중...' : `일괄 변환 시작 (${files.length}개)` }}
      </button>
      <button
          v-else
          class="download-all-button"
          @click="downloadAllAsZip"
          :disabled="isZipping"
      >
        <svg v-if="!isZipping" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div v-else class="button-spinner"></div>
        {{ isZipping ? '압축 중...' : `전체 다운로드 (${completedFilesCount}개)` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 처리할 파일 목록 및 상태를 관리하는 인터페이스 정의
interface ProcessedFile {
  name: string;
  status: '대기 중' | '변환 중' | '완료' | '실패';
  downloadUrl: string | null;
  newName: string | null;
  originalFile: File;
}

// 지원 형식
const formats = [
  { label: 'PNG', value: 'image/png', icon: '🖼️' },
  { label: 'JPEG', value: 'image/jpeg', icon: '📷' },
  { label: 'WebP', value: 'image/webp', icon: '🌐' },
  { label: 'SVG', value: 'image/svg+xml', icon: '✨' },
];

const files = ref<ProcessedFile[]>([]);
const targetFormat = ref<string>('image/png');
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isConverting = ref(false);
const isZipping = ref(false);

const hasCompletedFiles = computed(() => files.value.some(f => f.status === '완료'));
const completedFilesCount = computed(() => files.value.filter(f => f.status === '완료').length);
const allFilesCompleted = computed(() => {
  return files.value.length > 0 && files.value.every(f => f.status === '완료' || f.status === '실패');
});

// 파일 목록 초기화
const clearFiles = () => {
  files.value.forEach(file => {
    if (file.downloadUrl) {
      URL.revokeObjectURL(file.downloadUrl);
    }
  });
  files.value = [];
};

// 일괄 변환 시작 (3개씩 동시 처리)
const startConversion = async () => {
  if (files.value.length === 0 || !targetFormat.value || isConverting.value) return;

  isConverting.value = true;

  const BATCH_SIZE = 3; // 동시에 처리할 파일 개수
  const pendingFiles = files.value.filter(f => f.status !== '완료' && f.status !== '실패');

  for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
    const batch = pendingFiles.slice(i, i + BATCH_SIZE);

    // 배치 단위로 병렬 처리
    await Promise.all(
      batch.map(async (file) => {
        file.status = '변환 중';

        try {
          await convertFile(file, targetFormat.value);
          file.status = '완료';
        } catch (error) {
          file.status = '실패';
          console.error(`변환 실패: ${file.name}`, error);
        }
      })
    );
  }

  isConverting.value = false;
};

// 개별 파일 변환 로직
const convertFile = (file: ProcessedFile, format: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // SVG는 특별 처리 (blob으로 직접 다운로드)
    if (format === 'image/svg+xml') {
      if (file.originalFile.type === 'image/svg+xml') {
        // SVG → SVG: 그냥 복사
        file.downloadUrl = URL.createObjectURL(file.originalFile);
        file.newName = file.name;
        resolve();
        return;
      } else {
        // 다른 형식 → SVG는 지원하지 않음
        reject(new Error('SVG로 변환은 지원하지 않습니다'));
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // JPEG의 경우 흰색 배경 추가 (투명도 지원 안 함)
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            file.downloadUrl = URL.createObjectURL(blob);
            const extension = format.split('/')[1].replace('jpeg', 'jpg');
            file.newName = file.name.replace(/\.[^/.]+$/, "") + '.' + extension;
            resolve();
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, format, 0.92); // 품질 92%
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file.originalFile);
  });
};

// 파일 입력 트리거
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

// 파일 처리
const processUploadedFiles = (fileList: FileList) => {
  const acceptedFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));

  files.value = acceptedFiles.map(file => ({
    name: file.name,
    status: '대기 중',
    downloadUrl: null,
    newName: null,
    originalFile: file,
  }));
};

// 이벤트 핸들러
const handleFilesSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    processUploadedFiles(input.files);
  }
};

const handleDragOver = () => {
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    processUploadedFiles(event.dataTransfer.files);
  }
};

// ZIP으로 일괄 다운로드
const downloadAllAsZip = async () => {
  if (isZipping.value || completedFilesCount.value === 0) return;

  isZipping.value = true;

  try {
    // JSZip 동적 import
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // 완료된 파일만 ZIP에 추가
    const completedFiles = files.value.filter(f => f.status === '완료' && f.downloadUrl);

    for (const file of completedFiles) {
      if (!file.downloadUrl || !file.newName) continue;

      // Blob URL에서 실제 Blob 가져오기
      const response = await fetch(file.downloadUrl);
      const blob = await response.blob();

      // ZIP에 파일 추가
      zip.file(file.newName, blob);
    }

    // ZIP 생성
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // 다운로드 트리거
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-images-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('ZIP 생성 실패:', error);
    alert('ZIP 파일 생성에 실패했습니다.');
  } finally {
    isZipping.value = false;
  }
};
</script>

<style scoped>
.image-converter-modal {
  min-width: 520px;
  max-width: 600px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  flex: 1;
}

/* Drop Zone */
.drop-zone {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  background: var(--card-bg-color);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drop-zone input[type="file"] {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.drop-zone svg {
  color: var(--font-color-2);
  opacity: 0.6;
  transition: all 0.3s ease;
}

.drop-zone:hover {
  background: var(--card-bg-hover);
  border-color: var(--purple);
}

.drop-zone:hover svg {
  color: var(--purple);
  opacity: 1;
  transform: translateY(-2px);
}

.drop-zone.drag-over {
  background: var(--card-bg-hover);
  border-color: var(--purple);
  border-style: solid;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}

.drop-zone.has-files {
  padding: 20px;
  border-style: solid;
  border-color: var(--purple);
}

.drop-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--font-color-1);
  margin: 0;
}

.drop-subtitle {
  font-size: 13px;
  color: var(--font-color-2);
  margin: 0;
}

/* Format Selection */
.format-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.format-pills {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.format-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--card-bg-color);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-2);
}

.format-pill:hover {
  background: var(--card-bg-hover);
  border-color: var(--purple);
  transform: translateY(-1px);
}

.format-pill.active {
  background: var(--purple);
  border-color: var(--purple);
  color: #fff;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.format-icon {
  font-size: 24px;
  line-height: 1;
}

.format-label {
  font-size: 12px;
  font-weight: 600;
}

/* File List */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--card-bg-color);
  border: none;
  border-radius: 6px;
  color: var(--font-color-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: var(--red);
  color: #fff;
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.file-items::-webkit-scrollbar {
  width: 6px;
}

.file-items::-webkit-scrollbar-track {
  background: transparent;
}

.file-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--card-bg-color);
  border-radius: 10px;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-item:hover {
  background: var(--card-bg-hover);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 8px;
  color: var(--purple);
}

.file-item.status-완료 .file-icon {
  background: rgba(34, 197, 94, 0.1);
  color: var(--green);
}

.file-item.status-실패 .file-icon {
  background: rgba(236, 72, 75, 0.1);
  color: var(--red);
}

.file-item.status-변환중 .file-icon {
  background: rgba(6, 182, 212, 0.1);
  color: var(--cyan);
}

.file-icon .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--font-color-1);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-status {
  font-size: 11px;
  color: var(--font-color-2);
  margin: 0;
}

.file-item.status-완료 .file-status {
  color: var(--green);
}

.file-item.status-실패 .file-status {
  color: var(--red);
}

.file-item.status-변환중 .file-status {
  color: var(--cyan);
}

.download-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--card-bg-color);
  border-radius: 8px;
  color: #fff;
  text-decoration: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.download-link:hover {
  transform: translateY(-2px);
  background: var(--card-bg-hover);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

/* Action Footer */
.action-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.convert-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
}

.convert-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
}

.convert-button:active:not(:disabled) {
  transform: translateY(0);
}

.convert-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.button-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.download-all-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);
}

.download-all-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.5);
}

.download-all-button:active:not(:disabled) {
  transform: translateY(0);
}

.download-all-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>