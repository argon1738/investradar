import type { Handler } from '@netlify/functions';
import { Stock, PriceDataPoint } from '../types';

const fetchJson = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (data['Error Message'] || data.Information) { // Information key often contains rate limit errors
        throw new Error(data['Error Message'] || data.Information || 'Invalid API response');
    }
    if (Object.keys(data).length === 0) {
        throw new Error('Received an empty response from the API.');
    }
    return data;
};


export const handler: Handler = async (event, context) => {
    const ticker = event.queryStringParameters?.ticker;
    const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY;

    if (!ALPHAVANTAGE_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Alpha Vantage API key is not configured on the server.' }),
        };
    }

    if (!ticker) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Ticker symbol is required.' }),
        };
    }

    const BASE_URL = 'https://www.alphavantage.co/query';

    try {
        // Fetch data sequentially to avoid hitting API rate limits
        const overview = await fetchJson(`${BASE_URL}?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHAVANTAGE_API_KEY}`);
        const quote = await fetchJson(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHAVANTAGE_API_KEY}`);
        const timeSeries = await fetchJson(`${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${ALPHAVANTAGE_API_KEY}`);
        
        const globalQuote = quote['Global Quote'];
        if (!globalQuote || Object.keys(globalQuote).length === 0) {
            // Check for rate limit info in the quote response specifically
            if(quote.Information) {
                throw new Error(quote.Information);
            }
            throw new Error(`No data found for ticker '${ticker}'. It might be an invalid symbol.`);
        }

        const stock: Stock = {
            ticker: overview.Symbol,
            name: overview.Name,
            price: parseFloat(globalQuote['05. price']),
            change: parseFloat(globalQuote['09. change']),
            changePercent: parseFloat(globalQuote['10. change percent'].replace('%', '')),
            marketCap: parseInt(overview.MarketCapitalization, 10),
            volume: parseInt(globalQuote['06. volume'], 10),
            currency: overview.Currency || 'NOK',
        };

        const dailyData = timeSeries['Time Series (Daily)'];
         if (!dailyData) {
            // Check for rate limit info in the timeSeries response
            if(timeSeries.Information) {
                 throw new Error(timeSeries.Information);
            }
            throw new Error(`Could not fetch historical data for '${ticker}'.`);
        }

        const history: PriceDataPoint[] = Object.entries(dailyData)
            .map(([dateStr, values]: [string, any]) => ({
                date: new Date(dateStr).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' }),
                price: parseFloat(values['4. close']),
            }))
            .reverse();

        return {
            statusCode: 200,
            body: JSON.stringify({ stock, history }),
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        console.error("API error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        
        // Provide a more user-friendly message for rate limit errors
        if (errorMessage.includes('rate limit') || errorMessage.includes('API call frequency')) {
             return {
                statusCode: 429, // Too Many Requests
                body: JSON.stringify({ error: 'API-grensen er nådd. Vennligst vent et minutt og prøv igjen.' }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};
