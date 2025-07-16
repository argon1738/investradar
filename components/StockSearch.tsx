
import React, { useState } from 'react';
import { SearchIcon, LoadingSpinnerIcon } from './Icons';

interface StockSearchProps {
  onSearch: (ticker: string) => void;
  isLoading: boolean;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSearch, isLoading }) => {
  const [ticker, setTicker] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(ticker);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Søk ticker (f.eks. EQNR.OL)..."
        className="flex-grow bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent transition duration-200"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="bg-brand-secondary hover:bg-brand-accent text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? <LoadingSpinnerIcon /> : <SearchIcon className="w-6 h-6" />}
        <span className="ml-2 hidden md:inline">Søk</span>
      </button>
    </form>
  );
};

export default StockSearch;
