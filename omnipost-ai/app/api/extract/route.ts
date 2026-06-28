import { NextResponse } from 'next/server';

// ── HTML → clean readable text ────────────────────────────────────────────
function extractReadableText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '');

  // Try to isolate main article content
  const articleMatch =
    /<article[^>]*>([\s\S]*?)<\/article>/i.exec(text) ||
    /<main[^>]*>([\s\S]*?)<\/main>/i.exec(text) ||
    /class="[^"]*(?:article-body|post-content|entry-content|article__body|story-body)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i.exec(text);

  if (articleMatch) text = articleMatch[1];

  // Block elements → newlines
  text = text
    .replace(/<\/?(h[1-6])[^>]*>/gi, '\n\n')
    .replace(/<\/?(p|div|section|blockquote|li)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#\d+;/g, ' ');

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Cap at ~4000 chars — enough for Claude, avoids token waste
  return text.slice(0, 4000);
}

// ── Claude draft generation ───────────────────────────────────────────────
export interface ExtractedDrafts {
  summary: string;
  linkedin: string;
  x: string;
  blog: string;
  medium: string;
}

async function generateDrafts(
  articleText: string,
  title: string,
  source: string,
  url: string,
): Promise<ExtractedDrafts> {

  const system = `You are an expert content strategist and ghostwriter for C-level executives. You read full articles and transform them into platform-ready posts.

WRITING RULES (apply everywhere):
- Never use: "game-changer", "in today's fast-paced world", "paradigm shift", "unlock the power", "dive deep", "revolutionize", "disrupt", "leverage" as a verb
- Never use engagement bait: "agree or disagree?", "like if you agree", "tag someone who needs this"
- Write analytically in first-person. Vary sentence lengths.
- Base ALL posts on actual article content — no generic filler

PLATFORM RULES:
LinkedIn: 1,200–1,500 characters · NO raw URL in body (tell user to put link in first comment) · 3-5 hashtags · end with a genuine open question
X: max 250 characters · NO URL in body (note to post as reply) · max 2 hashtags · punchy
Blog: 400+ words · markdown headers (##) · "What happened / Why it matters / My take" structure · include source URL
Medium: 500+ words · markdown · deep original analysis · not just a summary · include source URL

Respond with ONLY valid JSON — no markdown code fences, no preamble:
{
  "summary": "3-4 sentence executive summary",
  "linkedin": "full post text",
  "x": "tweet text under 250 chars",
  "blog": "full markdown blog post",
  "medium": "full markdown medium article"
}`;

  const user = `Article title: ${title}
Source: ${source}
URL: ${url}

Full article text:
${articleText}

Write the JSON output now. Be specific to this article's actual content and findings.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Claude API error ${res.status}`);
  }

  const data = await res.json();
  const raw: string = data?.content?.[0]?.text || '';

  // Strip markdown fences if Claude added them
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as ExtractedDrafts;
  } catch {
    throw new Error('AI returned malformed JSON — please try again');
  }
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { url, title, source } = (await req.json()) as {
      url: string; title: string; source: string;
    };

    if (!url || url === '#') {
      return NextResponse.json({ error: 'No valid article URL provided' }, { status: 400 });
    }

    // Step 1 — Fetch article HTML server-side
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 15000);

    let html = '';
    try {
      const articleRes = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmniPost content reader/1.0)',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });
      clearTimeout(fetchTimeout);
      if (!articleRes.ok) throw new Error(`HTTP ${articleRes.status}`);
      html = await articleRes.text();
    } catch (fetchErr: any) {
      clearTimeout(fetchTimeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Article fetch timed out — the site may be slow or blocking automated requests');
      }
      throw new Error(`Could not fetch article: ${fetchErr.message}`);
    }

    // Step 2 — Extract clean readable text
    const articleText = extractReadableText(html);
    if (articleText.length < 80) {
      throw new Error(
        'Not enough text extracted — this article may be paywalled, JavaScript-rendered, or blocking content extraction'
      );
    }

    // Step 3 — Generate drafts with Claude
    const drafts = await generateDrafts(articleText, title, source, url);

    return NextResponse.json({
      success: true,
      drafts,
      meta: { charCount: articleText.length, source, title },
    });

  } catch (err: any) {
    console.error('[Extract API]', err.message);
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 });
  }
}