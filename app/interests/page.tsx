import { NavTabs } from "../../components/NavTabs";
import { InterestEditor } from "../../components/InterestEditor";

export const metadata = { title: "Interests · ResearchPilot" };

export default function InterestsPage() {
  return (
    <>
      <NavTabs />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your research interests</h1>
        <p className="mt-2 text-ink-500 text-sm">
          Describe what you want to follow in plain language. We use it to filter the daily feed
          and surface the most relevant new arXiv preprints.
        </p>
        <div className="mt-6">
          <InterestEditor />
        </div>
      </section>
    </>
  );
}
