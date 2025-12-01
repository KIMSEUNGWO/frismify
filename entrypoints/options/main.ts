import { createApp } from 'vue';
import '@/assets/styles/main.css';
import '@/assets/fonts/fonts.css'
import './style.css'
import '@/plugins';
import App from './App.vue';
import router from './router'

createApp(App)
    .use(router)
    .mount('#prismify');