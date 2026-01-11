"""
GARCH model fitting functions.
"""
from typing import Literal
import pandas as pd
import numpy as np
from arch import arch_model


def fit_garch(returns: pd.Series, dist: Literal['normal', 't'] = 'normal') -> dict:
    """
    Fit a GARCH(1,1) model to return series.
    
    Parameters
    ----------
    returns : pd.Series
        Log returns in percentage terms
    dist : str
        Distribution assumption: 'normal' or 't' (Student-t)
    
    Returns
    -------
    dict
        Dictionary containing:
        - conditional_volatility: pd.Series of conditional volatility
        - aic: float, Akaike Information Criterion
        - standardised_residuals: pd.Series of standardised residuals
        - model_result: fitted model object for further inspection
    """
    # Fit GARCH(1,1) model
    model = arch_model(
        returns,
        vol='GARCH',
        p=1,
        q=1,
        dist=dist,
        rescale=False
    )
    
    result = model.fit(disp='off', show_warning=False)
    
    # Extract conditional volatility
    conditional_volatility = result.conditional_volatility
    
    # Compute standardised residuals
    standardised_residuals = result.resid / conditional_volatility
    
    return {
        'conditional_volatility': conditional_volatility,
        'aic': result.aic,
        'standardised_residuals': standardised_residuals,
        'model_result': result
    }


def select_best_model(returns: pd.Series) -> dict:
    """
    Fit GARCH(1,1) with Normal and Student-t distributions, select best by AIC.
    
    Parameters
    ----------
    returns : pd.Series
        Log returns in percentage terms
    
    Returns
    -------
    dict
        Dictionary containing:
        - selected_model: str, 'normal' or 't'
        - aic_normal: float
        - aic_t: float
        - model_output: dict from fit_garch for best model
    """
    # Fit both models
    result_normal = fit_garch(returns, dist='normal')
    result_t = fit_garch(returns, dist='t')
    
    # Select best by AIC (lower is better)
    if result_normal['aic'] <= result_t['aic']:
        selected = 'normal'
        model_output = result_normal
    else:
        selected = 't'
        model_output = result_t
    
    return {
        'selected_model': selected,
        'aic_normal': result_normal['aic'],
        'aic_t': result_t['aic'],
        'model_output': model_output
    }
