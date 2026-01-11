"""
Model diagnostics functions.
"""
import pandas as pd
import numpy as np
from statsmodels.stats.diagnostic import acorr_ljungbox, het_arch


def ljung_box_test(residuals: pd.Series, lags: int = 10) -> dict:
    """
    Perform Ljung-Box test on residuals.
    
    Parameters
    ----------
    residuals : pd.Series
        Standardised residuals from GARCH model
    lags : int
        Number of lags to test
    
    Returns
    -------
    dict
        Test statistics and p-values
    """
    result = acorr_ljungbox(residuals, lags=lags, return_df=True)
    
    # Result is a DataFrame with 'lb_stat' and 'lb_pvalue' columns
    last_lag_stat = result['lb_stat'].iloc[-1]
    last_lag_pvalue = result['lb_pvalue'].iloc[-1]
    
    return {
        'test_statistic': float(last_lag_stat),
        'p_value': float(last_lag_pvalue),
        'lags': lags
    }


def ljung_box_squared_test(residuals: pd.Series, lags: int = 10) -> dict:
    """
    Perform Ljung-Box test on squared residuals.
    
    Parameters
    ----------
    residuals : pd.Series
        Standardised residuals from GARCH model
    lags : int
        Number of lags to test
    
    Returns
    -------
    dict
        Test statistics and p-values
    """
    squared_residuals = residuals ** 2
    result = acorr_ljungbox(squared_residuals, lags=lags, return_df=True)
    
    last_lag_stat = result['lb_stat'].iloc[-1]
    last_lag_pvalue = result['lb_pvalue'].iloc[-1]
    
    return {
        'test_statistic': float(last_lag_stat),
        'p_value': float(last_lag_pvalue),
        'lags': lags
    }


def arch_lm_test(residuals: pd.Series, lags: int = 10) -> dict:
    """
    Perform ARCH LM test for remaining ARCH effects.
    
    Parameters
    ----------
    residuals : pd.Series
        Standardised residuals from GARCH model
    lags : int
        Number of lags to test
    
    Returns
    -------
    dict
        Test statistics and p-values
    """
    # het_arch returns (lm_statistic, lm_pvalue, f_statistic, f_pvalue)
    result = het_arch(residuals, nlags=lags)
    
    return {
        'lm_statistic': float(result[0]),
        'lm_p_value': float(result[1]),
        'f_statistic': float(result[2]),
        'f_p_value': float(result[3]),
        'lags': lags
    }


def compute_diagnostics(standardised_residuals: pd.Series, lags: int = 10) -> dict:
    """
    Compute full diagnostic test suite.
    
    Parameters
    ----------
    standardised_residuals : pd.Series
        Standardised residuals from GARCH model
    lags : int
        Number of lags for tests
    
    Returns
    -------
    dict
        All diagnostic test results
    """
    return {
        'ljung_box': ljung_box_test(standardised_residuals, lags),
        'ljung_box_squared': ljung_box_squared_test(standardised_residuals, lags),
        'arch_lm': arch_lm_test(standardised_residuals, lags)
    }
