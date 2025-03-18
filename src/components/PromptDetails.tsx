'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface Prompt {
  id: string;
  title: string;
  prompt_text: string;
  notes: string;
  created_at: string;
  favorites_count: number;
  created_by: string;
}

interface PromptDetailsProps {
  prompt: Prompt;
  onUsePrompt: (id: string) => void;
  onEdit?: () => void;
}

export default function PromptDetails({ prompt, onUsePrompt }: PromptDetailsProps) {
  const router = useRouter();
  const [isCreator, setIsCreator] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(prompt.title);
  const [promptText, setPromptText] = useState(prompt.prompt_text);
  const [notes, setNotes] = useState(prompt.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    checkIfCreator();
  }, [prompt]);

  React.useEffect(() => {
    // Update form values when prompt changes
    setTitle(prompt.title);
    setPromptText(prompt.prompt_text);
    setNotes(prompt.notes || '');
  }, [prompt]);

  const checkIfCreator = async () => {
    const user = await getCurrentUser();
    if (user && user.id === prompt.created_by) {
      setIsCreator(true);
    } else {
      setIsCreator(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', prompt.id)
        .eq('created_by', (await getCurrentUser())?.id);

      if (error) throw error;

      // Redirect to prompts page after successful deletion
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete prompt');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('prompts')
        .update({
          title,
          prompt_text: promptText,
          notes,
        })
        .eq('id', prompt.id)
        .eq('created_by', user.id);

      if (error) throw error;

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update prompt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                Prompt
              </label>
              <textarea
                id="prompt"
                rows={6}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900">{prompt.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Created on {new Date(prompt.created_at).toLocaleDateString()}
            </p>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900">Prompt</h3>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {prompt.prompt_text}
                </pre>
              </div>
            </div>

            {prompt.notes && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">Notes</h3>
                <div className="mt-2 text-sm text-gray-700">
                  <p>{prompt.notes}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between items-center">
        {isCreator && (
          <div className="space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        )}
        {!isEditing && (
          <button
            onClick={() => onUsePrompt(prompt.id)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Use Prompt
          </button>
        )}
      </div>
    </div>
  );
} 