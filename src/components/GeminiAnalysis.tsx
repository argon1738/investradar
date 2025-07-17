import React, { useState, useCallback, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { generateStockAnalysisStream } from '../services/geminiService';
import { LoadingSpinnerIcon, SparklesIcon, LinkIcon } from './Icons';
import { GroundingSource } from '../types';

interface GeminiAnalysisProps {
  stockName: string;
}

const GeminiAnalysis: React.FC<GeminiAnalysisProps> = ({ stockName }) => {
  const [query, setQuery] = useState<string>('Gi meg en oversikt over nylige hendelser og markedssentiment.');
  const [analysis, setAnalysis] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const handleAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis('');
    setSources([]);

    try {
      const stream = generateStockAnalysisStream(stockName, query);
      for await (const result of stream) {
        if (result.error) {
          setError(result.error);
          break;
        }
        if (result.text) {
          setAnalysis(prev => prev + result.text);
        }
        if (result.sources) {
          // Unngå duplikater
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
  }, [stockName, query]);

  useEffect(() => {
    if (analysisRef.current) {
        const dirtyHtml = marked.parse(analysis) as string;
        const cleanHtml = DOMPurify.sanitize(dirtyHtml);
        analysisRef.current.innerHTML = cleanHtml;
    }
  }, [analysis]);


  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
        <SparklesIcon className="w-6 h-6 mr-2 text-brand-accent" />
        AI-drevet Analyse
      </h2>
      <div className="space-y-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Still et spørsmål om aksjen..."
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent transition duration-200 resize-none"
          rows={2}
          disabled={isLoading}
        />
        <button
          onClick={handleAnalysis}
          className="bg-brand-secondary hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed w-full md:w-auto"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinnerIcon />
              <span className="ml-2">Analyserer...</span>
            </>
          ) : (
            'Generer Analyse'
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 text-center bg-red-900/50 border border-negative text-negative px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      {analysis && (
        <div 
          ref={analysisRef} 
          className="mt-6 prose prose-invert prose-sm md:prose-base max-w-none prose-h3:text-brand-accent prose-h3:font-semibold prose-headings:text-gray-100"
        />
      )}

      {!isLoading && sources.length > 0 && (
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

    </div>
  );
};

export default GeminiAnalysis;