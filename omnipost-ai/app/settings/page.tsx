"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import { Sparkles, Save, ArrowLeft, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [brandVoice, setBrandVoice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('brand_voice')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setBrandVoice(data?.brand_voice || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
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
          <h1 className="text-4xl font-extrabold mb-4">Personalize your <span className="text-brand-600">AI Voice</span></h1>
          <p className="text-slate-600">Tell the AI exactly how you sound. The more detail you provide, the more authentic your content will be.</p>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
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
                placeholder="Example: I am a tech entrepreneur who speaks directly and avoids corporate jargon. I use a lot of analogies, keep my sentences short, and I'm not afraid to be slightly provocative or contrarian."
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
              />
              <p className="text-xs text-slate-400 italic">
                Tip: Mention your target audience, common words you use, and things you absolutely avoid.
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
        )}
      </main>
    </div>
  );
}