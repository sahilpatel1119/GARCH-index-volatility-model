# GARCH Index Volatility Model

This project applies **GARCH(1,1)** volatility models to major equity indices to analyse
volatility dynamics and assess market risk using **Value-at-Risk (VaR) backtesting**.

The project is designed as an **educational and portfolio demonstration**, focusing on
clear methodology, reproducible analysis, and clean visualisation.

---

## 📊 Indices Analysed
- **FTSE 100 (UK)**
- **S&P 500 (USA)**

Daily adjusted close prices are sourced from Yahoo Finance and processed into log returns.

---

## 🔧 Methodology

### Volatility Modelling
- Log returns (percentage)
- GARCH(1,1) specification
- Distributional assumptions:
  - Gaussian
  - Student-t
- Model selection via **Akaike Information Criterion (AIC)**

### Diagnostics
- Ljung–Box test on standardised residuals
- Ljung–Box test on squared residuals
- ARCH LM test

These tests assess whether the model adequately captures serial correlation and remaining
heteroskedasticity.

### Risk Evaluation
- 1-day ahead **Value-at-Risk (VaR)** at:
  - 95% confidence
  - 99% confidence
- **Kupiec Proportion-of-Failures test** for VaR backtesting

---

## 📈 Dashboard Preview

### Volatility Analysis Dashboard
The Streamlit frontend provides an interactive dashboard to explore results for each index:

- Model selection summary (Normal vs Student-t)
- AIC comparison
- Volatility statistics
- Conditional volatility time series
- Diagnostic test results
- VaR backtest outcomes

#### Example: FTSE 100 Conditional Volatility
![FTSE 100 Conditional Volatility](reports/figures/ftse_volatility.png)

---

## ▶️ How to Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
