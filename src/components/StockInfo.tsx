
import React from 'react';
import { Stock } from '../types';

interface StockInfoProps {
  stock: Stock;
}

// Hjelpefunksjon for å formatere store tall
const formatNumber = (num: number): string => {
    if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T';
    }
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(1) + 'k';
    }
    return num.toString();
};

const StockInfo: React.FC<StockInfoProps> = ({ stock }) => {
  const isPositive = stock.change >= 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
            <h2 className="text-3xl font-bold text-white">{stock.name}</h2>
            <p className="text-lg text-gray-400">{stock.ticker}</p>
        </div>
        <div className="text-right">
            <p className="text-3xl font-bold text-white">{stock.price.toFixed(2)} {stock.currency}</p>
            <p className={`text-lg font-semibold ${isPositive ? 'text-positive' : 'text-negative'}`}>
                {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
            </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-2 gap-4 text-center border-t border-gray-700 pt-4">
        <div>
            <p className="text-sm text-gray-400">Markedsverdi</p>
            <p className="text-lg font-semibold text-white">{formatNumber(stock.marketCap)} {stock.currency}</p>
        </div>
        <div>
            <p className="text-sm text-gray-400">Volum</p>
            <p className="text-lg font-semibold text-white">{formatNumber(stock.volume)}</p>
        </div>
      </div>
    </div>
  );
};

export default StockInfo;