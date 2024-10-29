import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import Vue3Toastify from "vue3-toastify";
import "bootstrap/dist/css/bootstrap.css";
import "./assets/main.css";

/**
 * description :- initializes
 * created_at:- 29/10/2024 11:35:14
 */
const app = createApp(App);
app.use(createPinia());
app.use(Vue3Toastify, { autoClose: 3000 })
app.mount("#app");
