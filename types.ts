
export interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  currency: string;
}

export interface PriceDataPoint {
  date: string;
  price: number;
}

export interface GroundingSource {
    uri: string;
    title: string;
}
