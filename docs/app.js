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

  const varRes = result.var_backtest || null;
  if (!varRes || typeof varRes !== "object") {
    container.textContent = "VaR results not found in summary.json (expected key: var_backtest).";
    return;
  }

  const rows = Object.keys(varRes).map((key) => {
    const entry = varRes[key] || {};
    const kt = entry.kupiec_test || {};

    // Convert level labels to something readable
    const levelLabel =
      entry.confidence_level ? `${Math.round(entry.confidence_level * 100)}%` : key;

    return {
      level: levelLabel,
      exceptions: entry.exceptions ?? "—",
      expected: kt.expected_exceptions ?? "—",
      observedRate: kt.observed_rate ?? "—",
      kupiecLR: kt.lr_statistic ?? "—",
      pValue: kt.p_value ?? "—",
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
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.level}</td>
      <td>${r.exceptions}</td>
      <td>${typeof r.expected === "number" ? r.expected.toFixed(1) : r.expected}</td>
      <td>${typeof r.observedRate === "number" ? r.observedRate.toFixed(4) : r.observedRate}</td>
      <td>${typeof r.kupiecLR === "number" ? r.kupiecLR.toFixed(2) : r.kupiecLR}</td>
      <td>${typeof r.pValue === "number" ? r.pValue.toExponential(2) : r.pValue}</td>
      <td>${r.result}</td>
    `;
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}
