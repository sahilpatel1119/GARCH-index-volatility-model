// Zero-dependency GitHub Pages dashboard (no eval, no external libraries)
// Loads docs/summary.json and renders cards, SVG line chart, and VaR table.

function el(id) { return document.getElementById(id); }

function setStatus(message, isError = false) {
  const box = el("statusBox");
  if (!box) return;
  box.style.display = "block";
  box.className = isError ? "status error" : "status";
  box.textContent = message;
}

function hideStatus() {
  const box = el("statusBox");
  if (!box) return;
  box.style.display = "none";
  box.textContent = "";
  box.className = "status";
}

function normaliseTopLevel(data) {
  // supports { "^FTSE": {...}, "^GSPC": {...} } OR [ {ticker:"^FTSE",...}, ... ]
  if (Array.isArray(data)) {
    const out = {};
    for (const item of data) {
      if (item && item.ticker) out[item.ticker] = item;
    }
    return out;
  }
  return data || {};
}

function toNumArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(Number).filter(Number.isFinite);
  if (typeof x === "object") {
    if (Array.isArray(x.values)) return x.values.map(Number).filter(Number.isFinite);
    return Object.values(x).map(Number).filter(Number.isFinite);
  }
  return [];
}

function fmt(x, dp = 2) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function fmtPValue(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  if (n < 0.0001) return n.toExponential(2);
  return n.toFixed(4);
}

function renderCards(result) {
  const cards = el("cards");
  if (!cards) return;
  cards.innerHTML = "";

  const selected = result.selected_model || result.selected_distribution || "—";
  const aic = result.aic_values || result.aic || {};
  const aicNormal = aic.normal ?? aic.gaussian ?? aic.Normal ?? null;
  const aicT = aic.t ?? aic.student_t ?? aic["Student-t"] ?? null;

  const vol = toNumArray(result.volatility_series || result.volatility);
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

function svgClear(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function svgLine(svg, x1, y1, x2, y2, stroke, strokeWidth, opacity = 1) {
  const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
  ln.setAttribute("x1", x1);
  ln.setAttribute("y1", y1);
  ln.setAttribute("x2", x2);
  ln.setAttribute("y2", y2);
  ln.setAttribute("stroke", stroke);
  ln.setAttribute("stroke-width", strokeWidth);
  ln.setAttribute("opacity", opacity);
  svg.appendChild(ln);
}

function svgPath(svg, d, stroke, strokeWidth) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", strokeWidth);
  p.setAttribute("vector-effect", "non-scaling-stroke");
  svg.appendChild(p);
}

function renderVolatilityChart(result) {
  const svg = el("volChart");
  if (!svg) return;
  svgClear(svg);

  const vol = toNumArray(result.volatility_series || result.volatility);
  if (!vol.length) {
    setStatus("No volatility series found for this index in summary.json.", true);
    return;
  }

  // Chart area
  const W = 1000, H = 360;
  const padL = 48, padR = 12, padT = 12, padB = 28;
  const w = W - padL - padR;
  const h = H - padT - padB;

  const minV = Math.min(...vol);
  const maxV = Math.max(...vol);
  const span = (maxV - minV) || 1;

  const x = (i) => padL + (i / (vol.length - 1)) * w;
  const y = (v) => padT + (1 - (v - minV) / span) * h;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const yy = padT + (i / 4) * h;
    svgLine(svg, padL, yy, padL + w, yy, "#243044", 1, 0.6);
  }
  svgLine(svg, padL, padT, padL, padT + h, "#243044", 1, 0.8);
  svgLine(svg, padL, padT + h, padL + w, padT + h, "#243044", 1, 0.8);

  // Build path
  let d = `M ${x(0)} ${y(vol[0])}`;
  for (let i = 1; i < vol.length; i++) {
    d += ` L ${x(i)} ${y(vol[i])}`;
  }
  svgPath(svg, d, "#7fb3ff", 2);
}

function renderVaRTable(result) {
  const container = el("varTable");
  if (!container) return;
  container.innerHTML = "";

  const vb = result.var_backtest;
  if (!vb || typeof vb !== "object") {
    container.textContent = "VaR results not found (expected key: var_backtest).";
    return;
  }

  const rows = Object.keys(vb).map((key) => {
    const entry = vb[key] || {};
    const kt = entry.kupiec_test || {};

    const level = entry.confidence_level ? `${Math.round(entry.confidence_level * 100)}%` : key;

    return {
      level,
      exceptions: entry.exceptions ?? "—",
      expected: kt.expected_exceptions ?? "—",
      observedRate: kt.observed_rate ?? "—",
      lr: kt.lr_statistic ?? "—",
      p: kt.p_value ?? "—",
      reject: kt.reject_null,
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
    const badge =
      r.reject === true
        ? `<span class="badge reject">REJECT</span>`
        : r.reject === false
          ? `<span class="badge pass">PASS</span>`
          : "—";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.level}</td>
      <td>${r.exceptions}</td>
      <td>${typeof r.expected === "number" ? Number(r.expected).toFixed(1) : r.expected}</td>
      <td>${typeof r.observedRate === "number" ? Number(r.observedRate).toFixed(4) : r.observedRate}</td>
      <td>${typeof r.lr === "number" ? Number(r.lr).toFixed(2) : r.lr}</td>
      <td>${fmtPValue(r.p)}</td>
      <td>${badge}</td>
    `;
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

async function loadSummary() {
  const resp = await fetch("summary.json", { cache: "no-store" });
  if (!resp.ok) throw new Error(`Failed to load summary.json (HTTP ${resp.status})`);
  return resp.json();
}

let byTicker = {};

function render(ticker) {
  hideStatus();

  const result = byTicker[ticker];
  if (!result) {
    setStatus(`No results found for ${ticker} in summary.json.`, true);
    return;
  }

  renderCards(result);
  renderVolatilityChart(result);
  renderVaRTable(result);

  const points = toNumArray(result.volatility_series || result.volatility).length;
  setStatus(`Loaded ${ticker}. Volatility points: ${points}.`);
}

async function init() {
  try {
    const data = await loadSummary();
    byTicker = normaliseTopLevel(data);
  } catch (err) {
    setStatus(`Error loading data: ${err.message}`, true);
    return;
  }

  const select = el("indexSelect");
  if (!select) {
    setStatus("Missing indexSelect element in index.html", true);
    return;
  }

  select.addEventListener("change", () => render(select.value));
  render(select.value);
}

document.addEventListener("DOMContentLoaded", init);
