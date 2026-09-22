"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, Copy, RotateCcw, ArrowRight, LayoutPanelLeft, LogOut } from 'lucide-react';
import { Platform, Tone } from '../types';
import { createClient } from '../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { analyzeVoice } from '../lib/voice-checker';

// Maps the format param sent by DraftModal → the Platform tab id used in this editor
const FORMAT_TO_PLATFORM: Record<string, Platform> = {
  linkedin:  'linkedin',
  x:         'twitter',
  blog:      'medium',   // closest match — both long-form
  medium:    'medium',
};

export default function OmniPostPage() {
  const [input, setInput] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Platform>('twitter');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [impact, setImpact] = useState<{tag: string, why: string} | null>(null);

  // Banner state for when content is auto-pasted from Discover
  const [discoverBanner, setDiscoverBanner] = useState(false);

  const supabase = createClient();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const fromDiscover = searchParams.get('source') === 'discover';
  const isExtracted = searchParams.get('extracted') === 'true';
  const discoverFormat = searchParams.get('format') || 'linkedin';

  const platforms: { id: Platform; label: string; icon: string }[] = [
    { id: 'twitter',    label: 'X (Twitter)',   icon: '🐦' },
    { id: 'linkedin',   label: 'LinkedIn',       icon: '💼' },
    { id: 'instagram',  label: 'Instagram',      icon: '📸' },
    { id: 'newsletter', label: 'Newsletter',     icon: '✉️' },
    { id: 'medium',     label: 'Medium/Blog',    icon: '✍️' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ── Load existing project (unchanged) ────────────────────────────────
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  // ── Auto-paste from Discover page ────────────────────────────────────
  // Runs only when source=discover is in the URL.
  // Reads clipboard (the DraftModal already wrote the draft text there),
  // pastes it into the Master Content textarea, and switches to the right
  // platform tab so the user can hit "Repurpose All" immediately.
  useEffect(() => {
    if (!fromDiscover) return;

    async function pasteFromDiscover() {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setInput(text);
          setDiscoverBanner(true);
          // Switch to the platform tab that matches what was drafted
          const targetPlatform = FORMAT_TO_PLATFORM[discoverFormat] || 'twitter';
          setActiveTab(targetPlatform);
        }
      } catch (err) {
        // Clipboard permission denied or empty — fail silently,
        // user can paste manually
        console.warn('Could not read clipboard from Discover:', err);
      }
    }

    pasteFromDiscover();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  async function loadProject(id: string) {
    setIsLoading(true);
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (project) {
        setInput(project.master_content);
        const { data: contents } = await supabase
          .from('repurposed_content')
          .select('*')
          .eq('project_id', id);

        if (contents) {
          const restoredResults: Record<string, string> = {};
          contents.forEach(item => {
            restoredResults[item.platform] = item.content;
          });
          setResults(restoredResults);
        }
      }
    } catch (error) {
      console.error('Error restoring project:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleRepurpose = async () => {
    if (!input) return alert('Please enter content!');
    setIsLoading(true);
    setResults({});
    setImpact(null);
    setDiscoverBanner(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Your session has expired. Please log in again.');
        return;
      }

      // STEP 1: Initialize Project
      setLoadingStep('Initializing project...');
      const projectRes = await fetch('/api/project/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: input }),
      });

      const projectData = await projectRes.json();
      if (!projectData.projectId) {
        throw new Error(projectData.error || 'Failed to create project');
      }

      const createdProjectId = projectData.projectId;

      // STEP 2: Generate content for all platforms
      for (const p of platforms) {
        setLoadingStep(`Generating ${p.label}...`);
        const res = await fetch('/api/repurpose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: input,
            platform: p.id,
            tone,
            projectId: createdProjectId,
          }),
        });

        const data = await res.json();

        if (data.error === 'Insufficient credits') {
          alert('You have run out of credits! Upgrade to Pro for unlimited access.');
          setIsLoading(false);
          return;
        }

        if (data.result) {
          setResults(prev => ({ ...prev, [p.id]: data.result }));
          if (p.id === activeTab) {
            setImpact({ tag: data.impactTag, why: data.whyItMatters });
          }
        } else {
          setResults(prev => ({ ...prev, [p.id]: `Error: ${data.error || 'Unknown error'}` }));
        }
      }
    } catch (error: any) {
      alert(error.message || 'Something went wrong!');
    } finally {
      setIsLoading(false);
    }
  };

  const voice = analyzeVoice(results[activeTab] || '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-brand-gradientStart to-brand-gradientEnd p-2 rounded-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">OmniPost <span className="text-brand-600">AI</span></span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/discover'}
            className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition mr-2"
          >
            Discover
          </button>
          <button
            onClick={() => window.location.href = '/history'}
            className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition mr-2"
          >
            My Library
          </button>
          <button
            onClick={() => window.location.href = '/settings'}
            className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition mr-4"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-200 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4">
            One idea, <span className="text-brand-600">every platform.</span>
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Transform your long-form thoughts into a multi-channel content strategy in seconds.
          </p>
        </div>

        {/* ── Discover banner ── */}
        {discoverBanner && (
          <div className={`mb-6 flex items-start gap-3 rounded-2xl px-5 py-4 border ${isExtracted ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
            <Sparkles className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isExtracted ? 'text-emerald-600' : 'text-blue-600'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isExtracted ? 'text-emerald-800' : 'text-blue-800'}`}>
                {isExtracted ? '🔍 Full article extracted & drafted' : 'Draft imported from Discover'}
              </p>
              <p className={`text-xs mt-0.5 ${isExtracted ? 'text-emerald-700' : 'text-blue-600'}`}>
                {isExtracted
                  ? <>The full article has been read and AI-generated drafts for all platforms are in the clipboard — pasted into the editor below. The content includes LinkedIn, X, and Blog versions. Hit <strong>Repurpose All</strong> to further refine each platform.</>
                  : <>Your drafted post has been pasted into the editor below. Hit{' '}<strong>Repurpose All</strong> to expand it across all platforms, or edit it first.</>
                }
              </p>
            </div>
            <button
              onClick={() => setDiscoverBanner(false)}
              className={`text-lg leading-none flex-shrink-0 ${isExtracted ? 'text-emerald-400 hover:text-emerald-600' : 'text-blue-400 hover:text-blue-600'}`}
            >
              ×
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* ── Left panel ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Master Content
                  {discoverBanner && (
                    <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      From Discover
                    </span>
                  )}
                </label>
                <textarea
                  className={`w-full p-4 border rounded-xl h-80 focus:ring-2 focus:ring-brand-500 outline-none transition ${
                    discoverBanner ? 'border-blue-300 ring-1 ring-blue-200' : ''
                  }`}
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

          {/* ── Right panel ── */}
          <div className="lg:col-span-7">
            {!isLoading && Object.keys(results).length === 0 ? (
              <div className="h-full border-2 border-dashed rounded-2xl bg-slate-100 flex flex-col items-center justify-center p-12 text-center">
                <LayoutPanelLeft className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-semibold text-lg">Ready to amplify?</h3>
                <p className="text-slate-500">Your generated content will appear here.</p>
                {discoverBanner && (
                  <p className="text-sm text-blue-500 mt-3 font-medium">
                    ← Draft ready — hit Repurpose All to expand it
                  </p>
                )}
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(results[activeTab] || '')}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-5 h-5" />
                      </button>

                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          const token = session?.access_token;
                          if (!token) { alert('Your session has expired. Please log in again.'); return; }

                          const res = await fetch('/api/publish', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              platform: activeTab,
                              content: results[activeTab],
                            }),
                          });

                          const data = await res.json();
                          alert(data.message || data.error || 'Publishing failed');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition shadow-sm"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Publish
                      </button>
                    </div>
                  </div>

                  {/* CEO IMPACT LENS CARD */}
                  {impact && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            impact.tag === 'Regulatory' ? 'bg-red-100 text-red-600' :
                            impact.tag === 'Competitive' ? 'bg-amber-100 text-amber-600' :
                            impact.tag === 'Talent' ? 'bg-purple-100 text-purple-600' :
                            impact.tag === 'Market' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {impact.tag}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">CEO Impact Lens</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-brand-600">
                          Voice Score: {voice.score}%
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        <strong>Why it matters:</strong> {impact.why}
                      </p>
                    </div>
                  )}

                  {/* VOICE-MATCH FLAGS */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {voice.flags.map((f, i) => (
                      <span key={i} className={`text-[10px] px-2 py-1 rounded-md ${
                        f.type === 'good' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {f.type === 'good' ? '✓' : '⚠'} {f.msg}
                      </span>
                    ))}
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