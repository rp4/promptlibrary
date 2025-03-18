'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { extractVariables, replaceVariables } from '@/lib/promptUtils';
import Link from 'next/link';
import { ArrowLeftIcon, HomeIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getCurrentUser } from '@/lib/auth';

interface Prompt {
  id: string;
  title: string;
  prompt_text: string;
  favorites_count: number;
}

function RunPromptPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptId = searchParams.get('id');

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (promptId) {
      fetchPrompt();
      checkIfLiked();
    }
  }, [promptId]);

  const fetchPrompt = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('id, title, prompt_text, favorites_count')
      .eq('id', promptId)
      .single();

    if (error) {
      setError('Failed to fetch prompt');
      return;
    }

    if (data) {
      setPrompt(data);
      const vars = extractVariables(data.prompt_text);
      const initialVars = Object.fromEntries(vars.map(v => [v, '']));
      setVariables(initialVars);
    }
  };

  const checkIfLiked = async () => {
    const user = await getCurrentUser();
    if (!user || !promptId) return;

    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('prompt_id', promptId)
      .eq('user_id', user.id)
      .single();

    setIsLiked(!!data);
  };

  const handleLike = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || !prompt) return;

      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('prompt_id', prompt.id)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_favorites_count', { prompt_id: prompt.id });
        setPrompt(prev => prev ? { ...prev, favorites_count: prev.favorites_count - 1 } : null);
      } else {
        // Like
        await supabase.from('likes').insert([
          {
            prompt_id: prompt.id,
            user_id: user.id,
          },
        ]);

        await supabase.rpc('increment_favorites_count', { prompt_id: prompt.id });
        setPrompt(prev => prev ? { ...prev, favorites_count: prev.favorites_count + 1 } : null);
      }

      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
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

    setShowWarning(true);
  };

  const handleConfirmRun = async () => {
    if (!prompt || !isComplete()) return;

    setLoading(true);
    setError(null);
    setShowWarning(false);

    try {
      const finalPrompt = replaceVariables(prompt.prompt_text, variables);

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
    <main className="min-h-screen bg-gray-50">
      <header className="header">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex-1">
            <Link href="/prompts" className="text-white/80 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
          </div>
          <h1 className="text-2xl font-semibold flex-1 text-center">Run Prompt</h1>
          <div className="flex-1 flex justify-end">
            <Link href="/" className="text-white/80 hover:text-white transition-colors">
              <HomeIcon className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 flex gap-6">
        {/* Left side - Variables */}
        <div className="w-1/3">
          <div className="card p-6">
            <div className="mb-6">
              <div className="text-red-600 font-medium mb-4 p-3 bg-red-50 rounded-md border border-red-100">
                Do NOT use any personal or confidential data
              </div>
              <h2 className="text-lg font-medium text-gray-900">Variables</h2>
            </div>
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
                    className="input"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Result */}
        <div className="flex-1">
          <div className="card p-6">
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Result</h2>
                <button
                  onClick={handleLike}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <span className="text-sm mr-1">{prompt.favorites_count}</span>
                  {isLiked ? (
                    <StarIconSolid className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              
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
                  className="btn-primary"
                >
                  {loading ? 'Running...' : 'Run Prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">⚠️ Warning</h3>
            <p className="text-gray-600 mb-6">
              The output of AI is not completely reliable. Please review the output carefully before using it.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowWarning(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRun}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function RunPromptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <RunPromptPageContent />
    </Suspense>
  );
} 