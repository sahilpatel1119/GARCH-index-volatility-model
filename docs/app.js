/* GARCH Pages Dashboard (CSP-safe, defensive)
   - Loads docs/summary.json
   - Renders cards, volatility chart, VaR table (nested kupiec_test)
*/

let rawData = null;
let chart = null;

function getEl(id) {
  return document.getElementById(id);
}

function ensureErrorBox() {
  let el = getEl("errorBox");
  if (!el) {
    // Create a fallback error box so the app never crashes due to missing HTML
    el = document.createElement("div");
    el.id = "errorBox";
    el.style.display = "none";
    el.style.marginTop = "12px";
    el.style.padding = "10px";
    el.style.border = "1px solid #243044";
    el.style.borderRadius = "10px";
    el.style.background = "#0f1622";
    el.style.color = "#ffb4b4";
    const container = document.body;
    container.appendChild(el);
  }
  return el;
}

function showMessage(message, kind = "info") {
  const el = ensureErrorBox();
  el.style.display = "block";
  el.style.color = kind === "error" ? "#ffb4b4" : "#b6d7ff";
  el.textContent = message;
}

function hideMessage() {
  const el = ensureErrorBox();
  el.style.display = "none";
  el.textContent = "";
}

function normaliseTopLevel(data) {
  // Supports:
  // A) { "^FTSE": {...}, "^GSPC": {...} }
  // B) [ { "ticker":"^FTSE", ... }, ... ]
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((d) => [d.ticker, d]));
  }
  return data;
}

function toNumberArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) {
    return x.map(Number).filter((v) => Number.isFinite(v));
  }
  if (typeof x === "object") {
    if (Array.isArray(x.values)) {
      return x.values.map(Number).filter((v) => Number.isFinite(v));
    }
    return Object.values(x).map(Number).filter((v) => Number.isFinite(v));
  }
  return [];
}

function fmt(x, dp = 2) {
  if (x === null || x === undefined || !Number.isFinite(Number(x))) return "—";
  return Number(x).toFixed(dp);
}

function renderCards(result) {
  const cards = getEl("cards");
  if (!cards) return;

  cards.innerHTML = "";

  const selected = result.selected_model || result.selected_distribution || "—";
  const aic = result.aic_values || result.aic || {};
  const aicNormal = aic.normal ?? aic.gaussian ?? aic.Normal ?? null;
  const aicT = aic.t ?? aic.student_t ?? aic["Student-t"] ?? null;

  const vol = toNumberArray(result.volatility_series || result.volatility);
  const n = vol.length;
  const mean = n ? vol.reduce((a, b) => a + b, 0) / n : null;
  const max = n ? Math.max(...vol) : null;
  const min = n ? Math.min(...vol) : null;

  const items = [
    ["Selected distribution", selected],
    ["AIC (Normal)", fmt(aicNormal, 2)],
    ["AIC (Student-t)", fmt(aicT, 2)],
    ["Observations", n ? String(n) : "—"],
    ["Mean volatility", fmt(mean, 4)],
    ["Max volatility", fmt(max, 4)],
    ["Min volatility", fmt(min, 4)],
  ];

  for (const [k, v] of items) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>`;
    cards.appendChild(div);
  }
}

function renderVolChart(result) {
  const canvas = getEl("volChart");
  if (!canvas) return;

  const vol = toNumberArray(result.volatility_series || result.volatility);
  if (!vol.length) {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    showMessage("No volatility series found in summary.json for this index.", "error");
    return;
  }

  // Ensure Chart.js exists
  if (typeof Chart === "undefined") {
    showMessage("Chart.js did not load. Check script order in docs/index.html.", "error");
    return;
  }

  const labels = vol.map((_, i) => i + 1);

  const ctx = canvas.getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Conditional volatility",
        data: vol,
        pointRadius: 0,
        borderWidth: 1,
        tension: 0.15,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: "Observation" } },
        y: { title: { display: true, text: "Volatility" } },
      },
    },
  });
}

function renderVaRTable(result) {
  const container = getEl("varTable");
  if (!container) return;

  container.innerHTML = "";

  const vb = result.var_backtest;
  if (!vb || typeof vb !== "object") {
    container.textContent = "VaR results not found (expected: var_backtest).";
    return;
  }

  const rows = Object.keys(vb).map((key) => {
    const entry = vb[key] || {};
    const kt = entry.kupiec_test || {};

    const levelLabel = entry.confidence_level
      ? `${Math.round(entry.confidence_level * 100)}%`
      : key;

    return {
      level: levelLabel,
      exceptions: entry.exceptions ?? "—",
      expected: kt.expected_exceptions ?? "—",
      observedRate: kt.observed_rate ?? "—",
      lr: kt.lr_statistic ?? "—",
      p: kt.p_value ?? "—",
      result: kt.reject_null === true ? "REJECT" : kt.reject_null === false ? "PASS" : "—",
    };
  });

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Level</th>
        <th>Exceptions</th>
        <th>Expected</th>
        <th>Observed rate</th>
        <th>Kupiec LR</th>
        <th>p-value</th>
        <th>Result</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  for (const r of rows) {
    const pVal =
      typeof r.p === "number"
        ? (r.p < 0.0001 ? r.p.toExponential(2) : r.p.toFixed(4))
        : r.p;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.level}</td>
      <td>${r.exceptions}</td>
      <td>${typeof r.expected === "number" ? r.expected.toFixed(1) : r.expected}</td>
      <td>${typeof r.observedRate === "number" ? r.observedRate.toFixed(4) : r.observedRate}</td>
      <td>${typeof r.lr === "number" ? r.lr.toFixed(2) : r.lr}</td>
      <td>${pVal}</td>
      <td>${r.result}</td>
    `;
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

function render(ticker) {
  hideMessage();

  const byTicker = normaliseTopLevel(rawData);
  const result = byTicker[ticker];

  if (!result) {
    showMessage(`No results found for ${ticker} in summary.json.`, "error");
    return;
  }

  renderCards(result);
  renderVolChart(result);
  renderVaRTable(result);

  const volCount = toNumberArray(result.volatility_series || result.volatility).length;
  showMessage(`Loaded ${ticker}. Volatility points: ${volCount}.`, "info");
}

async function init() {
  try {
    const resp = await fetch("summary.json", { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to load summary.json: HTTP ${resp.status}`);
    rawData = await resp.json();
  } catch (err) {
    showMessage(`Error loading data: ${err.message}`, "error");
    return;
  }

  const select = getEl("indexSelect");
  if (!select) {
    showMessage("Missing <select id='indexSelect'> in docs/index.html", "error");
    return;
  }

  select.addEventListener("change", () => render(select.value));
  render(select.value);
}

document.addEventListener("DOMContentLoaded", init);
