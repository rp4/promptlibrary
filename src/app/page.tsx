'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';

interface Group {
  id: string;
  name: string;
  order_id: number;
}

interface Subgroup {
  id: string;
  name: string;
  group_id: string;
  order_id: number;
}

export default function Home() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    // Fetch groups
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .order('order_id');

    if (groupsData) {
      setGroups(groupsData);
      setActiveGroup(groupsData[0]?.id);
    }

    // Fetch subgroups
    const { data: subgroupsData } = await supabase
      .from('subgroups')
      .select('*')
      .order('order_id');

    if (subgroupsData) {
      setSubgroups(subgroupsData);
    }
  };

  const handleSubgroupClick = (subgroupId: string) => {
    router.push(`/prompts?subgroup=${subgroupId}`);
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

  const filteredSubgroups = subgroups.filter(
    (subgroup) => subgroup.group_id === activeGroup
  );

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">
                Gamified Prompt Library
              </h1>
              <button
                onClick={() => {
                  supabase.auth.signOut();
                  setUser(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>

          <div>
            <nav className="flex space-x-4 px-4 sm:px-6 lg:px-8 py-4" aria-label="Tabs">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md
                    ${activeGroup === group.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {group.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubgroups.map((subgroup) => (
                <div
                  key={subgroup.id}
                  onClick={() => handleSubgroupClick(subgroup.id)}
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 hover:ring-1 hover:ring-gray-400 cursor-pointer"
                >
                  <div className="min-h-[100px] flex items-center justify-center">
                    <h3 className="text-lg font-medium text-gray-900 text-center">
                      {subgroup.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 