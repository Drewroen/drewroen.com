/* Chart for the Survivor by-state page: titles per 10 million residents.
   Chart.js is the pinned CDN build in index.html; every value behind the chart is
   also in the page's tables, so the page still works if this file does not run. */
(async () => {
  const canvas = document.getElementById('chart-percap');
  if (!canvas || typeof Chart === 'undefined') return;

  const fallback = document.querySelector('.chart-fallback');
  const wrap = document.querySelector('.chart');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tokens = () => {
    const s = getComputedStyle(document.documentElement);
    const t = (name, def) => (s.getPropertyValue(name) || '').trim() || def;
    return {
      ink: t('--text', '#141413'),
      inkSoft: t('--text-secondary', '#5e5d59'),
      surface: t('--bg-raised', '#ffffff'),
      border: t('--border', '#e8e6dc'),
      accent: t('--clay', '#d97757')
    };
  };
  const alpha = (hex, a) => {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(v, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  let data;
  try {
    data = await (await fetch('data.json')).json();
  } catch (err) {
    if (wrap) wrap.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  const rows = data.states
    .filter((s) => s.us && s.wins > 0 && s.wins_per_10m !== null)
    .sort((a, b) => a.wins_per_10m - b.wins_per_10m);

  const c = tokens();
  const anim = reduce ? false : { duration: 400 };

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((s) => s.code),
      datasets: [{
        label: 'Titles per 10M residents',
        data: rows.map((s) => s.wins_per_10m),
        backgroundColor: rows.map((s) => (s.appearances >= 10 ? c.accent : alpha(c.accent, 0.5))),
        borderRadius: 2,
        maxBarThickness: 12
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: anim,
      layout: { padding: { top: 4, right: 12 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: c.surface,
          titleColor: c.ink,
          bodyColor: c.inkSoft,
          borderColor: c.border,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            title: (items) => rows[items[0].dataIndex].name,
            label: (item) => {
              const s = rows[item.dataIndex];
              return [
                `${s.wins} title${s.wins === 1 ? '' : 's'} from ${s.appearances} appearance${s.appearances === 1 ? '' : 's'}`,
                `${s.wins_per_10m} per 10M residents (population ${(s.population / 1e6).toFixed(1)}M)`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: c.border, drawTicks: false },
          border: { display: false },
          title: { display: true, text: 'Sole Survivor titles per 10 million residents', color: c.inkSoft, font: { size: 11 } },
          ticks: { color: c.inkSoft, font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          border: { color: c.border },
          ticks: { color: c.inkSoft, font: { size: 11 }, autoSkip: false }
        }
      }
    }
  });

  // rebuild with fresh tokens when the colour scheme flips
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) {
    mq.addEventListener('change', () => {
      const t = tokens();
      chart.data.datasets[0].backgroundColor = rows.map((s) => (s.appearances >= 10 ? t.accent : alpha(t.accent, 0.5)));
      chart.options.scales.x.grid.color = t.border;
      chart.options.scales.x.ticks.color = t.inkSoft;
      chart.options.scales.x.title.color = t.inkSoft;
      chart.options.scales.y.ticks.color = t.inkSoft;
      chart.options.scales.y.border.color = t.border;
      chart.options.plugins.tooltip.backgroundColor = t.surface;
      chart.options.plugins.tooltip.titleColor = t.ink;
      chart.options.plugins.tooltip.bodyColor = t.inkSoft;
      chart.options.plugins.tooltip.borderColor = t.border;
      chart.update('none');
    });
  }
})();
