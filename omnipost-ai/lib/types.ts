export interface Article {
  id: string;           // client-side uid
  title: string;
  description: string;
  url: string;
  source: string;
  sourceId: string;
  publishedAt: string;
  cat: string;
  impactTags: string[];
  whyItMatters: string;
  trust: number;
  trendScore: number;
  isBreaking: boolean;
  isTrending: boolean;
}
