import { NextResponse } from 'next/server';

// ── Feed registry ─────────────────────────────────────────────────────────
// topic values: 'general' | 'ai' | 'security' | 'sport' | 'football' |
//               'cricket' | 'basketball' | 'formula1' | 'tennis'
const FEEDS = [
  // ── TECHNOLOGY — Tier 1 (most trusted, primary sources) ──────────────
  { id: 'ars',    name: 'Ars Technica',    section: 'tech', topic: 'general',  trust: 98, url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'mit',    name: 'MIT Tech Review', section: 'tech', topic: 'ai',       trust: 97, url: 'https://www.technologyreview.com/topnewsrss.xml' },
  { id: 'verge',  name: 'The Verge',       section: 'tech', topic: 'general',  trust: 92, url: 'https://www.theverge.com/rss/index.xml' },
  { id: 'tc',     name: 'TechCrunch',      section: 'tech', topic: 'general',  trust: 90, url: 'https://techcrunch.com/feed/' },
  { id: 'wired',  name: 'Wired',           section: 'tech', topic: 'general',  trust: 94, url: 'https://www.wired.com/feed/rss' },
  { id: 'bberg',  name: 'Bloomberg Tech',  section: 'tech', topic: 'general',  trust: 96, url: 'https://feeds.bloomberg.com/technology/news.rss' },
  { id: 'cnet',   name: 'CNET',            section: 'tech', topic: 'general',  trust: 88, url: 'https://www.cnet.com/rss/news/' },
  // ── TECHNOLOGY — Tier 2 (specialist) ─────────────────────────────────
  { id: 'vb',     name: 'VentureBeat',     section: 'tech', topic: 'ai',       trust: 85, url: 'https://venturebeat.com/feed/' },
  { id: 'tcai',   name: 'TechCrunch AI',   section: 'tech', topic: 'ai',       trust: 89, url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'ieee',   name: 'IEEE Spectrum',   section: 'tech', topic: 'general',  trust: 97, url: 'https://spectrum.ieee.org/rss/fulltext' },
  { id: 'krebs',  name: 'Krebs Security',  section: 'tech', topic: 'security', trust: 99, url: 'https://krebsonsecurity.com/feed/' },
  { id: 'hn',     name: 'Hacker News',     section: 'tech', topic: 'general',  trust: 82, url: 'https://news.ycombinator.com/rss' },
  { id: 'openai', name: 'OpenAI Blog',     section: 'tech', topic: 'ai',       trust: 99, url: 'https://openai.com/news/rss.xml' },
  { id: 'anthr',  name: 'Anthropic Blog',  section: 'tech', topic: 'ai',       trust: 99, url: 'https://www.anthropic.com/news/rss' },

  // ── SPORTS — Global / Multi-sport ────────────────────────────────────
  // BBC Sport: most trusted global sports source, 61.8M Facebook followers
  { id: 'bbc-sport',  name: 'BBC Sport',       section: 'sport', topic: 'sport',     trust: 98, url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  // ESPN: the gold standard for North American sports
  { id: 'espn',       name: 'ESPN',            section: 'sport', topic: 'sport',     trust: 96, url: 'https://www.espn.com/espn/rss/news' },
  // Sky Sports: #1 UK/European sports broadcaster
  { id: 'sky',        name: 'Sky Sports',      section: 'sport', topic: 'sport',     trust: 93, url: 'https://www.skysports.com/rss/12040' },
  // The Athletic (NYT): premium sports journalism
  { id: 'athletic',   name: 'The Athletic',    section: 'sport', topic: 'sport',     trust: 95, url: 'https://www.nytimes.com/athletic/rss/news' },
  // CBS Sports: comprehensive US sports coverage
  { id: 'cbs-sport',  name: 'CBS Sports',      section: 'sport', topic: 'sport',     trust: 88, url: 'https://www.cbssports.com/rss/headlines' },
  // Sports Illustrated: iconic sports journalism since 1954
  { id: 'si',         name: 'Sports Illustrated', section: 'sport', topic: 'sport',  trust: 87, url: 'https://www.si.com/rss/si_topstories.rss' },

  // ── SPORTS — Football / Soccer ────────────────────────────────────────
  { id: 'bbc-football', name: 'BBC Football',  section: 'sport', topic: 'football',  trust: 97, url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { id: 'sky-football', name: 'Sky Sports Football', section: 'sport', topic: 'football', trust: 92, url: 'https://www.skysports.com/rss/12040' },
  { id: 'goal',         name: 'Goal.com',      section: 'sport', topic: 'football',  trust: 85, url: 'https://www.goal.com/feeds/en/news' },

  // ── SPORTS — Cricket ─────────────────────────────────────────────────
  { id: 'cricinfo',   name: 'ESPNcricinfo',    section: 'sport', topic: 'cricket',   trust: 96, url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml' },
  { id: 'bbc-cricket',name: 'BBC Cricket',     section: 'sport', topic: 'cricket',   trust: 97, url: 'https://feeds.bbci.co.uk/sport/cricket/rss.xml' },

  // ── SPORTS — Basketball (NBA) ─────────────────────────────────────────
  { id: 'slam',       name: 'SLAM Magazine',   section: 'sport', topic: 'basketball', trust: 84, url: 'https://www.slamonline.com/feed' },
  { id: 'espn-nba',   name: 'ESPN NBA',        section: 'sport', topic: 'basketball', trust: 95, url: 'https://www.espn.com/espn/rss/nba/news' },

  // ── SPORTS — Formula 1 ────────────────────────────────────────────────
  { id: 'f1',         name: 'Formula 1',       section: 'sport', topic: 'formula1',  trust: 99, url: 'https://www.formula1.com/content/fom-website/en/latest/all.xml' },
  { id: 'motorsport', name: 'Motorsport.com',  section: 'sport', topic: 'formula1',  trust: 88, url: 'https://www.motorsport.com/rss/f1/news/' },
  { id: 'bbc-f1',     name: 'BBC F1',          section: 'sport', topic: 'formula1',  trust: 97, url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml' },

  // ── SPORTS — Tennis ──────────────────────────────────────────────────
  { id: 'bbc-tennis', name: 'BBC Tennis',      section: 'sport', topic: 'tennis',    trust: 97, url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml' },
];

// ── Keyword maps ──────────────────────────────────────────────────────────
const TECH_KW: Record<string, string[]> = {
  AI:       ['artificial intelligence', ' ai ', 'machine learning', 'large language', 'llm', 'gpt', 'openai', 'anthropic', 'gemini', 'claude', 'deepmind', 'neural network', 'chatbot', 'generative', 'diffusion model', 'foundation model', 'hugging face', 'mistral', 'llama', 'transformer'],
  Security: ['vulnerability', 'exploit', 'breach', 'ransomware', 'malware', 'phishing', 'zero-day', 'cve', 'hack', 'cybersec', 'threat actor', 'encryption', 'patch', 'security flaw', 'data leak', 'ddos'],
  Funding:  ['raises', 'raised', 'funding', 'million', 'billion', 'series a', 'series b', 'series c', 'seed round', 'acquisition', 'acquires', 'acquired', 'ipo', 'valuation', 'investment', 'venture capital', 'unicorn'],
  Launch:   ['launch', 'launches', 'launched', 'release', 'releases', 'released', 'ships', 'now available', 'debut', 'introduces', 'unveil', 'reveal', 'new product', 'first look', 'announce', 'rolls out', 'goes live'],
  Product:  ['update', 'version', 'new feature', 'upgrade', 'api', 'sdk', 'integration', 'plugin', 'beta', 'preview', 'rollout', 'redesign', 'now supports'],
};

const SPORT_KW: Record<string, string[]> = {
  Transfer:  ['transfer', 'signing', 'signed', 'joins', 'deal', 'contract', 'move', 'loan', 'fee', 'bought', 'sold', 'swap'],
  Result:    ['wins', 'win', 'defeat', 'beat', 'lost', 'draw', 'score', 'goal', 'final score', 'match report', 'vs', 'result'],
  Injury:    ['injury', 'injured', 'ruled out', 'sidelined', 'return', 'fitness', 'surgery', 'rehabilitation', 'doubt', 'miss'],
  Trophy:    ['champion', 'title', 'trophy', 'cup', 'final', 'semi-final', 'tournament', 'grand slam', 'gold medal', 'world cup', 'olympic'],
  Analysis:  ['analysis', 'preview', 'predictions', 'form guide', 'tactics', 'stats', 'ratings', 'ranking', 'season', 'draft'],
};

const IMPACT_KW: Record<string, string[]> = {
  Regulatory:  ['regulation', 'regulator', 'antitrust', 'lawsuit', 'sues', 'sued', 'ftc', 'sec', 'eu commission', 'compliance', 'ban', 'banned', 'fine', 'settlement', 'congress', 'senate', 'executive order', 'policy'],
  Competitive: ['rival', 'competitor', 'vs.', 'beats', 'market share', 'overtakes', 'outpaces', 'head-to-head', 'challenger', 'disrupts'],
  Talent:      ['hires', 'hired', 'steps down', 'resigns', 'appoints', 'layoffs', 'laid off', 'joins as', 'ceo of', 'co-founder leaves'],
  Market:      ['stock', 'shares', 'market cap', 'valuation', 'revenue', 'earnings', 'quarterly', 'ipo', 'nasdaq', 'nyse', 'billion', 'market reacts'],
};

// ── Categorisation ────────────────────────────────────────────────────────
function categoriseTech(title: string, desc: string, topicHint: string): string {
  if (topicHint === 'security') return 'Security';
  const t = (' ' + title + ' ' + desc + ' ').toLowerCase();
  for (const [cat, kws] of Object.entries(TECH_KW)) {
    if (kws.some(k => t.includes(k))) return cat;
  }
  return 'Other';
}

function categoriseSport(title: string, desc: string, topicHint: string): string {
  // Use topic hint first — it's a precise sport category from the feed metadata
  const sportLabel: Record<string, string> = {
    football: 'Football', cricket: 'Cricket', basketball: 'Basketball',
    formula1: 'Formula 1', tennis: 'Tennis', sport: 'Sport',
  };
  if (sportLabel[topicHint]) return sportLabel[topicHint];

  const t = (' ' + title + ' ' + desc + ' ').toLowerCase();
  for (const [cat, kws] of Object.entries(SPORT_KW)) {
    if (kws.some(k => t.includes(k))) return cat;
  }
  return 'Sport';
}

function getImpactTags(title: string, desc: string): string[] {
  const t = (' ' + title + ' ' + desc + ' ').toLowerCase();
  return Object.entries(IMPACT_KW)
    .filter(([, kws]) => kws.some(k => t.includes(k)))
    .map(([tag]) => tag);
}

function getWhyItMatters(section: string, cat: string, tags: string[]): string {
  // Tech why-it-matters
  if (section === 'tech') {
    if (tags.includes('Regulatory')) return 'Regulatory shifts like this can change compliance costs or market access with little warning.';
    if (tags.includes('Competitive')) return 'Direct competitive movement — useful context if your team or board asks about it.';
    if (tags.includes('Talent')) return 'Leadership and talent moves often signal where a company is repositioning.';
    if (tags.includes('Market')) return 'Market-moving news shapes investor sentiment across the sector, not just the company involved.';
    if (cat === 'AI') return 'Another data point in how fast AI capability is moving — relevant for any roadmap conversation.';
    if (cat === 'Launch') return 'A new entrant or feature that shifts what customers will expect as table stakes.';
    if (cat === 'Funding') return 'Capital flow signals where investors think the next 18 months of attention will go.';
    if (cat === 'Security') return 'Security incidents are useful prompts to sanity-check your own posture.';
    return 'Worth a skim — relevant to the broader tech conversation your audience is following.';
  }
  // Sport why-it-matters
  if (cat === 'Transfer') return 'Transfer news can signal a club\'s ambition or financial direction — often the start of a bigger story.';
  if (cat === 'Result') return 'A result that shapes league standings, momentum, or a team\'s season trajectory.';
  if (cat === 'Injury') return 'Injury news can significantly affect a team\'s form and upcoming fixtures.';
  if (cat === 'Trophy') return 'Title-deciding moments that define careers, club histories, and sporting legacies.';
  if (cat === 'Formula 1') return 'F1 results and developments that affect championship standings and team strategy.';
  if (cat === 'Cricket') return 'Match and series news relevant to international and domestic cricket fans.';
  if (cat === 'Basketball') return 'NBA news affecting team rosters, standings, and the title race.';
  if (cat === 'Tennis') return 'Tournament results and ranking shifts from the ATP/WTA Tour.';
  return 'The latest sporting development worth following for fans and analysts alike.';
}

// ── XML parser ────────────────────────────────────────────────────────────
function stripHtml(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function parseRssXml(xml: string, feed: typeof FEEDS[0]): any[] {
  const items: any[] = [];
  const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i').exec(block);
      if (cdataMatch) return cdataMatch[1].trim();
      const plainMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      return plainMatch ? stripHtml(plainMatch[1]).trim() : '';
    };

    const getLinkAttr = (): string => {
      const attrMatch = /<link[^>]+href=["']([^"']+)["']/i.exec(block);
      if (attrMatch) return attrMatch[1];
      const textMatch = /<link[^>]*>([^<]+)<\/link>/i.exec(block);
      return textMatch ? textMatch[1].trim() : '';
    };

    const title = getTag('title');
    if (!title) continue;

    const link = getLinkAttr() || getTag('link');
    const desc = getTag('description') || getTag('summary') || getTag('content');
    const date = getTag('pubDate') || getTag('published') || getTag('updated') || new Date().toISOString();

    const cleanTitle = stripHtml(title);
    const cleanDesc = stripHtml(desc).slice(0, 300);

    const cat = feed.section === 'sport'
      ? categoriseSport(cleanTitle, cleanDesc, feed.topic)
      : categoriseTech(cleanTitle, cleanDesc, feed.topic);

    const tags = getImpactTags(cleanTitle, cleanDesc);
    const ageHours = (Date.now() - new Date(date).getTime()) / 3600000;

    // Trend scoring
    const recency = ageHours < 1 ? 10 : ageHours < 3 ? 7 : ageHours < 6 ? 4 : ageHours < 12 ? 2 : ageHours < 24 ? 1 : 0;
    const catBonus = ['AI', 'Launch', 'Transfer', 'Trophy'].includes(cat) ? 2 : 1;
    const score = recency + catBonus;

    items.push({
      title: cleanTitle,
      description: cleanDesc,
      url: link || '#',
      source: feed.name,
      sourceId: feed.id,
      section: feed.section,   // 'tech' | 'sport'
      publishedAt: date,
      cat,
      impactTags: tags,
      whyItMatters: getWhyItMatters(feed.section, cat, tags),
      trust: feed.trust,
      trendScore: score,
      isBreaking: ageHours < 1,
      isTrending: score >= 8,
    });
  }

  return items.slice(0, 15);
}

// ── Fetch single feed ─────────────────────────────────────────────────────
async function fetchFeed(feed: typeof FEEDS[0]): Promise<any[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 1800 },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRssXml(xml, feed);
    if (items.length === 0) throw new Error(`No items parsed`);
    return items;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

let _id = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query  = searchParams.get('q')?.toLowerCase() || '';
    // Optional: filter to just tech or sport — e.g. ?section=sport
    const section = searchParams.get('section') || 'all';

    const feedsToFetch = section === 'all'
      ? FEEDS
      : FEEDS.filter(f => f.section === section);

    const results = await Promise.allSettled(feedsToFetch.map(fetchFeed));

    let articles: any[] = [];
    let failedCount = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled') articles = articles.concat(r.value);
      else { failedCount++; console.warn('Feed failed:', (r as any).reason?.message); }
    });

    // Assign IDs
    articles = articles.map(a => ({ ...a, id: `art_${++_id}` }));

    // Deduplicate by title prefix
    const seen = new Set<string>();
    articles = articles.filter(a => {
      const k = a.title.toLowerCase().slice(0, 70);
      return seen.has(k) ? false : (seen.add(k), true);
    });

    // 48-hour filter
    const cutoff = Date.now() - 48 * 3600000;
    articles = articles.filter(a => new Date(a.publishedAt).getTime() >= cutoff);

    // Sort newest first
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Search filter
    if (query) {
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.source.toLowerCase().includes(query) ||
        a.cat.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      articles,
      meta: {
        total: articles.length,
        tech: articles.filter(a => a.section === 'tech').length,
        sport: articles.filter(a => a.section === 'sport').length,
        sources: feedsToFetch.length - failedCount,
        failed: failedCount,
      },
    });
  } catch (error: any) {
    console.error('News API error:', error);
    return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
  }
}