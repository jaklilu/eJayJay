(() => {
  const GATE_PASSWORD = "ejayjay";
  const GATE_STORAGE_KEY = "ejayjay-link-unlocked";

  const page = document.body.dataset.moneyPage;
  const gate = document.getElementById("link-gate");
  const gateForm = document.getElementById("link-gate-form");
  const gateInput = document.getElementById("gate-password");
  const gateError = document.getElementById("gate-error");
  const bodyEl = document.querySelector(".money-body");

  const isUnlocked = () => {
    if (localStorage.getItem(GATE_STORAGE_KEY) === "1") return true;
    if (sessionStorage.getItem(GATE_STORAGE_KEY) === "1") {
      localStorage.setItem(GATE_STORAGE_KEY, "1");
      sessionStorage.removeItem(GATE_STORAGE_KEY);
      return true;
    }
    return false;
  };

  const money = (n) => {
    const abs = Math.abs(Number(n) || 0);
    const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${n < 0 ? "-" : ""}$${formatted}`;
  };

  const showGate = () => {
    document.body.classList.add("is-gate-open", "money-locked");
    if (gate) gate.hidden = false;
    if (gateInput) gateInput.focus();
  };

  const reveal = () => {
    document.body.classList.remove("is-gate-open", "money-locked");
    if (gate) gate.hidden = true;
    if (bodyEl) bodyEl.hidden = false;
    load();
  };

  const load = () => {
    fetch("/data/money.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("missing");
        return r.json();
      })
      .then((data) => {
        if (page === "recurring") renderRecurring(data);
        if (page === "expenses") renderExpenses(data);
      })
      .catch(() => {
        const host = document.getElementById("money-root");
        if (host) host.innerHTML = "<p>Could not load money data.</p>";
      });
  };

  const renderSnap = (data) => {
    const s = data.snapshot || {};
    return `
      <div class="money-snap">
        <div class="money-snap__item">
          <p class="money-snap__label">Recurring (last 3 mo avg)</p>
          <p class="money-snap__value">${money(s.recurring_last3)}</p>
        </div>
        <div class="money-snap__item">
          <p class="money-snap__label">Other expenses (last 3 mo avg)</p>
          <p class="money-snap__value">${money(s.expenses_last3)}</p>
        </div>
        <div class="money-snap__item">
          <p class="money-snap__label">Income (last 3 mo avg)</p>
          <p class="money-snap__value">${money(s.income_last3)}</p>
        </div>
      </div>
    `;
  };

  const renderMonths = (data) => {
    const rows = (data.months || [])
      .map(
        (m) => `
      <tr>
        <td>${m.month}</td>
        <td class="num">${money(m.recurring)}</td>
        <td class="num">${money(m.expenses)}</td>
        <td class="num">${money(m.income)}</td>
      </tr>`
      )
      .join("");
    return `
      <h2 class="money-cat" style="margin-top:2rem">Month by month</h2>
      <table class="money-table">
        <thead>
          <tr>
            <th>Month</th>
            <th class="num">Recurring</th>
            <th class="num">Other expenses</th>
            <th class="num">Income</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="money-note">Source: ${data.source} · ${data.period.start} – ${data.period.end}. ${data.note}</p>
    `;
  };

  const renderRecurring = (data) => {
    const host = document.getElementById("money-root");
    const notes = {
      "Lorena Abzum": "Often two payments in a month (intended $300, sometimes $150+$150 or $300+$300).",
      "AXA Equitable": "Quarterly (~$183), not monthly.",
      "Chase credit card": "Only one autopay in this statement — confirm if it continues.",
      "Scheduled account payment": "New in Aug/Sep 2026 (two different account numbers).",
      "Robinhood auto-invest": "$25 weekly when it ran; missing some later months.",
      "Tesla Insurance": "Rose from ~$1,424 to $1,779.",
    };
    const rows = (data.recurring || [])
      .map((r) => {
        const note = notes[r.name] ? `<p class="money-note">${notes[r.name]}</p>` : "";
        return `<tr>
          <td>${r.name}${note}</td>
          <td>${r.category}</td>
          <td>${r.cadence}</td>
          <td class="num">${r.month_count}</td>
          <td class="num">${money(r.last3_avg)}</td>
          <td class="num">${money(r.typical_month)}</td>
        </tr>`;
      })
      .join("");
    const errors = (data.grok_errors || [])
      .map((e) => `<dt>${e.item}</dt><dd>${e.why}</dd>`)
      .join("");
    host.innerHTML = `
      ${renderSnap(data)}
      <table class="money-table">
        <thead>
          <tr>
            <th>Charge</th>
            <th>Category</th>
            <th>Cadence</th>
            <th class="num">Months seen</th>
            <th class="num">Recent monthly</th>
            <th class="num">Typical / period</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="money-errors">
        <h2>What the receipt scan got wrong</h2>
        <dl>${errors}</dl>
      </div>
      ${renderMonths(data)}
    `;
  };

  const FULL_MONTHS = [
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
  ];

  const monthHits = (item) =>
    (item.months || []).filter((m) => FULL_MONTHS.includes(m)).length;

  const renderExpenses = (data) => {
    const host = document.getElementById("money-root");
    const flat = [];
    (data.expenses || []).forEach((c) => {
      (c.items || []).forEach((i) => {
        flat.push({ ...i, category: c.category, hits: monthHits(i) });
      });
    });
    const yearRound = flat.filter((i) => i.hits === 12);
    const yearHtml = yearRound
      .map(
        (i) => `
      <div class="money-year">
        <p class="money-page__kicker">Paid every month · Sep 2025 – Aug 2026</p>
        <h2>${i.name}</h2>
        <p class="money-note">${i.category} · ${i.tx_count} payments · ${money(i.total)} in the statement year. No other expense-line hit all 12 months. Utilities, rent, and insurance already sit on Recurring.</p>
      </div>`
      )
      .join("");
    const cats = (data.expenses || [])
      .map((c) => {
        const items = (c.items || [])
          .map((i) => {
            const hits = monthHits(i);
            const mark = hits === 12 ? " · every month" : hits ? ` · ${hits}/12 mo` : "";
            return `<tr>
              <td>${i.name}${mark}</td>
              <td class="num">${i.tx_count}</td>
              <td class="num">${money(i.total)}</td>
            </tr>`;
          })
          .join("");
        return `
          <section class="money-cat">
            <h2>${c.category} · ${money(c.total)}</h2>
            <table class="money-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="num">Txns</th>
                  <th class="num">Total in period</th>
                </tr>
              </thead>
              <tbody>${items}</tbody>
            </table>
          </section>
        `;
      })
      .join("");
    host.innerHTML = `
      ${renderSnap(data)}
      ${yearHtml}
      <p class="money-lede" style="margin-bottom:1.5rem">Everything else below was not paid in every month of the year — travel, repairs, taxes, edir, and similar.</p>
      ${cats}
      ${renderMonths(data)}
    `;
  };

  if (gateForm) {
    gateForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (gateInput && gateInput.value === GATE_PASSWORD) {
        localStorage.setItem(GATE_STORAGE_KEY, "1");
        reveal();
        return;
      }
      if (gateError) gateError.hidden = false;
    });
  }

  if (isUnlocked()) reveal();
  else showGate();
})();
