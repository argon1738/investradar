import { Stock, PriceDataPoint } from '../types';

export const fetchStockData = async (ticker: string): Promise<{ stock: Stock, history: PriceDataPoint[] }> => {
  const response = await fetch(`/api/stock?ticker=${ticker}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to fetch stock data with status ${response.status}`);
  }

  const data = await response.json();
  return data;
};
