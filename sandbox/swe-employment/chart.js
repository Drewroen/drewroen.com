/* Draws the OEWS employment line from data.json.
   Chart.js itself is the pinned CDN build in index.html; every value is also
   in the page's table, so the page still works if this script does not run. */
(async () => {
  const canvas = document.getElementById('chart');
  const fallback = document.querySelector('.chart-fallback');
  const wrap = document.querySelector('.chart');
  if (!canvas || typeof Chart === 'undefined') return;

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

  let data;
  try {
    data = await (await fetch('data.json')).json();
  } catch (err) {
    wrap.hidden = true;
    fallback.hidden = false;
    return;
  }

  const eraOf = (year) => data.eras.find((e) => {
    const [from, to] = e.label.split('\u2013').map(Number);
    return year >= from && year <= to;
  });
  const labels = data.series.map((p) => String(p.year));
  const hollow = data.series.map((p) => !eraOf(p.year).comparable);
  const boundaries = data.eras.slice(1).map((e) => Number(e.label.split('\u2013')[0]));
  const number = (n) => n.toLocaleString('en-US');

  /* dashed rule at each definition change, between the two year centres */
  const eraRules = {
    id: 'eraRules',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      ctx.save();
      ctx.strokeStyle = tokens().border;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      boundaries.forEach((year) => {
        const x = (scales.x.getPixelForValue(String(year - 1)) + scales.x.getPixelForValue(String(year))) / 2;
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top + 4);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      });
      ctx.restore();
    }
  };

  let chart = null;
  const build = () => {
    const c = tokens();
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Software developers (as published)',
            data: data.series.map((p) => p.value),
            borderColor: c.accent,
            borderWidth: 2,
            tension: 0,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: hollow.map((h) => (h ? c.surface : c.accent)),
            pointBorderColor: c.accent,
            pointBorderWidth: 2
          },
          {
            label: 'Developers + QA analysts and testers',
            data: data.series.map((p) => (p.year >= 2019 ? p.comparable : null)),
            borderColor: c.compare,
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0,
            fill: false,
            pointRadius: 2.5,
            pointHoverRadius: 4.5,
            pointBackgroundColor: c.compare,
            pointBorderColor: c.compare
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 400 },
        layout: { padding: { top: 8, right: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { color: c.inkSoft, boxWidth: 18, boxHeight: 2, padding: 12, font: { size: 11 }, usePointStyle: false }
          },
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
                const p = data.series[item.dataIndex];
                if (item.datasetIndex === 1) return 'incl. QA: ' + number(p.comparable) + ' (developers ' + number(p.value) + ' + QA ' + number(p.qa) + ')';
                return number(p.value) + ' employed \u00b7 SOC ' + p.codes.join(' + ') + (p.qa ? ' (QA counted separately: ' + number(p.qa) + ')' : '');
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: c.border },
            ticks: { color: c.inkSoft, maxRotation: 0, autoSkip: true, maxTicksLimit: 11, font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: c.border, drawTicks: false },
            border: { display: false },
            ticks: {
              color: c.inkSoft,
              maxTicksLimit: 5,
              font: { size: 11 },
              callback: (v) => (v / 1e6).toFixed(1) + 'M'
            }
          }
        }
      },
      plugins: [eraRules]
    });
  };

  build();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', build);
})();