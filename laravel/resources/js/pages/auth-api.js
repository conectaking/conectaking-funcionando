/**
 * Base da API para páginas de auth (Vite).
 */
export function getApiBase() {
  const PROD = 'https://www.conectaking.com.br';
  const host = String(window.location.hostname || '').toLowerCase();
  if (
    host.endsWith('conectaking.com.br') ||
    host === 'cnking.bio' ||
    host === 'www.cnking.bio'
  ) {
    return window.location.origin;
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return (
      window.API_URL ||
      window.API_BASE ||
      (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseURL) ||
      window.location.origin
    );
  }
  return PROD;
}
