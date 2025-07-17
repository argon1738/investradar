import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PriceDataPoint } from '../types';

interface StockChartProps {
  data: PriceDataPoint[];
}

const StockChart: React.FC<StockChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500">Ingen prisdata tilgjengelig.</div>;
    }

    const isPositive = data.length > 1 ? data[data.length - 1].price >= data[0].price : true;
    const strokeColor = isPositive ? '#22c55e' : '#ef4444';

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="bg-gray-800/80 backdrop-blur-sm p-3 border border-gray-600 rounded-lg shadow-lg">
                <p className="label text-gray-300">{`${label}`}</p>
                <p className="intro text-white font-bold">{`Pris : ${payload[0].value.toFixed(2)} NOK`}</p>
            </div>
            );
        }
        return null;
    };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(100, 116, 139, 0.1)'}} />
          <Line type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;