let rawData = null;
let chart = null;

function $(id) {
  return document.getElementById(id);
}

function showError(message) {
  const el = $("errorBox");
  el.style.display = "block";
  el.textContent = message;
}

function showInfo(message) {
  // Reuse error box as an info/status box (keeps UI simple)
  const el = $("errorBox");
  el.style.display = "block";
  el.style.color = "#b6d7ff";
  el.textContent = message;
}

function hideBox() {
  const el = $("errorBox");
  el.style.display = "none";
  el.textContent = "";
  el.style.color = "";
}

function normaliseTopLevel(data) {
  // Supports:
  // A) { "^FTSE": {...}, "^GSPC": {...} }
  // B) [ { "ticker":"^FTSE", ... }, { "ticker":"^GSPC", ... } ]
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((d) => [d.ticker, d]));
  }
  return data;
}

function toNumberArray(x) {
  // Accepts list OR dict-of-indexes OR nested container
  if (!x) return [];
  if (Array.isArray(x)) {
    return x.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }
  if (typeof x === "object") {
    // Sometimes series come as {0:...,1:...} or {values:[...]}
    if (Array.isArray(x.values)) {
      return x.values.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
    return Object.values(x).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }
  return [];
}

function formatNumber(x, dp = 2) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return Number(x).toFixed(dp);
}

function buildCards(result) {
  const cards = $("cards");
  cards.innerHTML = "";

  const selected = result.selected_model || result.selected_distribution || "—";
  const aic = result.aic_values || result.aic || {};
  const aicNormal = aic.normal ?? aic.gaussian ?? aic.Normal ?? null;
  const aicT = aic.t ?? aic.student_t ?? aic["Student-t"] ?? null;

  const volNums = toNumberArray(result.volatility_series || result.volatility);
  const n = volNums.length;
  const meanVol = n ? volNums.reduce((a, b) => a + b, 0) / n : null;
  const maxVol = n ? Math.max(...volNums) : null;
  const minVol = n ? Math.min(...volNums) : null;

  const items = [
    ["Selected distribution", selected],
    ["AIC (Normal)", formatNumber(aicNormal, 2)],
    ["AIC (Student-t)", formatNumber(aicT, 2)],
    ["Observations", n ? String(n) : "—"],
    ["Mean volatility", formatNumber(meanVol, 4)],
    ["Max volatility", formatNumber(maxVol, 4)],
    ["Min volatility", formatNumber(minVol, 4)],
  ];

  for (const [k, v] of items) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>`;
    cards.appendChild(div);
  }
}

function renderChart(result) {
  const volNums = toNumberArray(result.volatility_series || result.volatility);

  if (!volNums.length) {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    showError("No volatility data found in summary.json for this index. Check the JSON keys: volatility_series/volatility.");
    return;
  }

  const labels = volNums.map((_, i) => i + 1);

  const ctx = $("volChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Conditional volatility",
          data: volNums,
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.15,
        },
      ],
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

function buildVaRTable(result) {
  const container = $("varTable");
  container.innerHTML = "";

  const varRes = result.var_backtest || result.var_results || result.var || null;
  if (!varRes) {
    container.textContent = "VaR results not found in summary.json (expected key: var_backtest).";
    return;
  }

  const rows = [];
  if (Array.isArray(varRes)) {
    rows.push(...varRes);
  } else {
    for (const key of Object.keys(varRes)) {
      rows.push({ level: key, ...varRes[key] });
    }
  }

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
    const level = r.level ?? r.confidence_level ?? "—";
    const exceptions = r.exceptions ?? r.exception_count ?? "—";
    const expected = r.expected_exceptions ?? r.expected ?? "—";
    const obsRate = r.observed_rate ?? r.rate ?? "—";
    const lr = r.kupiec_lr_stat ?? r.kupiec_lr ?? r.lr_stat ?? r.lr ?? null;
    const p = r.p_value ?? r.kupiec_pvalue ?? r.pvalue ?? null;
    const resultText =
      r.result ??
      (r.pass === true ? "PASS" : r.pass === false ? "REJECT" : "—");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${level}</td>
      <td>${exceptions}</td>
      <td>${expected}</td>
      <td>${typeof obsRate === "number" ? obsRate.toFixed(4) : obsRate}</td>
      <td>${formatNumber(lr, 2)}</td>
      <td>${formatNumber(p, 4)}</td>
      <td>${resultText}</td>
    `;
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

function renderSelected(ticker) {
  hideBox();

  const byTicker = normaliseTopLevel(rawData);
  const result = byTicker[ticker];

  if (!result) {
    showError(
      `No results found for ${ticker}. Check docs/summary.json top-level keys.`
    );
    return;
  }

  buildCards(result);
  renderChart(result);
  buildVaRTable(result);

  // Helpful status for debugging (will not show if you comment it out)
  const volNums = toNumberArray(result.volatility_series || result.volatility);
  showInfo(`Loaded ${ticker}. Volatility points: ${volNums.length}.`);
}

async function init() {
  try {
    const resp = await fetch("summary.json", { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to load data: ${resp.status}`);
    rawData = await resp.json();
  } catch (err) {
    showError(
      `Error loading data: ${err.message}. Make sure docs/summary.json exists and is served by GitHub Pages.`
    );
    return;
  }

  const select = $("indexSelect");
  select.addEventListener("change", () => renderSelected(select.value));
  renderSelected(select.value);
}

document.addEventListener("DOMContentLoaded", init);
