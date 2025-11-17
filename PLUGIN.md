# 플러그인 v2

# 통합된 플러그인 목록

## 🆓 Free Tier - 핵심 4개 플러그인

### 1. 🎨 CSS Spy (통합 디자인 검사 도구)

**통합된 기능:**

- CSS Spy (CSS 속성 검사)
- Font Inspector (폰트 분석)
- Spacing Inspector (여백 시각화)
- Shadow & Effect Inspector (그림자/효과)
- Border & Radius Inspector (테두리)
- Animation Inspector (애니메이션)

**주요 기능:**

- 🔍 **실시간 요소 검사**: 마우스 호버로 모든 스타일 확인
- 📐 **Spacing 시각화**: Margin(주황), Padding(초록) 하이라이트
- ✨ **Effect 분석**: Shadow, Filter, Transform 검사
- 🎬 **Animation 제어**: 애니메이션 재생/일시정지/느리게
- 🎨 **스타일 복사**: 단일/전체 CSS 복사, 포맷 선택
- 🔠 **Typography**: 폰트, 크기, 두께, 줄간격 분석

**단축키:** `⌘⇧I` (Inspector 통합 단축키)

---

### 2. 🌈 Color Suite (색상 도구 모음)

**통합된 기능:**

- Color Picker (색상 추출)
- Gradient Generator (그라데이션)
- Color Palette (팔레트 관리)

**주요 기능:**

- 🎨 **정밀 색상 추출**: 픽셀 단위 + 확대경 (2x~8x)
- 🌈 **그라데이션**: 추출 + 생성 + CSS 코드
- 🎯 **포맷 변환**: HEX, RGB, HSL, CMYK, HSB
- 📚 **히스토리 & 컬렉션**: 추출한 색상 저장/관리
- 🎨 **페이지 팔레트**: 사용된 모든 색상 자동 추출
- ♿ **접근성 체크**: WCAG 대비율 계산, 색맹 시뮬레이션
- 🎭 **색상 조화**: 보색, 유사색, 삼색 조화 제안

**단축키:** `⌘⇧P` (Picker), `⌘⇧G` (Gradient)

---

### 3. 📏 Ruler & Grid (측정 및 그리드)

**통합된 기능:**

- Ruler (측정 도구)
- Grid Overlay (그리드 오버레이)

**주요 기능:**

**측정 (Ruler)**

- 📐 요소 크기 자동 측정 (Width × Height)
- 📏 요소 간 거리 측정 (상하좌우)
- 🎯 정밀 모드 (픽셀 단위)
- 📊 Box Model 시각화 (Content, Padding, Border, Margin)
- 🔢 단위 변환 (px, %, vw/vh, rem, em, pt, inch/cm)

**그리드 (Grid Overlay)**

- 📐 다양한 그리드: 12/16/24 Column, 8pt, Baseline, Golden Ratio
- 🎨 커스터마이징: 색상, 투명도, 선 스타일
- 📱 반응형 그리드: 브레이크포인트별 자동 전환
- ✅ 정렬 체크: 요소-그리드 정렬 검증
- 📚 프리셋: Bootstrap, Material, Tailwind, Foundation

**단축키:** `⌘⇧R` (Ruler), `⌘⇧G` (Grid)

---

### 4. 🏗️ Layout Analyzer (레이아웃 분석기)

**기존 단독 기능 유지**

**주요 기능:**

- 🔲 Flexbox 컨테이너/아이템 하이라이트
- 🎯 Grid 라인 및 셀 표시
- 📊 Gap, Align, Justify 값 오버레이
- 🌳 레이아웃 구조 트리뷰
- 📏 중첩 depth 표시

**단축키:** `⌘⇧L`

---

## 💎 Pro Tier - 프리미엄 11개 플러그인

### 5. 💻 Code Inspector (코드 분석 통합)

**통합된 기능:**

- HTML Structure Viewer
- JavaScript Detector
- CSS Extractor
- Console Spy

**주요 기능:**

