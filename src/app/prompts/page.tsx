'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeftIcon, HomeIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import CreatePromptForm from '@/components/CreatePromptForm';
import PromptDetails from '@/components/PromptDetails';
import { getCurrentUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';

interface Prompt {
  id: string;
  title: string;
  created_at: string;
  favorites_count: number;
  created_by: string;
  prompt_text: string;
  notes: string;
}

interface Like {
  id: string;
  prompt_id: string;
  user_id: string;
}

export default function PromptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subgroupId = searchParams.get('subgroup');
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserLikes().then(() => {
        fetchPrompts();
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [activeTab]);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      setUser(user);
      if (!user) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    const { data: likes } = await supabase
      .from('likes')
      .select('prompt_id')
      .eq('user_id', user.id);

    if (likes) {
      setUserLikes(new Set(likes.map(like => like.prompt_id)));
    }
  };

  const fetchPrompts = async () => {
    let query = supabase
      .from('prompts')
      .select('*');

    if (subgroupId) {
      query = query.eq('subgroup_id', subgroupId);
    }

    const { data } = await query.order('created_at', { ascending: false });

    if (data) {
      // Filter prompts if we're on the favorites tab
      const filteredData = activeTab === 'favorites' 
        ? data.filter(prompt => userLikes.has(prompt.id))
        : data;

      // Add favorites count from local state
      const promptsWithLikes = filteredData.map(prompt => ({
        ...prompt,
        favorites_count: prompt.favorites_count || 0,
      }));

      setPrompts(promptsWithLikes);

      // Set initial selected prompt if needed
      if (promptsWithLikes.length > 0 && !selectedPrompt && !isCreating) {
        setSelectedPrompt(promptsWithLikes[0]);
      } else if (promptsWithLikes.length === 0 && !isCreating) {
        setIsCreating(true);
      }

      return promptsWithLikes;
    }
    return [];
  };

  const handleLike = async (promptId: string) => {
    try {
      const isLiked = userLikes.has(promptId);
      const newUserLikes = new Set(userLikes);

      if (isLiked) {
        // Unlike: Delete from Supabase and remove from local set
        await supabase
          .from('likes')
          .delete()
          .eq('prompt_id', promptId)
          .eq('user_id', user.id);

        newUserLikes.delete(promptId);

        // Decrement favorites count in Supabase
        await supabase.rpc('decrement_favorites_count', { prompt_id: promptId });
      } else {
        // Like: Insert into Supabase and add to local set
        await supabase.from('likes').insert([
          {
            prompt_id: promptId,
            user_id: user.id,
          },
        ]);

        newUserLikes.add(promptId);

        // Increment favorites count in Supabase
        await supabase.rpc('increment_favorites_count', { prompt_id: promptId });
      }

      // Update local state
      setUserLikes(newUserLikes);

      // Refresh prompts to update the counts
      await fetchPrompts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <AuthForm onSuccess={checkUser} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-navy-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-white hover:text-gray-200">
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-semibold">Prompts</h1>
          </div>
          <Link href="/" className="text-white hover:text-gray-200">
            <HomeIcon className="h-6 w-6" />
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 flex gap-6">
        {/* Left sidebar */}
        <div className="w-1/3 bg-white rounded-lg shadow-sm">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('all')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm
                  ${activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm
                  ${activeTab === 'favorites'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Favorites
              </button>
            </nav>
          </div>

          {/* Prompt List */}
          <div className="flex flex-col h-full">
            <div className="flex-1 divide-y divide-gray-200 overflow-y-auto">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${
                    selectedPrompt?.id === prompt.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedPrompt(prompt);
                    setIsCreating(false);
                  }}
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{prompt.title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(prompt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(prompt.id);
                      }}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <span className="text-sm mr-1">{prompt.favorites_count}</span>
                      {userLikes.has(prompt.id) ? (
                        <StarIconSolid className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <StarIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  if (!subgroupId) {
                    setError('Please select a subgroup first');
                    return;
                  }
                  setIsCreating(true);
                  setSelectedPrompt(null);
                  setError(null);
                }}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Create New Prompt
              </button>
            </div>
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {isCreating ? (
            <CreatePromptForm
              subgroupId={subgroupId || ''}
              onCancel={() => {
                setIsCreating(false);
                setError(null);
                if (prompts.length > 0) {
                  setSelectedPrompt(prompts[0]);
                }
              }}
              onSubmit={async () => {
                try {
                  const updatedPrompts = await fetchPrompts();
                  setIsCreating(false);
                  setError(null);
                  if (updatedPrompts.length > 0) {
                    setSelectedPrompt(updatedPrompts[0]);
                  }
                } catch (err: any) {
                  setError(err.message || 'Failed to create prompt');
                }
              }}
            />
          ) : selectedPrompt ? (
            <PromptDetails
              prompt={selectedPrompt}
              onUsePrompt={(id) => {
                router.push(`/prompts/run?id=${id}`);
              }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Select a prompt or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 