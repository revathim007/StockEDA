import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stockverse.settings')
django.setup()

import yfinance as yf
from newsapi import NewsApiClient

def test_sentiment(symbol):
    try:
        print(f"Testing sentiment for symbol: {symbol}")
        t = yf.Ticker(symbol)
        info = t.info or {}
        company_name = info.get("shortName") or info.get("longName") or symbol
        print(f"Company name: {company_name}")

        newsapi = NewsApiClient(api_key="0d08ad9a65124d22a8589b51785105b6")
        query = f"{company_name} OR {symbol}"
        print(f"Query: {query}")
        
        all_articles = newsapi.get_everything(q=query, language='en', sort_by='relevancy', page_size=20)
        print(f"Articles found: {len(all_articles.get('articles', []))}")
        print("Test SUCCESSFUL")
    except Exception as e:
        print(f"Test FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sentiment("AAPL")
