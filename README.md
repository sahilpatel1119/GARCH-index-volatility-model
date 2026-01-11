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
Run the backend analysis:
```bash
python backend/main.py
