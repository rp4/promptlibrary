'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface PromptLog {
  run_id: string;
  prompt_name: string;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  input_data: any; // JSONB
  output_data: any; // JSONB
  logged_at: string;
  user_id: string;
}

function PromptHistoryContent() {
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<PromptLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndLogs = async () => {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setError("Please log in to view history.");
          setUser(null);
          setLoading(false);
          // Consider redirecting to login if needed: router.push('/login');
          return;
        }
        setUser(currentUser);

        const { data, error: dbError } = await supabase
          .from('prompt_usage_log')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('start_time', { ascending: false }); // Show most recent first

        if (dbError) {
          throw dbError;
        }

        setLogs(data || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching prompt history:", err);
        setError(err.message || "Failed to fetch prompt history.");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndLogs();
  }, []);

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2); // Pretty print JSON
    } catch (e) {
      return String(data); // Fallback to string if not valid JSON (shouldn't happen with JSONB)
    }
  };

  const handleLogClick = (log: PromptLog) => {
    setSelectedLog(log);
  };

  const handleCloseDetail = () => {
    setSelectedLog(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading History...</div>
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
          <h1 className="text-2xl font-semibold flex-1 text-center">Prompt History</h1>
          <div className="flex-1"></div> {/* Placeholder for right alignment */}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!user && !loading && !error && (
           <div className="text-center text-gray-500">Please log in to view history.</div>
        )}

        {user && logs.length === 0 && !loading && !error && (
          <div className="text-center text-gray-500">No prompt history found.</div>
        )}

        {user && logs.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {logs.map((log) => (
                <li key={log.run_id} onClick={() => handleLogClick(log)} className="block hover:bg-gray-50 cursor-pointer">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {log.prompt_name || 'Untitled Prompt'}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {formatDistanceToNow(new Date(log.start_time), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                     <div className="mt-2 sm:flex sm:justify-between">
                       <div className="sm:flex">
                         {/* Add more info here if needed, e.g., duration */}
                       </div>
                       <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                         {/* Could add status icons or other indicators */}
                       </div>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-medium text-gray-900">{selectedLog.prompt_name || 'Log Details'}</h3>
               <button onClick={handleCloseDetail} className="text-gray-400 hover:text-gray-600">&times;</button>
             </div>

             <div className="space-y-4 text-sm">
                {/* <div><strong>Run ID:</strong> {selectedLog.run_id}</div> */}
                {/* <div><strong>User ID:</strong> {selectedLog.user_id}</div> */}
                <div><strong>Start Time:</strong> {new Date(selectedLog.start_time).toLocaleString()}</div>
                {/* <div><strong>End Time:</strong> {selectedLog.end_time ? new Date(selectedLog.end_time).toLocaleString() : 'N/A'}</div> */}
                <div><strong>Duration:</strong> {selectedLog.duration_ms !== null ? `${(selectedLog.duration_ms / 1000).toFixed(2)} s` : 'N/A'}</div>

                <div>
                    <h4 className="font-medium text-gray-800 mt-3 mb-1">Input Prompt:</h4>
                    <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs whitespace-pre-wrap">{selectedLog.input_data?.finalPrompt || 'N/A'}</pre>
                </div>
                 <div>
                    <h4 className="font-medium text-gray-800 mt-3 mb-1">Output:</h4>
                    <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs whitespace-pre-wrap">{selectedLog.output_data?.response || selectedLog.output_data?.error || 'N/A'}</pre>
                </div>
                {/* <div><strong>Logged At:</strong> {new Date(selectedLog.logged_at).toLocaleString()}</div> */}
             </div>

             <div className="mt-6 flex justify-end">
               <button
                 onClick={handleCloseDetail}
                 className="btn-secondary"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


export default function PromptHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <PromptHistoryContent />
    </Suspense>
  );
} 