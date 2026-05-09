import { SearchBar } from "./SearchBar";

export function Hero() {
  return (
    <section className="hidden md:block bg-gradient-to-b from-white to-ink-50 border-b border-ink-200">
      <div className="mx-auto max-w-5xl px-6 py-14 text-center animate-fade-in">
        <h1 className="font-display text-display-2 sm:text-display-1 text-ink-900 tracking-tight">
          A research feed that reads with you.
        </h1>
        <p className="mt-4 text-ink-500 text-base max-w-2xl mx-auto leading-relaxed">
          Track interests in plain language, get a daily feed of fresh arXiv preprints with
          AI-generated summaries, and chat with any paper to dig deeper.
        </p>
        <div className="mt-8 max-w-2xl mx-auto">
          <SearchBar variant="hero" />
        </div>
      </div>
    </section>
  );
}
