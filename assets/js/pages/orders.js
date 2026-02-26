// /assets/js/pages/orders.js
import { api } from "../api.js";

export async function renderOrders() {
  const app = document.querySelector("#app");
  app.innerHTML = `<h1>Pedidos</h1><pre id="out">Carregando...</pre>`;

  try {
    const data = await api.getOrders();
    app.querySelector("#out").textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    app.querySelector("#out").textContent = `Erro: ${e.message}`;
  }
}
