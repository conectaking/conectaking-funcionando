import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  window.L = window.L || L;
}

export { L };
