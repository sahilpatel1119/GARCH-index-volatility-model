"""
Main entry point for GARCH volatility analysis.

Runs analysis pipeline for FTSE 100 and S&P 500 indices.
Saves results to reports/summary.json
"""
import json
import os
from pathlib import Path
from app.pipeline import run_pipeline


def main():
    """
    Execute GARCH volatility analysis for configured indices.
    """
    # Configuration
    tickers = ['^FTSE', '^GSPC']
    start_date = '2010-01-01'
    output_dir = Path(__file__).parent.parent / 'reports'
    output_file = output_dir / 'summary.json'
    
    # Ensure reports directory exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Run pipeline for each ticker
    results = {}
    
    for ticker in tickers:
        print(f"Processing {ticker}...")
        try:
            result = run_pipeline(ticker, start_date)
            results[ticker] = result
            print(f"  ✓ {ticker} completed: {result['selected_model']} distribution selected")
        except Exception as e:
            print(f"  ✗ {ticker} failed: {str(e)}")
            results[ticker] = {'error': str(e)}
    
    # Save results to JSON
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to: {output_file}")
    print("Analysis complete.")


if __name__ == '__main__':
    main()
