import { notFound } from "next/navigation";
import { PaperChatLayout } from "../../../../components/PaperChatLayout";
import { apiArticle } from "../../../../lib/api";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const a = await apiArticle(params.id).catch(() => null);
  return { title: a ? `Chat · ${a.title} · ResearchPilot` : "Chat · ResearchPilot" };
}

export default async function PaperChatPage({ params }: { params: { id: string } }) {
  const article = await apiArticle(params.id);
  if (!article) notFound();
  return <PaperChatLayout article={article} />;
}