- 🌳 **DOM 트리**: 계층적 구조, 시맨틱 태그 하이라이트
- 🔍 **JS 분석**: 로드된 스크립트, 라이브러리 감지 (React, Vue, jQuery)
- 📋 **CSS 추출**: 컴포넌트 단위 CSS, SCSS/Tailwind 변환
- 🐛 **Console 오버레이**: 떠다니는 미니 콘솔, 실시간 에러 캐치
- 🔒 **보안 이슈**: eval, innerHTML 사용 감지

**단축키:** `⌘⇧H` (HTML), `⌘⇧J` (Console)

---

### 6. 🖼️ Asset Manager (에셋 관리)

**통합된 기능:**

- Image Optimizer
- Image Extractor
- Link Checker

**주요 기능:**

- 🖼️ **이미지 분석**: 파일 크기, 포맷, WebP/AVIF 변환 제안
- ⚡ **최적화 제안**: Lazy loading, Retina 대응, Alt 텍스트 체크
- 📦 **에셋 추출**: 이미지, SVG, 아이콘, Favicon 일괄 다운로드
- 🔗 **링크 검사**: 깨진 링크(404), 외부/내부 구분, nofollow 체크

**단축키:** `⌘⇧O`

---

### 7. 🎨 Design System Tools (디자인 시스템)

**통합된 기능:**

- Design Token Extractor
- Component Library Builder
- Style Guide Generator
- Pattern Library

**주요 기능:**

- 🎯 **토큰 추출**: 색상, 타이포, Spacing, Shadow 자동 생성
- 🧱 **컴포넌트 빌더**: 재사용 컴포넌트 저장, React/Vue/HTML 코드 생성
- 📘 **스타일 가이드**: 자동 문서화, HTML/PDF 생성
- 🔲 **패턴 라이브러리**: 스트라이프, 도트, 체크, 기하학 패턴

**단축키:** `⌘⌥T` (Token), `⌘⌥C` (Component)

---

### 8. ♿ Accessibility Suite (접근성 도구)

**통합된 기능:**

- Accessibility Checker
- Color Blindness Simulator
- Focus Indicator

**주요 기능:**

- ✅ **WCAG 검사**: 색상 대비, Alt 텍스트, ARIA, 제목 계층
- 👁️ **색맹 시뮬레이션**: Protanopia, Deuteranopia, Tritanopia
- 🎯 **포커스**: Tab 순서, 포커스 링, 키보드 트랩 감지
- 📊 **접근성 점수**: 0-100점 평가

**단축키:** `⌘⇧1`

---

### 9. ⚡ SEO & Performance (SEO 및 성능)

**통합된 기능:**

- SEO Inspector
- Performance Monitor
- Lighthouse Mini

**주요 기능:**

- 🔍 **SEO 검사**: Title, Meta, Open Graph, Schema.org
- ⚡ **성능 측정**: Core Web Vitals (LCP, FID, CLS)
- 🏠 **Lighthouse**: 간소화된 감사, 주요 이슈만 표시
- 📊 **리소스 분석**: JS/CSS/이미지 크기, 렌더 블로킹

**단축키:** `⌘⇧4`

---

### 10. 📱 Responsive Tools (반응형 테스트)

**통합된 기능:**

- Device Simulator
- Breakpoint Tester
- Touch Gesture Tester
- Network Throttler

**주요 기능:**

- 📱 **디바이스**: iPhone, iPad, Galaxy 등 프리셋
- 📐 **브레이크포인트**: 미디어 쿼리 리스트, 빠른 전환
- 👆 **터치**: Tap, Swipe, Pinch 시뮬레이션
- 🐌 **네트워크**: 3G/4G/5G 속도, 오프라인 모드

**단축키:** `⌘⇧7`

---

### 11. 📸 Capture & Export (캡처 및 내보내기)

**통합된 기능:**

- Screenshot Pro
- Video Recorder
- HTML Exporter
- PDF Generator
- Markdown Converter

**주요 기능:**

- 📸 **스크린샷**: 전체/영역/요소, 주석 추가, PNG/JPG/PDF/WebP
- 🎥 **녹화**: 화면 녹화, 마우스 하이라이트, GIF 변환
- 📄 **내보내기**: HTML, PDF, Markdown 변환
- 💾 **옵션**: 인라인 CSS, Base64 이미지, 단일 파일

