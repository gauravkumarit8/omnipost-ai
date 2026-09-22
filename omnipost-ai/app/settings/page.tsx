"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import { Sparkles, Save, ArrowLeft, User, Linkedin, Twitter, Instagram, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [brandVoice, setBrandVoice] = useState('');
  const [connections, setConnections] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Brand Voice
      const { data: profile } = await supabase
        .from('profiles')
        .select('brand_voice')
        .eq('id', user.id)
        .single();
      setBrandVoice(profile?.brand_voice || '');

      // 2. Fetch Connected Accounts
      const { data: connData } = await supabase
        .from('user_connections')
        .select('platform')
        .eq('user_id', user.id);
      
      setConnections(connData?.map(c => c.platform) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveVoice() {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ brand_voice: brandVoice })
        .eq('id', user.id);

      if (error) throw error;
      alert('Brand voice saved successfully! 🚀');
    } catch (error: any) {
      alert('Error saving voice: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="border-b bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-brand-gradientStart to-brand-gradientEnd p-2 rounded-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">OmniPost <span className="text-brand-600">AI</span></span>
          </div>
        </div>
        <div className="text-sm font-medium text-slate-500">Account Settings</div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Account <span className="text-brand-600">Settings</span></h1>
          <p className="text-slate-600">Manage your identity and connect your social channels for direct publishing.</p>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* --- SECTION 1: SOCIAL CONNECTIONS --- */}
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Connected Accounts</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">Link your accounts to publish content directly from OmniPost AI without copy-pasting.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin />, color: 'bg-blue-600' },
                  { id: 'twitter', label: 'X (Twitter)', icon: <Twitter />, color: 'bg-black' },
                  { id: 'instagram', label: 'Instagram', icon: <Instagram />, color: 'bg-pink-600' },
                ].map((platform) => (
                  <div key={platform.id} className="flex items-center justify-between p-4 border rounded-2xl hover:border-brand-500 transition bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`${platform.color} p-2 rounded-lg text-white`}>
                        {platform.icon}
                      </div>
                      <span className="font-semibold text-sm">{platform.label}</span>
                    </div>
                    {connections.includes(platform.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <button 
                        onClick={() => window.location.href = `/api/auth/${platform.id}`}
                        className="text-xs font-bold text-brand-600 hover:underline"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* --- SECTION 2: BRAND VOICE --- */}
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Your Brand Identity</h2>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Describe your writing style
                </label>
                <textarea 
                  className="w-full p-4 border rounded-2xl h-64 focus:ring-2 focus:ring-brand-500 outline-none transition leading-relaxed"
                  placeholder="Example: I am a tech entrepreneur who speaks directly and avoids corporate jargon..."
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                />
                <p className="text-xs text-slate-400 italic">
                  Tip: Mention your target audience and things you absolutely avoid.
                </p>
              </div>

              <button 
                onClick={saveVoice}
                disabled={isSaving}
                className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Saving...' : 'Save Brand Voice'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}