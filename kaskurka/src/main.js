import { createApp } from 'vue' // Importē createApp funkciju no Vue bibliotēkas.
import App from './App.vue' // Importē galveno App komponentu.

// Izveido Vue lietotnes instanci ar App komponentu kā saknes komponentu
// un montē to HTML elementā ar id="app".
createApp(App).mount('#app')