// /assets/js/router.js
import { renderHome } from "./pages/home.js";
import { renderDebits } from "./pages/debits.js";
import { renderOrders } from "./pages/orders.js";

const routes = {
  "#/": renderHome,
  "#/debitos": renderDebits,
  "#/pedidos": renderOrders
};

export async function router() {
  const key = location.hash || "#/";
  const fn = routes[key] || routes["#/"];
  await fn();
}

window.addEventListener("hashchange", router);
