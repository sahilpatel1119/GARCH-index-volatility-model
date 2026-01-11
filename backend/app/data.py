"""
Data loading and preprocessing functions.
"""
import pandas as pd
import yfinance as yf
import numpy as np


def download_returns(ticker: str, start_date: str) -> pd.Series:
    """
    Download daily adjusted close prices and compute log returns.
    
    Parameters
    ----------
    ticker : str
        Ticker symbol (e.g., '^FTSE', '^GSPC')
    start_date : str
        Start date in 'YYYY-MM-DD' format
    
    Returns
    -------
    pd.Series
        Log returns in percentage terms, with missing values dropped
    """
    data: pd.DataFrame = yf.download(ticker, start=start_date, progress=False)  # type: ignore
    
    if data is None or data.empty:
        raise ValueError(f"No data downloaded for ticker {ticker}")
    
    # Extract adjusted close prices
    if 'Adj Close' in data.columns:
        prices = data['Adj Close']
    elif 'Close' in data.columns:
        prices = data['Close']
    else:
        raise ValueError("No price column found in downloaded data")
    
    # Compute log returns in percentage terms
    returns: pd.Series = 100 * np.log(prices / prices.shift(1))  # type: ignore
    
    # Drop missing values
    returns = returns.dropna()  # type: ignore
    
    # Ensure it's a Series with datetime index
    returns.name = ticker
    
    return returns
