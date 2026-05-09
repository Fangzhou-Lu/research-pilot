import { NavTabs } from "../../../components/NavTabs";
import { RecommendationsView } from "../../../components/RecommendationsView";

export const metadata = { title: "Recommendations · ResearchPilot" };

export default function InterestDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <NavTabs />
      <section className="mx-auto max-w-4xl px-6 py-8">
        <RecommendationsView interestId={params.id} />
      </section>
    </>
  );
}
