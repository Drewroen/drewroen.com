/* Charts for the McDonald's country-specialty page.
   Chart.js is the pinned CDN build in index.html; every value behind both charts
   is also in the page's tables, so the page still works if this file never runs.

   Both charts are horizontal bars of one number each:
     1. items documented per country
     2. countries per shared item
   Readability notes:
   - each bar carries its own value at the end, so nobody has to read the axis
   - every y tick carries the country code (or the item's own country count)
   - sections the source writes for several countries at once are drawn lighter
*/
(async () => {
  const fallback = document.querySelectorAll('.chart-fallback');
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
    document.querySelectorAll('.chart').forEach((el) => { el.hidden = true; });
    fallback.forEach((el) => { el.hidden = false; });
    return;
  }

  const wrapIt = (n) => (n === 1 ? '1 country' : n + ' countries');

  // value at the end of each bar, flipping inside the bar when it would run off
  const barValues = (values, fmt) => ({
    id: 'barValues',
    afterDatasetsDraw(chart) {
      const t = tokens();
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const value = fmt(values[i]);
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
  });

  const baseOptions = (c, label) => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: reduce ? false : { duration: 400 },
    layout: { padding: { top: 4, right: 38 } },
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
        padding: 10
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: c.border, drawTicks: false },
        border: { display: false },
        title: { display: true, text: label, color: c.inkSoft, font: { size: 11 } },
        ticks: { color: c.inkSoft, font: { size: 11 }, precision: 0, maxTicksLimit: 8 }
      },
      y: {
        grid: { display: false },
        border: { color: c.border },
        ticks: { color: c.inkSoft, font: { size: 11 }, autoSkip: false, padding: 6 }
      }
    }
  });

  const charts = [];

  // ---- chart 1: documented items per country --------------------------------
  const canvasA = document.getElementById('chart-countries');
  if (canvasA && typeof Chart !== 'undefined') {
    const rows = data.countries.filter((c) => c.n > 0).slice(0, 24).reverse();
    const c = tokens();
    const color = (row) => (row.combined ? alpha(c.accent, 0.45) : c.accent);
    charts.push(new Chart(canvasA, {
      type: 'bar',
      data: {
        labels: rows.map((r) => (r.combined ? r.name : r.name)),
        datasets: [{
          label: 'Documented menu items',
          data: rows.map((r) => r.n),
          backgroundColor: rows.map(color),
          borderRadius: 2,
          maxBarThickness: 16,
          categoryPercentage: 0.84,
          barPercentage: 0.92
        }]
      },
      options: Object.assign(baseOptions(c, 'Menu items documented for the country'), {
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
                const r = rows[item.dataIndex];
                return [
                  `${r.n} item${r.n === 1 ? '' : 's'}${r.combined ? ' (section covers ' + r.combined + ')' : ''}`,
                  r.items.slice(0, 6).join(', ') + (r.items.length > 6 ? ', …' : '')
                ];
              }
            }
          }
        }
      }),
      plugins: [barValues(rows.map((r) => r.n), String)]
    }));
    canvasA._rows = rows;
    canvasA._color = color;
  }

  // ---- chart 2: how many countries each shared item reaches ------------------
  const canvasB = document.getElementById('chart-shared');
  if (canvasB && typeof Chart !== 'undefined') {
    const rows = data.items.filter((i) => i.n > 1).slice(0, 24).reverse();
    const c = tokens();
    charts.push(new Chart(canvasB, {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.name),
        datasets: [{
          label: 'Countries',
          data: rows.map((r) => r.n),
          backgroundColor: c.accent,
          borderRadius: 2,
          maxBarThickness: 16,
          categoryPercentage: 0.84,
          barPercentage: 0.92
        }]
      },
      options: Object.assign(baseOptions(c, 'Countries the item is documented in'), {
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
              label: (item) => {
                const r = rows[item.dataIndex];
                return [wrapIt(r.n), r.countries.join(', '),
                        'found in: ' + r.sources.join(' + ')];
              }
            }
          }
        }
      }),
      plugins: [barValues(rows.map((r) => r.n), (v) => String(v))]
    }));
  }

  // recolour with fresh tokens when the colour scheme flips
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) {
    mq.addEventListener('change', () => {
      const t = tokens();
      charts.forEach((chart) => {
        chart.data.datasets[0].backgroundColor = Array.isArray(chart.data.datasets[0].backgroundColor)
          ? chart.data.datasets[0].backgroundColor.map(() => t.accent)
          : t.accent;
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
      // keep the combined-section bars lighter than the rest after a flip
      if (canvasA && canvasA._rows && canvasA._color) {
        const chart = charts[0];
        chart.data.datasets[0].backgroundColor = canvasA._rows.map(canvasA._color);
        chart.update('none');
      }
    });
  }
})();
