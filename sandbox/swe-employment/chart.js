/* Charts for the software developer employment stat page.
   Chart.js is the pinned CDN build in index.html; every value behind every chart is
   also in one of the page's tables, so the page still works if this file does not run. */
(async () => {
  const devCanvas = document.getElementById('chart');
  if (!devCanvas || typeof Chart === 'undefined') return;

  const wrap = document.querySelector('.chart');
  const fallback = document.querySelector('.chart-fallback');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const number = (n) => n.toLocaleString('en-US');
  const pct = (v) => (v > 0 ? '+' : '') + v.toFixed(1) + '%';
  const millions = (v) => (v / 1e6).toFixed(1) + 'M';

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

  let data, jolts;
  try {
    data = await (await fetch('data.json')).json();
    const jc = document.getElementById('chart-hires');
    jolts = jc ? await (await fetch('jolts.json')).json() : null;
  } catch (err) {
    if (wrap) wrap.hidden = true;
    if (fallback) fallback.hidden = false;
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
  const legendStyle = (c) => ({
    display: true,
    position: 'top',
    align: 'end',
    labels: { color: c.inkSoft, boxWidth: 18, boxHeight: 2, padding: 12, font: { size: 11 } }
  });

  /* ---------- 1. developer employment line (OEWS) ---------- */
  const eraOf = (year) => data.eras.find((e) => {
    const [from, to] = e.label.split('\u2013').map(Number);
    return year >= from && year <= to;
  });
  const labels = data.series.map((p) => String(p.year));
  const hollow = data.series.map((p) => !eraOf(p.year).comparable);
  const boundaries = data.eras.slice(1).map((e) => Number(e.label.split('\u2013')[0]));

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

  const buildLine = () => {
    const c = tokens();
    const chart = new Chart(devCanvas, {
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
        animation: anim,
        layout: { padding: { top: 8, right: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: legendStyle(c),
          tooltip: Object.assign(tooltipStyle(c), {
            callbacks: {
              label: (item) => {
                const p = data.series[item.dataIndex];
                if (item.datasetIndex === 1) return 'incl. QA: ' + number(p.comparable) + ' (developers ' + number(p.value) + ' + QA ' + number(p.qa) + ')';
                return number(p.value) + ' employed \u00b7 SOC ' + p.codes.join(' + ') + (p.qa ? ' (QA counted separately: ' + number(p.qa) + ')' : '');
              }
            }
          })
        },
        scales: {
          x: { grid: { display: false }, border: { color: c.border }, ticks: { color: c.inkSoft, maxRotation: 0, autoSkip: true, maxTicksLimit: 11, font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: c.border, drawTicks: false }, border: { display: false }, ticks: { color: c.inkSoft, maxTicksLimit: 5, font: { size: 11 }, callback: millions } }
        }
      },
      plugins: [eraRules]
    });
    return chart;
  };

  /* ---------- 2. hires vs layoffs bars (JOLTS) ---------- */
  const buildBars = () => {
    const canvas = document.getElementById('chart-hires');
    if (!canvas || !jolts) return null;
    const c = tokens();
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: jolts.series.map((p) => String(p.year)),
        datasets: [
          { label: 'Hires', data: jolts.series.map((p) => p.hires), backgroundColor: c.accent, borderRadius: 2, maxBarThickness: 14 },
          { label: 'Layoffs and discharges', data: jolts.series.map((p) => p.layoffs), backgroundColor: c.compare, borderRadius: 2, maxBarThickness: 14 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: anim,
        layout: { padding: { top: 8, right: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: legendStyle(c),
          tooltip: Object.assign(tooltipStyle(c), {
            callbacks: {
              label: (item) => number(item.parsed.y) + (item.datasetIndex === 0 ? ' hired' : ' laid off') + ' in ' + item.label
            }
          })
        },
        scales: {
          x: { grid: { display: false }, border: { color: c.border }, ticks: { color: c.inkSoft, maxRotation: 0, autoSkip: true, maxTicksLimit: 11, font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: c.border, drawTicks: false }, border: { display: false }, ticks: { color: c.inkSoft, maxTicksLimit: 5, font: { size: 11 }, callback: millions } }
        }
      }
    });
  };

  /* ---------- 3. year-over-year change lines (JOLTS) ---------- */
  const zeroLine = {
    id: 'zeroLine',
    afterDatasetsDraw(chart) {
      const y = chart.scales.y.getPixelForValue(0);
      if (y < chart.chartArea.top || y > chart.chartArea.bottom) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = tokens().inkSoft;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chart.chartArea.left, y);
      ctx.lineTo(chart.chartArea.right, y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const buildYoy = () => {
    const canvas = document.getElementById('chart-yoy');
    if (!canvas || !jolts) return null;
    const c = tokens();
    const rows = jolts.series.filter((p) => p.hires_yoy !== null);
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: rows.map((p) => String(p.year)),
        datasets: [
          {
            label: 'Hires, % change vs year before',
            data: rows.map((p) => p.hires_yoy),
            borderColor: c.accent,
            borderWidth: 2,
            tension: 0,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointBackgroundColor: c.accent,
            pointBorderColor: c.accent
          },
          {
            label: 'Layoffs, % change vs year before',
            data: rows.map((p) => p.layoffs_yoy),
            borderColor: c.compare,
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointBackgroundColor: c.compare,
            pointBorderColor: c.compare
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: anim,
        layout: { padding: { top: 8, right: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: legendStyle(c),
          tooltip: Object.assign(tooltipStyle(c), {
            callbacks: {
              label: (item) => (item.datasetIndex === 0 ? 'Hires ' : 'Layoffs ') + pct(item.parsed.y) + ' in ' + item.label
            }
          })
        },
        scales: {
          x: { grid: { display: false }, border: { color: c.border }, ticks: { color: c.inkSoft, maxRotation: 0, autoSkip: true, maxTicksLimit: 11, font: { size: 11 } } },
          y: { grid: { color: c.border, drawTicks: false }, border: { display: false }, ticks: { color: c.inkSoft, maxTicksLimit: 6, font: { size: 11 }, callback: pct } }
        }
      },
      plugins: [zeroLine]
    });
  };

  /* ---------- build + rebuild on theme change ---------- */
  let charts = [];
  const build = () => {
    charts.forEach((ch) => ch && ch.destroy());
    charts = [buildLine(), buildBars(), buildYoy()];
  };
  build();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', build);
})();
