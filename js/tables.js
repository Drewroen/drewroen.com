/* Sortable data tables for the sandbox pages.
 *
 * Markup contract: any <table class="data-table"> with a <thead><tr><th> and a
 * <tbody> becomes sortable on load. No per-page wiring, no data attributes.
 *
 * Behaviour: click a heading to sort ascending, click again for descending,
 * click a third time to restore the order the page shipped with (which matters
 * on the season-ordered tables, where the original order is the point).
 *
 * Column type is inferred per column, not declared: if every cell in a column
 * parses as a number, the column sorts numerically, otherwise alphabetically.
 * Numeric parsing takes the leading number of the cell, so "3.6%", "1.2M",
 * "5–23" and "10th" all sort by the thing they are measuring. Cells that are
 * empty or a bare dash always sort last, in both directions — they mean
 * "no data", and burying them is the only useful place to put them.
 */
(() => {
  'use strict';

  const INDICATOR = { none: '↕', asc: '↑', desc: '↓' };
  const DASHES = /^[\s\u2013\u2014\u2212-]*$/;

  const text = (cell) => (cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '');

  /** Leading number in a cell, or null when the cell is blank/dashed, or NaN when it is not numeric. */
  const value = (cell) => {
    const t = text(cell).replace(/,/g, '');
    if (!t || DASHES.test(t)) return null;
    const m = t.match(/^-?\d*\.?\d+/);
    return m ? parseFloat(m[0]) : NaN;
  };

  const isNumericColumn = (rows, i) => {
    let seen = false;
    for (const row of rows) {
      const cells = row.cells;
      if (!cells[i]) return false;
      const v = value(cells[i]);
      if (v === null) continue;
      if (Number.isNaN(v)) return false;
      seen = true;
    }
    return seen;
  };

  const compare = (a, b, numeric) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;            // missing always sorts last
    if (b === null) return -1;
    if (numeric) return a - b;
    return String(a).localeCompare(String(b), 'en', { sensitivity: 'base' });
  };

  function makeSortable(table) {
    const head = table.tHead;
    const body = table.tBodies[0];
    if (!head || !body) return;

    const headers = [...head.rows[head.rows.length - 1].cells];
    const original = [...body.rows];
    const numeric = headers.map((_, i) => isNumericColumn(original, i));
    const state = headers.map(() => 0);

    headers.forEach((th, index) => {
      if (!th || th.dataset.noSort !== undefined) return;
      th.setAttribute('aria-sort', 'none');
      th.setAttribute('title', 'Sort by ' + text(th));
      th.setAttribute('role', 'button');
      th.setAttribute('tabindex', '0');
      const ind = document.createElement('span');
      ind.className = 'sort-ind';
      ind.setAttribute('aria-hidden', 'true');
      ind.textContent = INDICATOR.none;
      th.appendChild(ind);

      const apply = () => {
        state[index] = (state[index] + 1) % 3;
        headers.forEach((other, j) => {
          if (j !== index) {
            state[j] = 0;
            const o = other.querySelector('.sort-ind');
            if (o) o.textContent = INDICATOR.none;
            other.setAttribute('aria-sort', 'none');
          }
        });

        let rows;
        if (state[index] === 0) {
          rows = original;
          th.setAttribute('aria-sort', 'none');
          ind.textContent = INDICATOR.none;
        } else {
          const dir = state[index] === 1 ? 1 : -1;
          const numericCol = numeric[index];
          rows = [...original].sort((r1, r2) => {
            const v1 = numericCol ? value(r1.cells[index]) : text(r1.cells[index]) || null;
            const v2 = numericCol ? value(r2.cells[index]) : text(r2.cells[index]) || null;
            return dir * compare(v1, v2, numericCol);
          });
          th.setAttribute('aria-sort', state[index] === 1 ? 'ascending' : 'descending');
          ind.textContent = state[index] === 1 ? INDICATOR.asc : INDICATOR.desc;
        }

        const frag = document.createDocumentFragment();
        rows.forEach((r) => frag.appendChild(r));
        body.appendChild(frag);
      };

      th.addEventListener('click', apply);
      th.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          apply();
        }
      });
    });
  }

  const init = () => document.querySelectorAll('table.data-table').forEach(makeSortable);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
