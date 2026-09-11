/**
 * Vendors mínimos do dashboard no boot (Sortable + Cropper).
 * Chart/Leaflet/QRCode entram via dynamic import (ckEnsure*).
 */
import Sortable from 'sortablejs';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

if (typeof window !== 'undefined') {
  window.Sortable = window.Sortable || Sortable;
  window.Cropper = window.Cropper || Cropper;
}

export { Sortable, Cropper };
