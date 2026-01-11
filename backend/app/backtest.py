"""
VaR backtesting functions.
"""
from typing import Optional
import pandas as pd
import numpy as np
from scipy import stats


def compute_var(conditional_volatility: pd.Series, confidence_level: float = 0.95) -> pd.Series:
    """
    Compute 1-day ahead Value-at-Risk.
    
    Parameters
    ----------
    conditional_volatility : pd.Series
        Conditional volatility from GARCH model (in percentage terms)
    confidence_level : float
        Confidence level (e.g., 0.95 for 95%, 0.99 for 99%)
    
    Returns
    -------
    pd.Series
        VaR series (negative values indicating potential losses)
    """
    # Compute quantile for normal distribution
    z_score = stats.norm.ppf(1 - confidence_level)
    
    # VaR = z * sigma (negative value)
    var = z_score * conditional_volatility
    
    return pd.Series(var)


def count_exceptions(returns: pd.Series, var: pd.Series) -> int:
    """
    Count VaR exceptions (returns below VaR threshold).
    
    Parameters
    ----------
    returns : pd.Series
        Actual returns (in percentage terms)
    var : pd.Series
        VaR series (negative values)
    
    Returns
    -------
    int
        Number of exceptions
    """
    # Ensure both are Series
    if isinstance(returns, pd.DataFrame):
        returns = returns.squeeze()  # type: ignore
    if isinstance(var, pd.DataFrame):
        var = var.squeeze()  # type: ignore
    
    # Align using common index
    common_index = returns.index.intersection(var.index)
    aligned_returns: pd.Series = returns.loc[common_index]  # type: ignore
    aligned_var: pd.Series = var.loc[common_index]  # type: ignore
    
    # Exception occurs when return < VaR (both are negative, so return is more negative)
    exceptions = (aligned_returns < aligned_var).sum()
    
    return int(exceptions)


def kupiec_test(exceptions: int, total_obs: int, confidence_level: float) -> dict:
    """
    Perform Kupiec proportion-of-failures test.
    
    Parameters
    ----------
    exceptions : int
        Number of VaR exceptions
    total_obs : int
        Total number of observations
    confidence_level : float
        VaR confidence level (e.g., 0.95)
    
    Returns
    -------
    dict
        Test results with statistic, p-value, and decision
    """
    # Expected failure rate
    expected_rate = 1 - confidence_level
    
    # Observed failure rate
    observed_rate = exceptions / total_obs
    
    # Likelihood ratio test statistic
    if exceptions == 0:
        lr_stat = -2 * (total_obs * np.log(1 - expected_rate))
    elif exceptions == total_obs:
        lr_stat = -2 * (total_obs * np.log(expected_rate))
    else:
        lr_stat = -2 * (
            (total_obs - exceptions) * np.log((1 - expected_rate) / (1 - observed_rate))
            + exceptions * np.log(expected_rate / observed_rate)
        )
    
    # P-value from chi-squared distribution with 1 degree of freedom
    p_value = 1 - stats.chi2.cdf(lr_stat, df=1)
    
    # Decision: reject null hypothesis if p-value < 0.05
    reject_null = p_value < 0.05
    
    return {
        'expected_exceptions': expected_rate * total_obs,
        'observed_exceptions': exceptions,
        'observed_rate': observed_rate,
        'lr_statistic': float(lr_stat),
        'p_value': float(p_value),
        'reject_null': bool(reject_null)
    }


def backtest_var(returns: pd.Series, conditional_volatility: pd.Series,
                 confidence_levels: Optional[list[float]] = None) -> dict:
    """
    Perform complete VaR backtesting.
    
    Parameters
    ----------
    returns : pd.Series
        Actual returns (in percentage terms)
    conditional_volatility : pd.Series
        Conditional volatility from GARCH model
    confidence_levels : list
        List of confidence levels to test (default: [0.95, 0.99])
    
    Returns
    -------
    dict
        Backtest results for each confidence level
    """
    if confidence_levels is None:
        confidence_levels = [0.95, 0.99]
    
    results = {}
    
    # Ensure both are Series and align properly
    if isinstance(conditional_volatility, pd.DataFrame):
        conditional_volatility = conditional_volatility.squeeze()  # type: ignore
    if isinstance(returns, pd.DataFrame):
        returns = returns.squeeze()  # type: ignore
    
    # Align using reindex for safer alignment
    common_index = returns.index.intersection(conditional_volatility.index)
    aligned_returns: pd.Series = returns.loc[common_index]  # type: ignore
    aligned_vol: pd.Series = conditional_volatility.loc[common_index]  # type: ignore
    total_obs = len(aligned_returns)
    
    for cl in confidence_levels:
        # Compute VaR
        var = compute_var(aligned_vol, confidence_level=cl)
        
        # Count exceptions
        exceptions = count_exceptions(aligned_returns, var)
        
        # Kupiec test
        kupiec_result = kupiec_test(exceptions, total_obs, cl)
        
        # Store results
        cl_key = f'var_{int(cl * 100)}'
        results[cl_key] = {
            'confidence_level': cl,
            'total_observations': total_obs,
            'exceptions': exceptions,
            'kupiec_test': kupiec_result
        }
    
    return results
