'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';
import { ClockIcon } from '@heroicons/react/24/outline';

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
    <main className="min-h-screen">
      <header className="header">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <Link href="/" className="text-white flex-1 text-center">
              <h1 className="text-2xl font-semibold">Gamified Prompt Library</h1>
            </Link>
            <div className="flex-1 flex justify-end">
              <Link href="/prompts/history" className="text-white/80 hover:text-white transition-colors" title="History">
                <ClockIcon className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`
                flex-1 py-3 px-6 rounded-lg font-medium transition-all
                ${
                  activeGroup === group.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {group.name}
            </button>
          ))}
        </div>

        {/* Subgroups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredSubgroups.map((subgroup) => (
            <button
              key={subgroup.id}
              onClick={() => handleSubgroupClick(subgroup.id)}
              className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow border border-gray-100"
            >
              <h3 className="text-lg font-medium text-gray-900">{subgroup.name}</h3>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
} 