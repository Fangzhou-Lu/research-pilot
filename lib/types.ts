export type Article = {
  id: string;
  arxiv_id: string;
  title: string;
  title_translated?: string;
  abstract: string;
  abstract_translated?: string;
  authors: string[];
  organizations: string[];
  categories: string[];
  primary_category: string;
  published: string;
  updated: string;
  pdf_url: string;
  abs_url: string;
};

export type Paginated<T> = {
  total: number;
  page: number;
  size: number;
  items: T[];
};

export type Interest = {
  id: string;
  text: string;
  created_at: number;
  paused: boolean;
  last_match_at: number | null;
  match_count_7d: number;
};

export type Bookmark = {
  article_id: string;
  bookmarked_at: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AISummarySection = {
  heading: string;
  body_md: string;
};

export type AISummary = {
  article_id: string;
  language: "en" | "zh";
  sections: AISummarySection[];
  generated_at: number;
};

// 22 conference-year venues (mirrors chatpaper.com /venues sidebar).
// v0: rendered as "Coming soon" placeholders. v1 will wire OpenReview
// import for ICLR/ICML/NeurIPS first, then incrementally add the rest.
export const VENUES = [
  { id: "iclr-2026", label: "ICLR", year: 2026, isNew: true },
  { id: "iclr-2025", label: "ICLR", year: 2025 },
  { id: "iclr-2024", label: "ICLR", year: 2024 },
  { id: "icml-2025", label: "ICML", year: 2025 },
  { id: "icml-2024", label: "ICML", year: 2024 },
  { id: "neurips-2024", label: "NeurIPS", year: 2024 },
  { id: "neurips-2023", label: "NeurIPS", year: 2023 },
  { id: "aaai-2026", label: "AAAI", year: 2026, isNew: true },
  { id: "aaai-2025", label: "AAAI", year: 2025 },
  { id: "ijcai-2024", label: "IJCAI", year: 2024 },
  { id: "acl-2025", label: "ACL", year: 2025 },
  { id: "acl-2024", label: "ACL", year: 2024 },
  { id: "emnlp-2024", label: "EMNLP", year: 2024 },
  { id: "emnlp-2023", label: "EMNLP", year: 2023 },
  { id: "cvpr-2025", label: "CVPR", year: 2025 },
  { id: "cvpr-2024", label: "CVPR", year: 2024 },
  { id: "acmmm-2024", label: "ACM MM", year: 2024 },
  { id: "eccv-2024", label: "ECCV", year: 2024 },
  { id: "www-2025", label: "WWW", year: 2025 },
  { id: "sigir-2025", label: "SIGIR", year: 2025 },
  { id: "sigir-2024", label: "SIGIR", year: 2024 },
  { id: "kdd-2025", label: "KDD", year: 2025 },
  { id: "kdd-2024", label: "KDD", year: 2024 },
] as const;

export type VenueId = (typeof VENUES)[number]["id"];
export type Venue = (typeof VENUES)[number];

// Runtime venue shape returned by GET /api/v1/venues
export type VenueApi = {
  id: string;
  display: string;
  year: number;
  track: string[];
  paper_count: number;
  is_new: boolean;
};

// Category counts returned by GET /api/v1/categories/counts
export type DayCount = {
  date: string;
  count: number;
};

export type CategoryCount = {
  cat: string;
  label: string;
  counts: DayCount[];
};

// Structured Q&A returned by /api/v1/deep-qa — chatpaper-style
// Core Points / Methods / Experiments tab content.
export type DeepQaItem = {
  question: string;
  answer_md: string;
};

export type DeepQa = {
  core_points: DeepQaItem;
  methods: DeepQaItem;
  experiments: DeepQaItem;
};
