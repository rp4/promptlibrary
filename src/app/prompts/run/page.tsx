'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { extractVariables, replaceVariables } from '@/lib/promptUtils';
import Link from 'next/link';
import { ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/auth';

interface Prompt {
  id: string;
  title: string;
  prompt_text: string;
}

export default function RunPromptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = searchParams.get('id');

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promptId) {
      fetchPrompt();
    }
  }, [promptId]);

  const fetchPrompt = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('id, title, prompt_text')
      .eq('id', promptId)
      .single();

    if (error) {
      setError('Failed to fetch prompt');
      return;
    }

    if (data) {
      setPrompt(data);
      // Initialize variables state with empty strings
      const vars = extractVariables(data.prompt_text);
      const initialVars = Object.fromEntries(vars.map(v => [v, '']));
      setVariables(initialVars);
    }
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const isComplete = () => {
    return Object.values(variables).every(value => value.trim() !== '');
  };

  const runPrompt = async () => {
    if (!prompt || !isComplete()) return;

    setLoading(true);
    setError(null);

    try {
      const finalPrompt = replaceVariables(prompt.prompt_text, variables);

      // Call Claude API
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Claude');
      }

      const data = await response.json();
      setResult(data.response);

      // Log prompt usage
      await supabase.from('prompt_usage').insert([
        {
          prompt_id: promptId,
          user_id: (await getCurrentUser())?.id,
          sent_data: JSON.stringify({ prompt: finalPrompt, variables }),
          returned_data: data.response,
          status: 'success'
        }
      ]);

    } catch (err: any) {
      setError(err.message || 'An error occurred');
      
      // Log failed attempt
      await supabase.from('prompt_usage').insert([
        {
          prompt_id: promptId,
          user_id: (await getCurrentUser())?.id,
          sent_data: JSON.stringify({ prompt: prompt.prompt_text, variables }),
          returned_data: err.message,
          status: 'failure'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!prompt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-navy-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/prompts" className="text-white hover:text-gray-200">
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-semibold">Run Prompt</h1>
          </div>
          <Link href="/" className="text-white hover:text-gray-200">
            <HomeIcon className="h-6 w-6" />
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 flex gap-6">
        {/* Left side - Variables */}
        <div className="w-1/3 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Variables</h2>
          <div className="space-y-4">
            {extractVariables(prompt.prompt_text).map((variable) => (
              <div key={variable}>
                <label className="block text-sm font-medium text-gray-700">
                  {variable}
                </label>
                <input
                  type="text"
                  value={variables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Result */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
          <div className="h-full flex flex-col">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Result</h2>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {result ? (
              <div className="flex-1 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {result}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {loading ? 'Generating response...' : 'Response will appear here'}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={runPrompt}
                disabled={!isComplete() || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 