"""
Streamlit dashboard for GARCH volatility model results visualization.
"""
import json
from typing import Optional
import streamlit as st  # type: ignore
import pandas as pd  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
from pathlib import Path


def load_results() -> Optional[dict]:
    """Load precomputed results from JSON file."""
    json_path = Path(__file__).parent.parent / 'reports' / 'summary.json'
    
    try:
        with open(json_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        st.error(f"Results file not found at: {json_path}")
        st.info("Please run the backend first: `python backend/main.py`")
        return None
    except json.JSONDecodeError:
        st.error("Invalid JSON format in results file")
        return None


def plot_volatility(volatility_data, dates, ticker_name):
    """Plot conditional volatility time series."""
    fig, ax = plt.subplots(figsize=(12, 5))
    
    ax.plot(pd.to_datetime(dates), volatility_data, linewidth=1, color='#1f77b4')
    ax.set_title(f'{ticker_name} - Conditional Volatility (GARCH 1,1)', 
                 fontsize=14, fontweight='bold')
    ax.set_xlabel('Date', fontsize=11)
    ax.set_ylabel('Volatility (%)', fontsize=11)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    return fig


def create_var_table(var_backtest):
    """Create a formatted DataFrame for VaR backtest results."""
    rows = []
    
    for var_level, data in var_backtest.items():
        cl = int(data['confidence_level'] * 100)
        kupiec = data['kupiec_test']
        
        rows.append({
            'Confidence Level': f'{cl}%',
            'Total Observations': data['total_observations'],
            'Exceptions': data['exceptions'],
            'Expected Exceptions': f"{kupiec['expected_exceptions']:.1f}",
            'Observed Rate': f"{kupiec['observed_rate']:.4f}",
            'Kupiec LR Stat': f"{kupiec['lr_statistic']:.2f}",
            'p-value': f"{kupiec['p_value']:.4f}",
            'Result': '✅ Pass' if not kupiec['reject_null'] else '❌ Reject'
        })
    
    return pd.DataFrame(rows)


def main():
    st.set_page_config(
        page_title="GARCH Volatility Analysis",
        page_icon="📈",
        layout="wide"
    )
    
    st.title("📈 GARCH Volatility Model - Analysis Dashboard")
    st.markdown("---")
    
    # Load results
    results = load_results()
    
    if results is None:
        st.stop()
        return  # Type guard for Pylance
    
    # Check for errors in all results
    if all('error' in v for v in results.values()):
        st.error("All analyses failed. Please check the backend logs.")
        st.stop()
    
    # Ticker mapping
    ticker_names = {
        '^FTSE': 'FTSE 100',
        '^GSPC': 'S&P 500'
    }
    
    # Sidebar controls
    st.sidebar.header("Index Selection")
    
    selected_ticker = st.sidebar.selectbox(
        "Choose an index:",
        options=list(ticker_names.keys()),
        format_func=lambda x: ticker_names[x]
    )
    
    # Get data for selected ticker
    data = results.get(selected_ticker)
    
    if data is None:
        st.error(f"No data found for {ticker_names[selected_ticker]}")
        st.stop()
        return  # Type guard for Pylance
    
    if 'error' in data:
        st.error(f"Analysis failed for {ticker_names[selected_ticker]}: {data['error']}")
        st.stop()
        return  # Type guard for Pylance
    
    # Display header
    st.header(f"{ticker_names[selected_ticker]} Analysis Results")
    
    # Model summary section
    st.subheader("Model Information")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="Selected Model",
            value=f"GARCH(1,1) - {data['selected_model'].upper()}"
        )
    
    with col2:
        st.metric(
            label="AIC (Normal)",
            value=f"{data['aic_values']['normal']:.2f}"
        )
    
    with col3:
        st.metric(
            label="AIC (Student-t)",
            value=f"{data['aic_values']['t']:.2f}"
        )
    
    st.markdown("---")
    
    # Volatility statistics
    st.subheader("Volatility Summary")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Observations", data['summary']['total_observations'])
    
    with col2:
        st.metric("Mean Volatility", f"{data['summary']['mean_volatility']:.4f}%")
    
    with col3:
        st.metric("Max Volatility", f"{data['summary']['max_volatility']:.4f}%")
    
    with col4:
        st.metric("Min Volatility", f"{data['summary']['min_volatility']:.4f}%")
    
    st.markdown("---")
    
    # Volatility plot
    st.subheader("Conditional Volatility Over Time")
    
    fig = plot_volatility(
        data['volatility'],
        data['volatility_index'],
        ticker_names[selected_ticker]
    )
    st.pyplot(fig)
    plt.close()
    
    st.markdown("---")
    
    # Diagnostics section
    st.subheader("Model Diagnostics")
    
    diag = data['diagnostics']
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("**Ljung-Box Test**")
        st.write(f"Test Statistic: {diag['ljung_box']['test_statistic']:.4f}")
        st.write(f"p-value: {diag['ljung_box']['p_value']:.4f}")
        st.write(f"Lags: {diag['ljung_box']['lags']}")
    
    with col2:
        st.markdown("**Ljung-Box Squared Test**")
        st.write(f"Test Statistic: {diag['ljung_box_squared']['test_statistic']:.4f}")
        st.write(f"p-value: {diag['ljung_box_squared']['p_value']:.4f}")
        st.write(f"Lags: {diag['ljung_box_squared']['lags']}")
    
    with col3:
        st.markdown("**ARCH LM Test**")
        st.write(f"LM Statistic: {diag['arch_lm']['lm_statistic']:.4f}")
        st.write(f"p-value: {diag['arch_lm']['lm_p_value']:.4f}")
        st.write(f"Lags: {diag['arch_lm']['lags']}")
    
    st.info("💡 p-values > 0.05 suggest the model adequately captures volatility dynamics")
    
    st.markdown("---")
    
    # VaR backtest results
    st.subheader("Value-at-Risk (VaR) Backtest Results")
    
    var_table = create_var_table(data['var_backtest'])
    st.dataframe(var_table, use_container_width=True, hide_index=True)
    
    st.info(
        "💡 The Kupiec test evaluates if the VaR exception rate matches expectations. "
        "A 'Pass' indicates the VaR model is adequate; 'Reject' suggests underestimation of risk."
    )
    
    # Footer
    st.markdown("---")
    st.markdown(
        "<div style='text-align: center; color: gray;'>"
        "GARCH Volatility Analysis | Educational Portfolio Project"
        "</div>",
        unsafe_allow_html=True
    )


if __name__ == '__main__':
    main()
