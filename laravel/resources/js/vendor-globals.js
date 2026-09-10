/**
 * Vendor npm → window globals (Chart, L, Sortable).
 * Cropper permanece em /vendor (API 1.x do projeto; npm atual é 2.x incompatível).
 */
import Chart from 'chart.js/auto';
import L from 'leaflet';
import Sortable from 'sortablejs';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  window.Chart = window.Chart || Chart;
  window.L = window.L || L;
  window.Sortable = window.Sortable || Sortable;
}

export { Chart, L, Sortable };
