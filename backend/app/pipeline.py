"""
Full GARCH volatility modeling pipeline.
"""
import pandas as pd
from .data import download_returns
from .models import select_best_model
from .diagnostics import compute_diagnostics
from .backtest import backtest_var


def run_pipeline(ticker: str, start_date: str) -> dict:
    """
    Run complete GARCH volatility analysis pipeline.
    
    Parameters
    ----------
    ticker : str
        Ticker symbol (e.g., '^FTSE', '^GSPC')
    start_date : str
        Start date in 'YYYY-MM-DD' format
    
    Returns
    -------
    dict
        Complete analysis results including:
        - ticker
        - selected_model
        - aic_values
        - volatility (as list)
        - diagnostics
        - var_backtest
    """
    # Step 1: Load returns
    returns = download_returns(ticker, start_date)
    
    # Step 2: Fit models and select best
    model_selection = select_best_model(returns)
    
    selected_model = model_selection['selected_model']
    model_output = model_selection['model_output']
    
    # Step 3: Extract model outputs
    conditional_volatility = model_output['conditional_volatility']
    standardised_residuals = model_output['standardised_residuals']
    
    # Step 4: Compute diagnostics
    diagnostics = compute_diagnostics(standardised_residuals, lags=10)
    
    # Step 5: VaR backtesting
    var_backtest = backtest_var(returns, conditional_volatility, confidence_levels=[0.95, 0.99])
    
    # Step 6: Prepare JSON-safe output
    result = {
        'ticker': ticker,
        'selected_model': selected_model,
        'aic_values': {
            'normal': model_selection['aic_normal'],
            't': model_selection['aic_t']
        },
        'volatility': conditional_volatility.tolist(),
        'volatility_index': conditional_volatility.index.strftime('%Y-%m-%d').tolist(),
        'diagnostics': diagnostics,
        'var_backtest': var_backtest,
        'summary': {
            'total_observations': len(returns),
            'mean_volatility': float(conditional_volatility.mean()),
            'max_volatility': float(conditional_volatility.max()),
            'min_volatility': float(conditional_volatility.min())
        }
    }
    
    return result
