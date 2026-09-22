"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Newspaper, Search, LogOut, RotateCcw, Clock,
  Bookmark, BookmarkCheck, PenLine, TrendingUp, LayoutDashboard,
  CalendarDays, Sun, Moon, Bell, ChevronRight,
} from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Article } from '../../lib/types';
import { useNewsStore, QueueItem, CompanyProfile } from '../../hooks/useNewsStore';
import DraftModal from '../../components/discover/DraftModal';
import ContentQueue from '../../components/discover/ContentQueue';
import Dashboard from '../../components/discover/Dashboard';
import ArticleExtractor from '../../components/discover/ArticleExtractor';

// ── Types ─────────────────────────────────────────────────────────────────
type View = 'digest' | 'feed' | 'trending' | 'saved' | 'queue' | 'stats';
type SortMode = 'newest' | 'trending' | 'trust';

// ── Helpers ───────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    if (ms < 60000) return 'just now';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h ago';
    return Math.floor(ms / 86400000) + 'd ago';
  } catch { return ''; }
}

function readTime(text: string): string {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) + 'm read';
}

function formatCountdown(s: number): string {
  const m = Math.floor(s / 60); const sec = s % 60;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

const CAT_STYLES: Record<string, string> = {
  AI: 'bg-purple-100 text-purple-600', Launch: 'bg-green-100 text-green-700',
  Funding: 'bg-amber-100 text-amber-700', Product: 'bg-blue-100 text-blue-600',
  Security: 'bg-red-100 text-red-600', Other: 'bg-slate-100 text-slate-500',
};
const IMPACT_ICONS: Record<string, string> = { Regulatory: '⚖️', Competitive: '⚔️', Talent: '👤', Market: '📈' };

const STOP_WORDS = new Set(['the','a','an','is','are','in','on','to','of','for','and','or','with','its','has','new','will','can','how','why','what','this','that','from','it','as','at','by','be']);
function topTopics(articles: Article[], n: number): string[] {
  const freq: Record<string, number> = {};
  articles.forEach(a => {
    (a.title + ' ' + a.description).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
      .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

// ── Article Card ──────────────────────────────────────────────────────────
function ArticleCard({ article, isBookmarked, onBookmark, onDraft, rank }: {
  article: Article; isBookmarked: boolean;
  onBookmark: () => void; onDraft: () => void; rank?: number;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition group relative overflow-hidden
      ${article.isBreaking ? 'border-l-4 border-l-red-500' : article.isTrending ? 'border-l-4 border-l-amber-400' : 'border-slate-200'}`}>
      {rank && (
        <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
          {rank}
        </div>
      )}
      <div className={`p-5 space-y-3 ${rank ? 'pl-10' : ''}`}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {article.isBreaking && <span className="text-[9px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">BREAKING</span>}
            {article.isTrending && !article.isBreaking && <span className="text-[9px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">TRENDING</span>}
            {!article.isBreaking && !article.isTrending && (Date.now() - new Date(article.publishedAt).getTime()) < 10800000 && (
              <span className="text-[9px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">NEW</span>
            )}
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${CAT_STYLES[article.cat] || CAT_STYLES.Other}`}>{article.cat}</span>
            {article.impactTags.map(t => (
              <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {IMPACT_ICONS[t] || '📝'} {t}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">⭐ {article.trust}%</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base leading-snug group-hover:text-blue-600 transition">
          <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-500 line-clamp-2">{article.description}</p>

        {/* Why it matters */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 italic">
            <strong className="text-slate-700">Why it matters:</strong> {article.whyItMatters}
          </p>
        </div>

        {/* Meta + actions */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="font-semibold text-slate-500">{article.source}</span>
            <span>·</span>
            <span>{timeAgo(article.publishedAt)}</span>
            <span>·</span>
            <span>{readTime(article.title + ' ' + article.description)}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={onBookmark} title={isBookmarked ? 'Remove bookmark' : 'Save for later'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition">
              {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
            {/* Quick draft — uses RSS description only */}
            <button onClick={onDraft}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition">
              <PenLine className="w-3 h-3" /> Draft
            </button>
            {/* Full extract — fetches complete article + AI generates all platform drafts */}
            <ArticleExtractor article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const supabase = createClient();
  const store = useNewsStore();

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(3600);
  const [refreshInterval, setRefreshInterval] = useState(3600);
  const [view, setView] = useState<View>('digest');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [draftArticle, setDraftArticle] = useState<Article | null>(null);
  const [editingQueueItem, setEditingQueueItem] = useState<QueueItem | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CompanyProfile>(store.profile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [kwInput, setKwInput] = useState('');
  // Client-only greeting — avoids server/client mismatch (hydration error)
  const [greeting, setGreeting] = useState('Good morning');

  // Sync profile draft when store hydrates
  useEffect(() => { if (store.hydrated) setProfileDraft(store.profile); }, [store.hydrated, store.profile]);

  // Set greeting client-side only — avoids server/client time-of-day mismatch
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.articles) setArticles(data.articles);
      setCountdown(refreshInterval);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [refreshInterval]);

  useEffect(() => { fetchNews(); }, []);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { fetchNews(); return refreshInterval; } return prev - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [fetchNews, refreshInterval]);

  // ── Filtered articles ──────────────────────────────────────────────────
  const sortedFiltered = useMemo(() => {
    let list = [...articles];
    // view filter
    if (view === 'trending') list = list.filter(a => a.isTrending || a.isBreaking);
    if (view === 'saved') list = list.filter(a => store.bookmarks.has(a.id));
    // category filter
    if (activeCat !== 'all') list = list.filter(a => a.cat === activeCat);
    // keyword alert filter (always applied as a highlight — search is separate)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q)
      );
    }
    // sort
    if (sortMode === 'trending') list.sort((a, b) => b.trendScore - a.trendScore);
    else if (sortMode === 'trust') list.sort((a, b) => b.trust - a.trust);
    else list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return list;
  }, [articles, view, activeCat, searchQuery, sortMode, store.bookmarks]);

  // CEO digest — top 7 by composite score
  const digestArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => (b.trendScore + b.trust / 20) - (a.trendScore + a.trust / 20))
      .slice(0, 7);
  }, [articles]);

  const trendingTopics = useMemo(() => topTopics(articles.filter(a => a.isTrending), 6), [articles]);

  const keywordMatchArticles = useMemo(() => {
    if (!store.keywords.length) return [];
    return articles.filter(a => store.keywords.some(k => a.title.toLowerCase().includes(k) || a.description.toLowerCase().includes(k)));
  }, [articles, store.keywords]);

  // ── Profile save ──────────────────────────────────────────────────────
  const saveProfile = () => {
    store.saveProfile(profileDraft);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  // ── Queue edit handler ────────────────────────────────────────────────
  const handleEditQueueItem = (item: QueueItem) => {
    const article = articles.find(a => a.id === item.articleId);
    if (article) {
      store.removeFromQueue(item.id);
      setEditingQueueItem(item);
      setDraftArticle(article);
    }
  };

  const openDraftForArticle = (article: Article) => {
    setEditingQueueItem(null);
    setDraftArticle(article);
  };

  // ── Add keyword ───────────────────────────────────────────────────────
  const addKw = () => {
    const v = kwInput.trim().toLowerCase();
    if (v) { store.addKeyword(v); setKwInput(''); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ── Nav items ─────────────────────────────────────────────────────────
  const navItems: { id: View; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: 'digest',   icon: <Sparkles className="w-4 h-4" />,       label: 'CEO Digest',     count: digestArticles.length },
    { id: 'feed',     icon: <Newspaper className="w-4 h-4" />,      label: 'All News',       count: articles.length },
    { id: 'trending', icon: <TrendingUp className="w-4 h-4" />,     label: 'Trending',       count: articles.filter(a => a.isTrending).length },
    { id: 'saved',    icon: <Bookmark className="w-4 h-4" />,       label: 'Saved',          count: store.bookmarks.size },
    { id: 'queue',    icon: <CalendarDays className="w-4 h-4" />,   label: 'Content Queue',  count: store.queue.filter(q => q.status === 'pending').length },
    { id: 'stats',    icon: <LayoutDashboard className="w-4 h-4" />,label: 'Dashboard' },
  ];

  const cats = ['all', 'AI', 'Launch', 'Funding', 'Security', 'Product', 'Other'];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${store.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top nav */}
      <nav className={`border-b px-5 py-3 flex items-center gap-3 sticky top-0 z-40 ${store.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 cursor-pointer mr-2" onClick={() => window.location.href = '/'}>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-lg">
            <Sparkles className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight">OmniPost <span className="text-blue-600">AI</span></span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search headlines…"
            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-xl border outline-none transition focus:ring-2 focus:ring-blue-400 ${store.darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-slate-100 border-slate-200'}`} />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Countdown + interval */}
          <div className={`hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border ${store.darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-500'}`}>
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="font-semibold text-blue-600">{formatCountdown(countdown)}</span>
            <select value={refreshInterval} onChange={e => { const v = parseInt(e.target.value); setRefreshInterval(v); setCountdown(v); }}
              className={`border-none outline-none text-xs rounded cursor-pointer ${store.darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>
              <option value={300}>5 min</option>
              <option value={900}>15 min</option>
              <option value={1800}>30 min</option>
              <option value={3600}>1 hr</option>
            </select>
          </div>

          <button onClick={fetchNews} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition" title="Refresh now">
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button onClick={store.toggleDark} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition">
            {store.darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleLogout} className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition">
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-56 shrink-0 hidden md:flex flex-col sticky top-12 h-[calc(100vh-48px)] overflow-y-auto border-r ${store.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="p-4 space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Views</p>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition
                  ${view === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : store.darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${view === item.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className={`border-t mx-3 my-1 ${store.darkMode ? 'border-slate-700' : 'border-slate-100'}`} />

          {/* Category filters */}
          <div className="px-4 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Category</p>
            {cats.map(cat => (
              <button key={cat} onClick={() => { setActiveCat(cat); if (view !== 'digest' && view !== 'queue' && view !== 'stats') setView('feed'); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition
                  ${activeCat === cat && view === 'feed'
                    ? 'bg-blue-50 text-blue-600'
                    : store.darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                <span className="flex-1 capitalize">{cat === 'all' ? '🗂 All' : cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-400`}>
                  {cat === 'all' ? articles.length : articles.filter(a => a.cat === cat).length}
                </span>
              </button>
            ))}
          </div>

          <div className={`border-t mx-3 my-1 ${store.darkMode ? 'border-slate-700' : 'border-slate-100'}`} />

          {/* Keyword alerts */}
          <div className="px-4 pb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Keyword Alerts</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {store.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-70"
                  onClick={() => store.removeKeyword(kw)}>
                  {kw} ✕
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKw()}
                placeholder="e.g. OpenAI…"
                className={`flex-1 text-xs px-2 py-1 rounded-lg border outline-none ${store.darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200'} focus:ring-1 focus:ring-blue-400`} />
              <button onClick={addKw} className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg font-bold hover:bg-blue-200 transition">＋</button>
            </div>
          </div>

          <div className={`border-t mx-3 my-1 ${store.darkMode ? 'border-slate-700' : 'border-slate-100'}`} />

          {/* Company profile */}
          <div className="px-4 pb-4">
            <button onClick={() => setShowProfile(p => !p)}
              className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              Company Profile
              <ChevronRight className={`w-3 h-3 transition-transform ${showProfile ? 'rotate-90' : ''}`} />
            </button>
            {showProfile && (
              <div className="space-y-1.5">
                {([
                  { key: 'name',        placeholder: 'CEO name' },
                  { key: 'company',     placeholder: 'Company name' },
                  { key: 'product',     placeholder: 'Product / what you sell' },
                  { key: 'competitors', placeholder: 'Competitors (comma-separated)' },
                ] as { key: keyof CompanyProfile; placeholder: string }[]).map(f => (
                  <input key={f.key} value={profileDraft[f.key]}
                    onChange={e => setProfileDraft(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`w-full text-xs px-2 py-1.5 rounded-lg border outline-none ${store.darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200'} focus:ring-1 focus:ring-blue-400`} />
                ))}
                <textarea value={profileDraft.talking}
                  onChange={e => setProfileDraft(p => ({ ...p, talking: e.target.value }))}
                  placeholder="Talking points (one per line)"
                  rows={3}
                  className={`w-full text-xs px-2 py-1.5 rounded-lg border outline-none resize-none ${store.darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200'} focus:ring-1 focus:ring-blue-400`} />
                <button onClick={saveProfile}
                  className={`w-full text-xs py-1.5 rounded-lg font-semibold transition ${profileSaved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {profileSaved ? '✓ Saved' : '💾 Save profile'}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-5 max-w-4xl">

          {/* Keyword alert banner */}
          {store.keywords.length > 0 && keywordMatchArticles.length > 0 && (view === 'feed' || view === 'digest') && !searchQuery && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-sm text-amber-700">
              <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>{keywordMatchArticles.length} keyword match{keywordMatchArticles.length > 1 ? 'es' : ''}:</strong>{' '}
                {keywordMatchArticles.slice(0, 2).map(a => `"${a.title.slice(0, 50)}…"`).join(', ')}
              </span>
            </div>
          )}

          {/* Trending topics bar */}
          {trendingTopics.length > 0 && (view === 'feed' || view === 'trending') && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 mb-4 flex-wrap">
              <span className="text-xs font-bold text-amber-600 whitespace-nowrap">🔥 TRENDING</span>
              {trendingTopics.map((t, i) => (
                <button key={t} onClick={() => setSearchQuery(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${i < 2 ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* ── CEO Digest ── */}
          {view === 'digest' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-extrabold">
                  {greeting}
                  {store.profile.name ? `, ${store.profile.name}` : ''} — here's what's worth knowing today
                </h2>
                <p className="text-sm text-slate-500 mt-1">Top {digestArticles.length} stories ranked by recency, source trust, and business relevance</p>
              </div>
              {!store.profile.company && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-5 text-sm text-blue-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>Fill in your <button onClick={() => setShowProfile(true)} className="font-bold underline">Company Profile</button> in the sidebar so drafts mention your company, product, and talking points automatically.</span>
                </div>
              )}
              <div className="space-y-4">
                {digestArticles.map((a, i) => (
                  <ArticleCard key={a.id} article={a} rank={i + 1}
                    isBookmarked={store.bookmarks.has(a.id)}
                    onBookmark={() => store.toggleBookmark(a.id)}
                    onDraft={() => openDraftForArticle(a)} />
                ))}
              </div>
            </div>
          )}

          {/* ── All News / Trending / Saved ── */}
          {(view === 'feed' || view === 'trending' || view === 'saved') && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-bold text-lg">
                  {view === 'trending' ? '🔥 Trending' : view === 'saved' ? '🔖 Saved articles' : '📰 All News'}
                  <span className="ml-2 text-sm font-normal text-slate-400">({sortedFiltered.length})</span>
                </h2>
                <div className="flex gap-1.5">
                  {(['newest', 'trending', 'trust'] as SortMode[]).map(s => (
                    <button key={s} onClick={() => setSortMode(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition capitalize ${sortMode === s ? 'bg-blue-50 text-blue-600 border-blue-300' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {s === 'trending' ? '🔥' : s === 'trust' ? '⭐' : ''} {s}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading && sortedFiltered.length === 0
                ? <div className="grid md:grid-cols-2 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-200 h-56 animate-pulse" />)}</div>
                : sortedFiltered.length === 0
                  ? <div className="text-center py-20 text-slate-400">📭 No articles match your filters.</div>
                  : <div className="grid md:grid-cols-2 gap-4">
                      {sortedFiltered.map(a => (
                        <ArticleCard key={a.id} article={a}
                          isBookmarked={store.bookmarks.has(a.id)}
                          onBookmark={() => store.toggleBookmark(a.id)}
                          onDraft={() => openDraftForArticle(a)} />
                      ))}
                    </div>
              }
            </div>
          )}

          {/* ── Content Queue ── */}
          {view === 'queue' && (
            <div>
              <h2 className="font-bold text-lg mb-4">🗓 Content Queue</h2>
              <ContentQueue
                queue={store.queue}
                competitors={store.profile.competitors}
                onSetStatus={store.setQueueStatus}
                onRemove={store.removeFromQueue}
                onEdit={handleEditQueueItem} />
            </div>
          )}

          {/* ── Dashboard ── */}
          {view === 'stats' && (
            <div>
              <h2 className="font-bold text-lg mb-4">📊 Dashboard</h2>
              <Dashboard
                articles={articles}
                queue={store.queue}
                bookmarkCount={store.bookmarks.size}
                keywordCount={store.keywords.length}
                keywordHits={keywordMatchArticles.length} />
            </div>
          )}
        </main>
      </div>

      {/* Draft modal */}
      {draftArticle && (
        <DraftModal
          article={draftArticle}
          profile={store.profile}
          onClose={() => { setDraftArticle(null); setEditingQueueItem(null); }}
          onAddToQueue={store.addToQueue} />
      )}
    </div>
  );
}