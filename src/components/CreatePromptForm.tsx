'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface CreatePromptFormProps {
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  subgroupId: string;
}

export default function CreatePromptForm({ onCancel, onSubmit, subgroupId }: CreatePromptFormProps) {
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Creating prompt with subgroupId:', subgroupId);
      
      if (!subgroupId) {
        throw new Error('No subgroup selected');
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching subgroup data...');
      const { data: subgroupData, error: subgroupError } = await supabase
        .from('subgroups')
        .select('group_id')
        .eq('id', subgroupId)
        .single();

      if (subgroupError) {
        console.error('Subgroup fetch error:', subgroupError);
        throw new Error('Failed to fetch subgroup data');
      }

      if (!subgroupData) {
        throw new Error('Subgroup not found');
      }

      console.log('Creating prompt...');
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .insert([
          {
            title,
            prompt_text: promptText,
            notes,
            created_by: user.id,
            favorites_count: 0,
            subgroup_id: subgroupId,
            group_id: subgroupData.group_id,
          },
        ])
        .select()
        .single();

      if (promptError) {
        console.error('Prompt creation error:', promptError);
        throw new Error(promptError.message);
      }

      console.log('Prompt created successfully:', promptData);
      await onSubmit();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'An error occurred while creating the prompt');
      throw err; // Propagate error to parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

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

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Prompt'}
        </button>
      </div>
    </form>
  );
} 