**단축키:** `⌘⇧M` (Screenshot), `⌘⇧V` (Video)

---

### 12. 🛠️ Page Utilities (페이지 유틸리티)

**통합된 기능:**

- Copy Protection Breaker
- Element Hider
- Scroll Spy
- Form Filler
- Lorem Ipsum Generator

**주요 기능:**

- 🔓 **복사방지 해제**: 우클릭, 텍스트 선택, F12 차단 해제
- 👁️ **요소 숨김**: 광고/팝업 제거, 도메인별 규칙
- 📜 **스크롤**: 현재 위치, Smooth scroll, Sticky 하이라이트
- 📝 **폼 자동 채우기**: 더미 데이터, 프로필 저장
- 📄 **Lorem Ipsum**: 텍스트 삽입, 한글/영어, 더미 데이터 생성

**단축키:** `⌘⇧U`

---

### 13. 📊 Analysis Tools (분석 도구)

**통합된 기능:**

- Version Diff
- A/B Test Helper
- Competitor Analyzer
- Click Heatmap
- Hover State Viewer

**주요 기능:**

- 🔄 **버전 비교**: Before/After, 시각적 Diff
- 🧪 **A/B 테스트**: 변형 생성, 랜덤 표시, 비교
- 🔬 **경쟁사 분석**: 기술 스택, 디자인, 속도, SEO 비교
- 🔥 **히트맵**: 클릭 위치 기록, 밀도 시각화
- 🖱️ **Hover 상태**: :hover 스타일 추출, 전환 느리게 보기

**단축키:** `⌘⌥D` (Diff), `⌘⌥A` (A/B Test)

---

### 14. 💾 Storage & Security (스토리지 및 보안)

**통합된 기능:**

- Local Storage Inspector
- Cookie Inspector
- Security Scanner

**주요 기능:**

- 💾 **스토리지**: localStorage, sessionStorage, IndexedDB, 데이터 편집
- 🍪 **쿠키**: HttpOnly, Secure, SameSite 체크, GDPR 준수
- 🔒 **보안**: HTTPS, Mixed Content, XSS, CORS, CSP 검사

**단축키:** `⌘⇧D` (Storage), `⌘⌥!` (Security)

---

### 15. 🎯 Misc Tools (기타 도구)

**통합된 기능:**

- QR Code Generator
- URL Shortener
- Tab Manager
- Bookmark Palette
- Translation Helper
- Currency & Number Formatter
- IP & Location Info
- Random Data Generator

**주요 기능:**

- 📱 **QR 코드**: URL, 텍스트 QR 생성
- 🔗 **URL 단축**: 단축 URL, 히스토리
- 📑 **탭 관리**: 중복 제거, 그룹 생성, 북마크
- 🔖 **북마크**: 빠른 저장, 태그, 검색
- 🌐 **다국어**: lang 속성, 번역 누락, RTL 시뮬레이션
- 💱 **통화/숫자**: 포맷 감지, 로케일 시뮬레이션
- 🌍 **IP/위치**: IP, 국가, 타임존, ISP
- 🎲 **랜덤**: 색상, UUID, Lorem Ipsum, 가짜 프로필

**단축키:** `⌘⇧Q` (QR), `⌘⇧T` (Tab), `⌘⇧N` (Bookmark)

---

## 📊 최종 플러그인 구성

### Free 플랜 (4개)

1. ✅ Design Inspector
2. ✅ Color Suite
3. ✅ Ruler & Grid
4. ✅ Layout Analyzer

### Pro 플랜 (11개)

1. 💻 Code Inspector
2. 🖼️ Asset Manager
3. 🎨 Design System Tools
4. ♿ Accessibility Suite
5. ⚡ SEO & Performance
6. 📱 Responsive Tools
7. 📸 Capture & Export
8. 🛠️ Page Utilities
9. 📊 Analysis Tools
10. 💾 Storage & Security
11. 🎯 Misc Tools