"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, X } from "lucide-react";

export function DatePicker({ basePath = "/" }: { basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const cur = params.get("date") ?? "";
  const cat = params.get("cat") ?? "";

  const onChange = (date: string) => {
    const sp = new URLSearchParams();
    if (cat) sp.set("cat", cat);
    if (date) sp.set("date", date);
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-1 text-xs">
      <Calendar className="h-3.5 w-3.5 text-ink-400" />
      <input
        type="date"
        value={cur}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs outline-none"
      />
      {cur && (
        <button type="button" onClick={() => onChange("")} className="text-ink-400 hover:text-ink-700" aria-label="Clear">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
