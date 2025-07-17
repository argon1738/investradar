import { Stock, PriceDataPoint } from '../src/types';

const fetchJson = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status} for url: ${url}`);
    }
    const data = await response.json();
    
    if (data['Error Message'] || data.Information) {
        const errorMessage = data['Error Message'] || data.Information || 'Invalid API response';
        if (errorMessage.toLowerCase().includes('api call frequency')) {
            const error = new Error(errorMessage);
            error.name = 'RateLimitError';
            throw error;
        }
        throw new Error(errorMessage);
    }
    return data;
};

const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: status,
    });
};

export default async (request: Request) => {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');
    const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY;

    if (!ALPHAVANTAGE_API_KEY) {
        return jsonResponse({ error: 'Alpha Vantage API key is not configured on the server.' }, 500);
    }

    if (!ticker) {
        return jsonResponse({ error: 'Ticker symbol is required.' }, 400);
    }

    const BASE_URL = 'https://www.alphavantage.co/query';
    const overviewUrl = `${BASE_URL}?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHAVANTAGE_API_KEY}`;
    const quoteUrl = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHAVANTAGE_API_KEY}`;
    const timeSeriesUrl = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${ALPHAVANTAGE_API_KEY}`;

    try {
        const [overview, quote, timeSeries] = await Promise.all([
            fetchJson(overviewUrl),
            fetchJson(quoteUrl),
            fetchJson(timeSeriesUrl)
        ]);
        
        const globalQuote = quote['Global Quote'];
        if (!globalQuote || Object.keys(globalQuote).length === 0) {
            return jsonResponse({ error: `Ingen kursdata funnet for ticker '${ticker}'. Symbolet kan være ugyldig.` }, 404);
        }
        
        const dailyData = timeSeries['Time Series (Daily)'];
        if (!dailyData) {
            return jsonResponse({ error: `Kunne ikke hente historiske data for '${ticker}'.` }, 404);
        }
        
        if (!overview || !overview.Symbol || !overview.Name) {
            return jsonResponse({ error: `Kunne ikke hente selskapsoversikt for '${ticker}'. Symbolet kan være delistet eller ugyldig.` }, 404);
        }

        const stock: Stock = {
            ticker: overview.Symbol,
            name: overview.Name,
            price: parseFloat(globalQuote['05. price']),
            change: parseFloat(globalQuote['09. change']),
            changePercent: parseFloat(globalQuote['10. change percent'].replace('%', '')),
            marketCap: parseInt(overview.MarketCapitalization, 10) || 0,
            volume: parseInt(globalQuote['06. volume'], 10) || 0,
            currency: overview.Currency || 'NOK',
        };

        const history: PriceDataPoint[] = Object.entries(dailyData)
            .map(([dateStr, values]: [string, any]) => ({
                date: new Date(dateStr).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' }),
                price: parseFloat(values['4. close']),
            }))
            .reverse();

        return jsonResponse({ stock, history });

    } catch (error) {
        console.error("API error:", error);
        
        if (error instanceof Error && error.name === 'RateLimitError') {
            return jsonResponse({ error: 'API-grensen for aksjedata er nådd. Vennligst vent ett minutt og prøv igjen.' }, 429);
        }

        const errorMessage = error instanceof Error ? error.message : 'En uventet feil oppstod på serveren.';
        return jsonResponse({ error: errorMessage }, 500);
    }
};
