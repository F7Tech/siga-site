// /assets/js/pages/debits.js
import { api } from "../api.js";

export async function renderDebits() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <h1>Débitos</h1>
    <div class="card">
      <label>Placa</label>
      <input id="plate" placeholder="ABC1D23" />
      <button id="btn">Buscar débitos</button>
      <pre id="out"></pre>
    </div>
  `;

  app.querySelector("#btn").addEventListener("click", async () => {
    const plate = app.querySelector("#plate").value.trim();
    const out = app.querySelector("#out");
    out.textContent = "Buscando...";

    try {
      const data = await api.getDebits(plate);
      out.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      out.textContent = `Erro: ${e.message}`;
    }
  });
}
