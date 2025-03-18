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
      if (!subgroupId) {
        throw new Error('No subgroup selected');
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: subgroupData, error: subgroupError } = await supabase
        .from('subgroups')
        .select('group_id')
        .eq('id', subgroupId)
        .single();

      if (subgroupError) {
        throw new Error('Failed to fetch subgroup data');
      }

      if (!subgroupData) {
        throw new Error('Subgroup not found');
      }

      const { error: promptError } = await supabase
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
        throw new Error(promptError.message);
      }

      await onSubmit();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      {error && (
        <div className="rounded-md bg-red-50 p-4 animate-fadeIn">
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
          className="input"
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
          className="input"
          required
          placeholder="Enter your prompt text here. Use [[variable]] syntax for variables that will be replaced when running the prompt."
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
          className="input"
          placeholder="Add any additional notes or instructions for using this prompt."
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? 'Creating...' : 'Create Prompt'}
        </button>
      </div>
    </form>
  );
} 