# GARCH Index Volatility Model

This project applies GARCH-family volatility models to major equity indices:
- FTSE 100 (UK)
- S&P 500 (USA)

The focus is on volatility estimation and Value-at-Risk (VaR) backtesting using
publicly available market data.

## Methods
- Log returns from daily adjusted close prices
- GARCH(1,1) with Normal and Student-t distributions
- Model selection via AIC
- Diagnostic tests (Ljung–Box, ARCH LM)
- 1-day VaR (95% and 99%) with Kupiec backtesting

## Data
Market data is fetched at runtime using Yahoo Finance.  
No raw price data is stored or committed to this repository.

## Usage

### Run Backend Analysis

```bash
python backend/main.py
```

This will:
1. Download data for FTSE 100 and S&P 500
2. Fit GARCH(1,1) models with Normal and Student-t distributions
3. Select the best model by AIC
4. Perform diagnostic tests
5. Run VaR backtesting at 95% and 99% confidence levels
6. Save results to `reports/summary.json`

### Launch Interactive Dashboard

After running the backend, visualize results with Streamlit:

```bash
streamlit run app.py
```

The dashboard provides:
- Index selection dropdown (FTSE 100 / S&P 500)
- Model information and AIC comparison
- Interactive volatility plots
- Diagnostic test results
- VaR backtesting summary tables

## Installation

```bash
# Clone the repository
git clone https://github.com/sahilpatel1119/GARCH-index-volatility-model.git
cd GARCH-index-volatility-model

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Project Structure

```
backend/
├── app/
│   ├── data.py          # Data loading and preprocessing
│   ├── models.py        # GARCH model fitting
│   ├── diagnostics.py   # Statistical tests
│   ├── backtest.py      # VaR backtesting
│   └── pipeline.py      # Full analysis pipeline
└── main.py              # Entry point

app.py                   # Streamlit dashboard
reports/
└── summary.json         # Analysis results (generated)
```

## Dependencies

- `yfinance` - Market data download
- `pandas` - Data manipulation
- `numpy` - Numerical operations
- `arch` - GARCH modeling
- `statsmodels` - Statistical tests
- `scipy` - Statistical distributions
- `matplotlib` - Plotting
- `streamlit` - Interactive dashboard

## License

MIT License - See [LICENSE](LICENSE) file

## Author

Sahil Patel - [GitHub](https://github.com/sahilpatel1119)
