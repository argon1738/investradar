import React, { useState, useCallback, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { generateStockAnalysisStream } from '../services/geminiService';
import { LoadingSpinnerIcon, SparklesIcon, LinkIcon } from './Icons';
import { GroundingSource, Stock } from '../types';

interface GeminiAnalysisProps {
  stock: Stock | null;
}

const quickPrompts = [
    "Analyser konkurrenter",
    "Vurder risiko",
    "Fremtidsutsikter basert på nylige hendelser"
];

const GeminiAnalysis: React.FC<GeminiAnalysisProps> = ({ stock }) => {
  const [customQuery, setCustomQuery] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedTicker, setLastAnalyzedTicker] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const runAnalysis = useCallback(async (prompt: string) => {
    if (!stock) return;

    setIsLoading(true);
    setError(null);
    setAnalysis('');
    setSources([]);

    try {
      const stream = generateStockAnalysisStream(stock.name, prompt);
      for await (const result of stream) {
        if (result.error) {
          setError(result.error);
          break;
        }
        if (result.text) {
          setAnalysis(prev => prev + result.text);
        }
        if (result.sources) {
           setSources(prev => {
                const newSources = result.sources ?? [];
                const existingUris = new Set(prev.map(s => s.uri));
                const uniqueNewSources = newSources.filter(s => !existingUris.has(s.uri));
                return [...prev, ...uniqueNewSources];
           });
        }
      }
    } catch (err) {
      setError('En uventet feil oppstod under analysen.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [stock]);

  useEffect(() => {
    // Automatically trigger analysis when a new stock is selected
    if (stock && stock.ticker !== lastAnalyzedTicker) {
        setLastAnalyzedTicker(stock.ticker);
        runAnalysis('Gi meg en oversikt over nylige hendelser og markedssentiment.');
    }
  }, [stock, lastAnalyzedTicker, runAnalysis]);

  useEffect(() => {
    if (analysisRef.current) {
        let html = marked.parse(analysis) as string;
        if (isLoading) {
            // Append a blinking cursor while loading/streaming
            html += '<span class="blinking-cursor">|</span>';
        }
        analysisRef.current.innerHTML = html;
    }
  }, [analysis, isLoading]);

  const handleCustomQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
        runAnalysis(customQuery);
        setCustomQuery('');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
        <SparklesIcon className="w-6 h-6 mr-2 text-brand-accent" />
        AI-drevet Analyse
      </h2>

      {(isLoading && !analysis) && (
        <div className="flex items-center text-gray-400">
            <LoadingSpinnerIcon />
            <span className="ml-2">Starter analyse for {stock?.name}...</span>
        </div>
      )}
      
      <div 
        ref={analysisRef} 
        className="prose prose-invert prose-sm md:prose-base max-w-none prose-h3:text-brand-accent prose-h3:font-semibold prose-headings:text-gray-100"
      />

      {error && (
        <div className="mt-4 text-center bg-red-900/50 border border-negative text-negative px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-300 flex items-center">
                <LinkIcon className="mr-2"/>
                Kilder
            </h3>
            <ul className="space-y-2">
                {sources.map((source, index) => (
                    <li key={index}>
                        <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-accent hover:underline text-sm break-all"
                        >
                            {source.title || source.uri}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
      )}

      {/* Follow-up questions section */}
      {!isLoading && analysis && (
         <div className="mt-8 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-300">Still et oppfølgingsspørsmål</h3>
            <div className="flex flex-wrap gap-2 mb-4">
                {quickPrompts.map(prompt => (
                    <button 
                        key={prompt}
                        onClick={() => runAnalysis(prompt)}
                        disabled={isLoading}
                        className="bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 font-medium py-1.5 px-3 rounded-full transition duration-200 disabled:bg-gray-800 disabled:text-gray-500"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
            <form onSubmit={handleCustomQuerySubmit} className="flex gap-2">
                <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Eller skriv ditt eget spørsmål her..."
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent transition duration-200"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="bg-brand-secondary hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed"
                    disabled={isLoading || !customQuery.trim()}
                >
                   <SparklesIcon className="w-5 h-5 mr-2"/> Spør
                </button>
            </form>
         </div>
      )}

    </div>
  );
};

export default GeminiAnalysis;
