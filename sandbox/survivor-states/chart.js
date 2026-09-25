/* Chart for the Survivor by-state page: titles per 10 million residents.
   Chart.js is the pinned CDN build in index.html; every value behind the chart is
   also in the page's tables, so the page still works if this file does not run.

   Readability notes, because 25 bars on one axis is a lot to ask of a reader:
   - every bar carries its own value at the end, so nobody has to read the axis
   - each y tick carries the state code and its raw title count, which is the
     number the per-capita question actually turns on
   - the page gives this chart a taller box than the site default (25 rows at
     320px are unreadably thin)
   - bars for states with fewer than ten appearances are drawn lighter: a state
     can top this chart on one title from two appearances
*/
(async () => {
  const canvas = document.getElementById('chart-percap');
  if (!canvas || typeof Chart === 'undefined') return;

  const fallback = document.querySelector('.chart-fallback');
  const wrap = canvas.closest('.chart');
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
    const v = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
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

  const STRONG = 10;                                  // appearances before a rate means much
  const title = (n) => (n === 1 ? '1 title' : n + ' titles');
  const barColor = (s, t) => (s.appearances >= STRONG ? t.accent : alpha(t.accent, 0.45));

  // value at the end of each bar, flipping inside the bar when it would run off
  const barValues = {
    id: 'barValues',
    afterDatasetsDraw(chart) {
      const t = tokens();
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const value = rows[i].wins_per_10m.toFixed(1);
        if (bar.x + 8 + ctx.measureText(value).width < chartArea.right) {
          ctx.fillStyle = t.inkSoft;
          ctx.textAlign = 'left';
          ctx.fillText(value, bar.x + 6, bar.y);
        } else {
          ctx.fillStyle = t.surface;
          ctx.textAlign = 'right';
          ctx.fillText(value, bar.x - 6, bar.y);
        }
      });
      ctx.restore();
    }
  };

  const c = tokens();
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((s) => [s.code, title(s.wins)]),
      datasets: [{
        label: 'Titles per 10M residents',
        data: rows.map((s) => s.wins_per_10m),
        backgroundColor: rows.map((s) => barColor(s, c)),
        borderRadius: 2,
        maxBarThickness: 13,
        categoryPercentage: 0.82,
        barPercentage: 0.9
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: reduce ? false : { duration: 400 },
      layout: { padding: { top: 4, right: 34 } },
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
                `${title(s.wins)} from ${s.appearances} appearance${s.appearances === 1 ? '' : 's'} (${(s.win_rate * 100).toFixed(0)}% of them won)`,
                `${s.wins_per_10m} titles per 10M residents, population ${(s.population / 1e6).toFixed(1)}M`,
                s.appearances < STRONG ? 'fewer than ten appearances — thin evidence' : ''
              ].filter(Boolean);
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
          ticks: { color: c.inkSoft, font: { size: 11 }, maxTicksLimit: 8 }
        },
        y: {
          grid: { display: false },
          border: { color: c.border },
          ticks: { color: c.inkSoft, font: { size: 11 }, autoSkip: false, padding: 6 }
        }
      }
    },
    plugins: [barValues]
  });

  // recolour with fresh tokens when the colour scheme flips
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) {
    mq.addEventListener('change', () => {
      const t = tokens();
      chart.data.datasets[0].backgroundColor = rows.map((s) => barColor(s, t));
      chart.options.scales.x.grid.color = t.border;
      chart.options.scales.x.ticks.color = t.inkSoft;
      chart.options.scales.x.title.color = t.inkSoft;
      chart.options.scales.y.ticks.color = t.inkSoft;
      chart.options.scales.y.border.color = t.border;
      Object.assign(chart.options.plugins.tooltip, {
        backgroundColor: t.surface, titleColor: t.ink, bodyColor: t.inkSoft, borderColor: t.border
      });
      chart.update('none');
    });
  }
})();
