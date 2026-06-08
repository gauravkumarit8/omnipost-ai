"use client";

import React, { useState } from 'react';
import { Sparkles, Copy, RotateCcw, ArrowRight, LayoutPanelLeft, LogOut } from 'lucide-react';
import { Platform, Tone } from '../types';
import { createClient } from '../lib/supabase';

export default function OmniPostPage() {
  const [input, setInput] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Platform>('twitter');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  const supabase = createClient();

  const platforms: { id: Platform; label: string; icon: string }[] = [
    { id: 'twitter', label: 'X (Twitter)', icon: '🐦' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'newsletter', label: 'Newsletter', icon: '✉️' },
    { id: 'medium', label: 'Medium/Blog', icon: '✍️' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Reload to trigger middleware redirect to /login
  };

  const handleRepurpose = async () => {
    if (!input) return alert('Please enter content!');
    setIsLoading(true);
    setResults({});

    try {
      // 1. Get the current session and access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Your session has expired. Please log in again.');
        return;
      }

      for (const p of platforms) {
        setLoadingStep(`Generating ${p.label}...`);
        const res = await fetch('/api/repurpose', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // <--- Pass the token here
          },
          body: JSON.stringify({ content: input, platform: p.id, tone }),
        });
        
        const data = await res.json();
        if (data.result) {
          setResults(prev => ({ ...prev, [p.id]: data.result }));
        } else {
          setResults(prev => ({ ...prev, [p.id]: `Error: ${data.error || 'Unknown error'}` }));
        }
      }
    } catch (error) {
      alert('Something went wrong!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="border-b bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-brand-gradientStart to-brand-gradientEnd p-2 rounded-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">OmniPost <span className="text-brand-600">AI</span></span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-200 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4">One idea, <span className="text-brand-600">every platform.</span></h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">Transform your long-form thoughts into a multi-channel content strategy in seconds.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Input Area */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Master Content</label>
                <textarea 
                  className="w-full p-4 border rounded-xl h-80 focus:ring-2 focus:ring-brand-500 outline-none transition"
                  placeholder="Paste your blog post or notes here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Tone</label>
                <div className="flex gap-2">
                  {(['professional', 'witty', 'empathetic'] as Tone[]).map(t => (
                    <button 
                      key={t}
                      onClick={() => setTone(t)}
                      className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border capitalize transition ${
                        tone === t ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleRepurpose}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-gradientStart to-brand-gradientEnd text-white font-bold py-4 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isLoading ? <RotateCcw className="animate-spin w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                {isLoading ? 'Generating...' : 'Repurpose All'}
              </button>
            </div>
          </div>

          {/* Output Area */}
          <div className="lg:col-span-7">
            {!isLoading && Object.keys(results).length === 0 ? (
              <div className="h-full border-2 border-dashed rounded-2xl bg-slate-100 flex flex-col items-center justify-center p-12 text-center">
                <LayoutPanelLeft className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-semibold text-lg">Ready to amplify?</h3>
                <p className="text-slate-500">Your generated content will appear here.</p>
              </div>
            ) : isLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
                <p className="font-medium text-slate-600">{loadingStep}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-200 rounded-xl w-fit overflow-x-auto">
                  {platforms.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setActiveTab(p.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${
                        activeTab === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-2xl border shadow-sm relative group">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{platforms.find(p => p.id === activeTab)?.icon}</span>
                      <span className="font-bold text-lg">{platforms.find(p => p.id === activeTab)?.label}</span>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(results[activeTab] || '')}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {results[activeTab]}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}