// /assets/js/pages/home.js
import { api } from "../api.js";

export async function renderHome() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <h1>SIGA BR</h1>
    <div class="card">
      <label>Placa</label>
      <input id="plate" placeholder="ABC1D23" />
      <button id="btn">Consultar</button>
      <pre id="out"></pre>
    </div>
    <div class="grid">
      <a class="card" href="#/debitos">Débitos</a>
      <a class="card" href="#/pedidos">Pedidos</a>
    </div>
  `;

  app.querySelector("#btn").addEventListener("click", async () => {
    const plate = app.querySelector("#plate").value.trim();
    const out = app.querySelector("#out");
    out.textContent = "Consultando...";

    try {
      const data = await api.getVehicleStatus(plate);
      out.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      out.textContent = `Erro: ${e.message}`;
    }
  });
}
