/* Charts for the Dancing with the Stars professional-dancer page.
   Chart.js is the pinned CDN build in index.html; every value behind both charts is
   also in one of the page's tables, so the page still works if this file does not run. */
(async () => {
  const winsCanvas = document.getElementById('chart-wins');
  const scatterCanvas = document.getElementById('chart-scatter');
  if (!winsCanvas || typeof Chart === 'undefined') return;

  const fallbacks = document.querySelectorAll('.chart-fallback');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tokens = () => {
    const s = getComputedStyle(document.documentElement);
    const t = (name, def) => (s.getPropertyValue(name) || '').trim() || def;
    return {
      ink: t('--text', '#141413'),
      inkSoft: t('--text-secondary', '#5e5d59'),
      surface: t('--bg-raised', '#ffffff'),
      border: t('--border', '#e8e6dc'),
      accent: t('--clay', '#d97757'),
      compare: t('--olive', '#788c5d')
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
    document.querySelectorAll('.chart').forEach((w) => { w.hidden = true; });
    fallbacks.forEach((f) => { f.hidden = false; });
    return;
  }

  const anim = reduce ? false : { duration: 400 };
  const tooltipStyle = (c) => ({
    displayColors: false,
    backgroundColor: c.surface,
    titleColor: c.ink,
    bodyColor: c.inkSoft,
    borderColor: c.border,
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10
  });

  /* ---------- 1. Mirrorball wins by professional ---------- */
  const buildWins = () => {
    const c = tokens();
    const rows = data.winners.slice().sort((a, b) => a.wins - b.wins || a.pro.localeCompare(b.pro));
    return new Chart(winsCanvas, {
      type: 'bar',
      data: {
        labels: rows.map((p) => p.pro),
        datasets: [{
          label: 'Mirrorball wins',
          data: rows.map((p) => p.wins),
          backgroundColor: rows.map((p) => (p.wins > 1 ? c.accent : alpha(c.accent, 0.55))),
          borderColor: c.accent,
          borderWidth: 0,
          borderRadius: 2,
          maxBarThickness: 14
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
          tooltip: Object.assign(tooltipStyle(c), {
            callbacks: {
              label: (item) => {
                const p = rows[item.dataIndex];
                return `${p.wins} win${p.wins > 1 ? 's' : ''} in ${p.seasons} seasons (${Math.round(p.win_rate * 100)}%)`;
              },
              afterLabel: (item) => rows[item.dataIndex].wins_with.join(', ')
            }
          })
        },
        scales: {
          x: { beginAtZero: true, grid: { color: c.border, drawTicks: false }, border: { display: false }, ticks: { color: c.inkSoft, stepSize: 1, font: { size: 11 } } },
          y: { grid: { display: false }, border: { color: c.border }, ticks: { color: c.inkSoft, font: { size: 11 }, autoSkip: false } }
        }
      }
    });
  };

  /* ---------- 2. seasons competed vs average finish ---------- */
  const buildScatter = () => {
    const c = tokens();
    const rows = data.pros.filter((p) => p.avg_place !== null);
    const notable = new Set(['Derek Hough', 'Cheryl Burke', 'Mark Ballas', 'Valentin Chmerkovskiy', 'Julianne Hough', 'Tony Dovolani']);
    const ordinal = (v) => v + (v === 1 ? 'st' : v === 2 ? 'nd' : v === 3 ? 'rd' : 'th');
    const labels = {
      id: 'bubbleLabels',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.fillStyle = tokens().inkSoft;
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        chart.getDatasetMeta(0).data.forEach((pt, i) => {
          const p = rows[i];
          if (!notable.has(p.pro)) return;
          const above = pt.y - pt.options.radius - 6;
          // keep the label inside the canvas when the bubble is near the top edge
          ctx.textBaseline = above < chartArea.top + 10 ? 'top' : 'alphabetic';
          ctx.fillText(p.pro, pt.x, above < chartArea.top + 10 ? pt.y + pt.options.radius + 6 : above);
        });
        ctx.restore();
      }
    };
    return new Chart(scatterCanvas, {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Professional',
          data: rows.map((p) => ({ x: p.seasons, y: p.avg_place, r: 4 + p.wins * 3.2, pro: p.pro })),
          backgroundColor: rows.map((p) => (p.wins ? alpha(c.accent, 0.35) : alpha(c.compare, 0.28))),
          borderColor: rows.map((p) => (p.wins ? c.accent : c.compare)),
          borderWidth: 1.5,
          hoverBackgroundColor: rows.map((p) => (p.wins ? alpha(c.accent, 0.55) : alpha(c.compare, 0.45)))
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: anim,
        layout: { padding: { top: 16, right: 12, left: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipStyle(c), {
            callbacks: {
              title: (items) => rows[items[0].dataIndex].pro,
              label: (item) => {
                const p = rows[item.dataIndex];
                return [
                  `${p.seasons} seasons, ${p.wins} win${p.wins === 1 ? '' : 's'}`,
                  `avg place ${p.avg_place}, best ${p.best}, worst ${p.worst}`,
                  `avg finish ${Math.round(p.avg_finish_pct * 100)}% of the field`
                ];
              }
            }
          })
        },
        scales: {
          x: {
            title: { display: true, text: 'Seasons competed', color: c.inkSoft, font: { size: 11 } },
            beginAtZero: false,
            grace: '6%',
            grid: { color: c.border, drawTicks: false },
            border: { display: false },
            ticks: { color: c.inkSoft, stepSize: 2, font: { size: 11 }, callback: (v) => (Number.isInteger(v) && v >= 1 ? v : null) }
          },
          y: {
            reverse: true,
            grace: '12%',
            title: { display: true, text: 'Average finishing position (up is better)', color: c.inkSoft, font: { size: 11 } },
            grid: { color: c.border, drawTicks: false },
            border: { display: false },
            ticks: { color: c.inkSoft, stepSize: 2, font: { size: 11 }, callback: (v) => (Number.isInteger(v) && v >= 1 ? ordinal(v) : null) }
          }
        }
      },
      plugins: [labels]
    });
  };

  /* ---------- build + rebuild on theme change ---------- */
  let charts = [];
  const build = () => {
    charts.forEach((ch) => ch && ch.destroy());
    charts = [buildWins(), scatterCanvas ? buildScatter() : null];
  };
  build();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', build);
})();
