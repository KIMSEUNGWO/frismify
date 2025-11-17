import { createApp } from 'vue';
import '@/assets/styles/main.css';
import '@/assets/fonts/fonts.css'
import '@/plugins/implementations';
import App from './App.vue';
import router from './router'

createApp(App)
    .use(router)
    .mount('#app');