export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-ink-400">
        <div className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700" aria-hidden />
          <span className="font-display font-medium text-ink-700">ResearchPilot</span>
          <span className="text-ink-300">— a paper-discovery sandbox</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href="https://arxiv.org" target="_blank" rel="noreferrer" className="transition-colors duration-150 ease-in-out-quart hover:text-ink-700">arXiv</a>
          <span aria-hidden className="text-ink-300">·</span>
          <a href="https://docs.anthropic.com" target="_blank" rel="noreferrer" className="transition-colors duration-150 ease-in-out-quart hover:text-ink-700">Anthropic</a>
          <span aria-hidden className="text-ink-300">·</span>
          <a href="/about" className="transition-colors duration-150 ease-in-out-quart hover:text-ink-700">About</a>
        </nav>
      </div>
    </footer>
  );
}
