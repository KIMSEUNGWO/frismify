import { createApp } from 'vue';
import "@/assets/styles/main.css";
import '@/assets/fonts/fonts.css'
import './style.css';
import App from './App.vue';

// 플러그인 로드
import '@/plugins/implementations';

createApp(App).mount('#app');
