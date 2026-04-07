import { createApp } from 'vue';
import pinia from './stores/pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import App from './App.vue';
import router from './router';
import './styles/global.css';

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(ElementPlus);

app.mount('#app');
