import React, { useState, useCallback } from 'react';
import { Stock, PriceDataPoint } from './types';
import { fetchStockData } from './services/stockService';
import StockSearch from './components/StockSearch';
import StockInfo from './components/StockInfo';
import StockChart from './components/StockChart';
import GeminiAnalysis from './components/GeminiAnalysis';
import { LogoIcon, LoadingSpinnerIcon } from './components/Icons';

const MainApp: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [history, setHistory] = useState<PriceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (ticker: string) => {
    if (!ticker) return;
    setIsLoading(true);
    setError(null);
    setSelectedStock(null);
    setHistory([]);
    try {
      const formattedTicker = ticker.toUpperCase().endsWith('.OL') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.OL`;
      const { stock, history } = await fetchStockData(formattedTicker);
      setSelectedStock(stock);
      setHistory(history);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('En ukjent feil oppstod.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-brand-primary p-4 shadow-lg border-b-4 border-brand-accent">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LogoIcon />
            <h1 className="text-2xl font-bold text-white tracking-tight">InvestRadar</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-400 mb-6">
            Skriv inn en ticker og avslutt med ".OL" (f.eks. EQNR.OL, DNB.OL) for å analysere en aksje fra Oslo Børs.
          </p>
          <StockSearch onSearch={handleSearch} isLoading={isLoading} />
          
          {isLoading && (
            <div className="flex justify-center items-center mt-8">
              <LoadingSpinnerIcon />
              <span className="ml-3 text-lg">Henter data...</span>
            </div>
          )}

          {error && (
            <div className="mt-8 text-center bg-red-900/50 border border-negative text-negative px-4 py-3 rounded-lg">
              <p className="font-bold">Feil</p>
              <p>{error}</p>
            </div>
          )}

          {selectedStock && !isLoading && (
            <div className="mt-8 space-y-8">
              <div className="bg-gray-800/50 p-6 rounded-2xl shadow-2xl border border-gray-700">
                <StockInfo stock={selectedStock} />
              </div>
              <div className="bg-gray-800/50 p-6 rounded-2xl shadow-2xl border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-gray-100">Prisutvikling (Siste 100 dager)</h2>
                <StockChart data={history} />
              </div>
              <div className="bg-gray-800/50 p-6 rounded-2xl shadow-2xl border border-gray-700">
                 <GeminiAnalysis stockName={selectedStock.name} />
              </div>
            </div>
          )}
           {!selectedStock && !isLoading && !error && (
            <div className="text-center mt-16 text-gray-500">
                <p className="text-lg">Velkommen til AI-drevet aksjeanalyse.</p>
                <p>Start med å søke etter en aksje ovenfor.</p>
            </div>
           )}
        </div>
      </main>
       <footer className="text-center p-4 mt-8 text-xs text-gray-600">
            <p>Ansvarsfraskrivelse: AI-generert innhold kan være unøyaktig. Dette er ikke finansiell rådgivning.</p>
            <p>Aksjedata levert av <a href="https://alphavantage.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-accent">Alpha Vantage</a>. Data kan være forsinket.</p>
            <p>© {new Date().getFullYear()} InvestRadar. Alle rettigheter forbeholdes.</p>
        </footer>
    </div>
  );
};

export default MainApp;
