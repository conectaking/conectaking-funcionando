import Chart from 'chart.js/auto';

if (typeof window !== 'undefined') {
  window.Chart = window.Chart || Chart;
}

export { Chart };
