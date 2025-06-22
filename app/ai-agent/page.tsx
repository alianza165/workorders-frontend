'use client';

import { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';

interface SourceDocument {
  work_order_id: number;
  equipment: string;
  problem: string; // Changed from problem_summary to match API response
}

interface AIResponse {
  answer: string;
  statistics: {
    exact_count: number;
    analyzed_samples: number;
  };
  sources: SourceDocument[];
}

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ai-agent/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,  // Add this line
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data: AIResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnswer = (answer: string) => {
    return answer.split('\n').filter(para => para.trim()).map((paragraph, i) => (
      <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>AI Work Order Assistant</title>
        <meta name="description" content="AI-powered work order analysis" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Work Order AI Assistant</h1>
            <p className="text-gray-600">
              Ask questions about work orders, equipment issues, and maintenance history
            </p>
          </div>

          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your question
                </label>
                <textarea
                  id="prompt"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  placeholder="E.g. What are the most common issues with motors?"
                />
              </div>
              <button
                type="submit"
                className={`px-4 py-2 rounded-md text-white ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Ask AI'}
              </button>
            </form>
          </div>

          {/* Results Section */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {response && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Statistics Summary */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Exact matches: {response.statistics.exact_count}</span>
                  <span>Analyzed samples: {response.statistics.analyzed_samples}</span>
                </div>
              </div>

              {/* AI Response */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis</h2>
                <div className="prose prose-blue max-w-none">
                  {formatAnswer(response.answer)}
                </div>
              </div>

              {/* Source Work Orders */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Relevant Work Orders ({response.sources.length})</h2>
                {response.sources.length > 0 ? (
                  <div className="space-y-4">
                    {response.sources.map((source) => (
                      <div key={source.work_order_id} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-md font-medium text-gray-800">
                            WO#{source.work_order_id}
                          </h3>
                          <span className="text-sm text-gray-500">
                            Equipment: {source.equipment || 'Not specified'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {source.problem || 'No problem description available'}
                        </p>
                        <a 
                          href={`/workorders/${source.work_order_id}`} 
                          className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          View details
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No relevant work orders found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}