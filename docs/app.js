let rawData = null;
let chart = null;

function showError(message) {
  const el = document.getElementById("errorBox");
  el.style.display = "block";
  el.textContent = message;
}

function hideError() {
  const el = document.getElementById("errorBox");
  el.style.display = "none";
  el.textContent = "";
}

function normaliseData(data) {
  // Supports either { "^FTSE": {...}, "^GSPC": {...} } OR [ {ticker:"^FTSE",...}, ... ]
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((d) => [d.ticker, d]));
  }
  return data;
}

function formatNumber(x, dp = 4) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return Number(x).toFixed(dp);
}

function buildCards(result) {
  const cards = document.getElementById("cards");
  cards.innerHTML = "";

  const selected = result.selected_model || result.selected_distribution || "—";
  const aic = result.aic_values || result.aic || {};
  const aicNormal = aic.normal ?? aic.gaussian ?? aic.Normal ?? null;
  const aicT = aic.t ?? aic.student_t ?? aic["Student-t"] ?? null;

  const vol = result.volatility_series || result.volatility || [];
  const volNums = vol.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const meanVol = volNums.length ? volNums.reduce((a, b) => a + b, 0) / volNums.length : null;
  const maxVol = volNums.length ? Math.max(...volNums) : null;
  const minVol = volNums.length ? Math.min(...volNums) : null;

  const items = [
    ["Selected distribution", selected],
    ["AIC (Normal)", formatNumber(aicNormal, 2)],
    ["AIC (Student-t)", formatNumber(aicT, 2)],
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

function buildVaRTable(result) {
  const container = document.getElementById("varTable");
  container.innerHTML = "";

  const varRes = result.var_backtest || result.var_results || result.var || null;
  if (!varRes) {
    container.textContent = "VaR results not available in summary.json";
    return;
  }

  // Expecting something like:
  // { "0.95": {...}, "0.99": {...} } OR { "95": {...}, "99": {...} } OR list
  const rows = [];
  if (Array.isArray(varRes)) {
    for (const r of varRes) rows.push(r);
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
        <th>Expected rate</th>
        <th>Kupiec LR</th>
        <th>p-value</th>
        <th>Result</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  for (const r of rows) {
    const level = r.level ?? r.confidence ?? "—";
    const exceptions = r.exceptions ?? r.exception_count ?? "—";
    const expected = r.expected_rate ?? r.alpha ?? r.expected ?? "—";
    const lr = r.kupiec_lr ?? r.lr_stat ?? r.lr ?? null;
    const p = r.kupiec_pvalue ?? r.p_value ?? r.pvalue ?? null;
    const pass = r.pass ?? r.result ?? r.status ?? null;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${level}</td>
      <td>${exceptions}</td>
      <td>${expected}</td>
      <td>${formatNumber(lr, 4)}</td>
      <td>${formatNumber(p, 4)}</td>
      <td>${pass === true ? "PASS" : pass === false ? "REJECT" : (pass ?? "—")}</td>
    `;
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

function renderChart(result) {
  const vol = result.volatility_series || result.volatility || [];
  const values = vol.map((v) => Number(v));
  const labels = values.map((_, i) => i + 1); // simple index labels (safe and consistent)

  const ctx = document.getElementById("volChart").getContext("2d");

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Conditional volatility",
          data: values,
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: { title: { display: true, text: "Observation" } },
        y: { title: { display: true, text: "Volatility" } }
      }
    }
  });
}

function renderSelected(ticker) {
  hideError();
  const byTicker = normaliseDat
