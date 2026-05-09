import { NavTabs } from "../../components/NavTabs";
import { CollectionView } from "../../components/CollectionView";

export const metadata = { title: "Collection · ResearchPilot" };

export default function CollectionPage() {
  return (
    <>
      <NavTabs />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your collection</h1>
        <p className="mt-2 text-ink-500 text-sm">
          Papers you've bookmarked. Tied to this browser via an anonymous id — no sign-in needed.
        </p>
        <CollectionView />
      </section>
    </>
  );
}
