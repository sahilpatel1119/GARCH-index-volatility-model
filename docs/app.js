// Global data storage
let garchData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

// Load JSON data
async function loadData() {
    try {
        const response = await fetch('../reports/summary.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        
        garchData = await response.json();
        
        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
        // Render initial selection
        renderDashboard('^FTSE');
        
    } catch (error) {
        showError(`Error loading data: ${error.message}. Make sure you're running this on a web server or GitHub Pages.`);
    }
}

// Setup event listeners
function setupEventListeners() {
    const selector = document.getElementById('indexSelector');
    selector.addEventListener('change', (e) => {
        renderDashboard(e.target.value);
    });
}

// Show error message
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Main render function
function renderDashboard(ticker) {
    if (!garchData || !garchData[ticker]) {
        showError(`No data found for ${ticker}`);
        return;
    }
    
    const data = garchData[ticker];
    
    // Check for errors in data
    if (data.error) {
        showError(`Analysis failed: ${data.error}`);
        return;
    }
    
    // Render all components
    renderModelInfo(data);
    renderVolatilitySummary(data);
    renderVolatilityChart(data, ticker);
    renderDiagnostics(data);
    renderVarTable(data);
}

// Render model information
function renderModelInfo(data) {
    const modelType = data.selected_model.toUpperCase();
    document.getElementById('selectedModel').textContent = `GARCH(1,1) - ${modelType}`;
    document.getElementById('aicNormal').textContent = data.aic_values.normal.toFixed(2);
    document.getElementById('aicStudentT').textContent = data.aic_values.t.toFixed(2);
}

// Render volatility summary
function renderVolatilitySummary(data) {
    const summary = data.summary;
    document.getElementById('totalObs').textContent = summary.total_observations.toLocaleString();
    document.getElementById('meanVol').textContent = `${summary.mean_volatility.toFixed(4)}%`;
    document.getElementById('maxVol').textContent = `${summary.max_volatility.toFixed(4)}%`;
    document.getElementById('minVol').textContent = `${summary.min_volatility.toFixed(4)}%`;
}

// Render volatility chart using Plotly
function renderVolatilityChart(data, ticker) {
    const tickerName = ticker === '^FTSE' ? 'FTSE 100' : 'S&P 500';
    
    const trace = {
        x: data.volatility_index,
        y: data.volatility,
        type: 'scatter',
        mode: 'lines',
        name: 'Volatility',
        line: {
            color: '#58a6ff',
            width: 1.5
        }
    };
    
    const layout = {
        title: {
            text: `${tickerName} - Conditional Volatility (GARCH 1,1)`,
            font: {
                color: '#c9d1d9',
                size: 16
            }
        },
        xaxis: {
            title: 'Date',
            gridcolor: '#30363d',
            color: '#8b949e'
        },
        yaxis: {
            title: 'Volatility (%)',
            gridcolor: '#30363d',
            color: '#8b949e'
        },
        plot_bgcolor: '#161b22',
        paper_bgcolor: '#21262d',
        font: {
            color: '#c9d1d9'
        },
        hovermode: 'x unified',
        margin: {
            l: 60,
            r: 30,
            t: 50,
            b: 60
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot('volatilityChart', [trace], layout, config);
}

// Render diagnostics
function renderDiagnostics(data) {
    const diag = data.diagnostics;
    
    // Ljung-Box
    document.getElementById('lbStat').textContent = diag.ljung_box.test_statistic.toFixed(4);
    document.getElementById('lbPvalue').textContent = diag.ljung_box.p_value.toFixed(4);
    document.getElementById('lbLags').textContent = diag.ljung_box.lags;
    
    // Ljung-Box Squared
    document.getElementById('lbsqStat').textContent = diag.ljung_box_squared.test_statistic.toFixed(4);
    document.getElementById('lbsqPvalue').textContent = diag.ljung_box_squared.p_value.toFixed(4);
    document.getElementById('lbsqLags').textContent = diag.ljung_box_squared.lags;
    
    // ARCH LM
    document.getElementById('archStat').textContent = diag.arch_lm.lm_statistic.toFixed(4);
    document.getElementById('archPvalue').textContent = diag.arch_lm.lm_p_value.toFixed(4);
    document.getElementById('archLags').textContent = diag.arch_lm.lags;
}

// Render VaR table
function renderVarTable(data) {
    const varBacktest = data.var_backtest;
    const tbody = document.getElementById('varTableBody');
    tbody.innerHTML = '';
    
    // Sort by confidence level
    const varLevels = Object.keys(varBacktest).sort();
    
    varLevels.forEach(level => {
        const varData = varBacktest[level];
        const kupiec = varData.kupiec_test;
        const cl = (varData.confidence_level * 100).toFixed(0);
        
        const row = document.createElement('tr');
        
        const resultClass = kupiec.reject_null ? 'result-reject' : 'result-pass';
        const resultText = kupiec.reject_null ? '❌ Reject' : '✅ Pass';
        
        row.innerHTML = `
            <td>${cl}%</td>
            <td>${varData.total_observations.toLocaleString()}</td>
            <td>${varData.exceptions}</td>
            <td>${kupiec.expected_exceptions.toFixed(1)}</td>
            <td>${kupiec.observed_rate.toFixed(4)}</td>
            <td>${kupiec.lr_statistic.toFixed(2)}</td>
            <td>${kupiec.p_value.toFixed(4)}</td>
            <td class="${resultClass}">${resultText}</td>
        `;
        
        tbody.appendChild(row);
    });
}
