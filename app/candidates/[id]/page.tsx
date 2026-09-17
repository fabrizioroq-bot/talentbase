import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSignedFileUrl } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      workExperience: { orderBy: { sortOrder: "asc" } },
      education: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!candidate) notFound();

  let signedFileUrl: string | null = null;
  try {
    signedFileUrl = await getSignedFileUrl(candidate.sourceFileUrl);
  } catch {
    // Storage may be unreachable in local/dev setups without a bucket yet.
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/candidates" className="text-sm text-zinc-500 hover:underline">
        ← Back to candidates
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{candidate.fullName}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{candidate.currentRole || "Role not specified"}</p>
        </div>
        {signedFileUrl && (
          <a
            href={signedFileUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
          >
            View original file
          </a>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <Info label="Email" value={candidate.email} />
        <Info label="Phone" value={candidate.phone} />
        <Info label="Years of experience" value={candidate.yearsOfExperience != null ? String(candidate.yearsOfExperience) : null} />
        <Info label="Languages" value={candidate.languages.join(", ") || null} />
      </div>

      {candidate.summary && (
        <Section title="Summary">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{candidate.summary}</p>
        </Section>
      )}

      {candidate.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <span key={s} className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {candidate.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
            {candidate.certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Section>
      )}

      {candidate.workExperience.length > 0 && (
        <Section title="Work experience">
          <div className="flex flex-col gap-4">
            {candidate.workExperience.map((w) => (
              <div key={w.id}>
                <p className="font-medium">
                  {w.title} · {w.company}
                </p>
                <p className="text-xs text-zinc-500">
                  {w.startDate || "?"} – {w.isCurrent ? "Present" : w.endDate || "?"}
                </p>
                {w.description && <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{w.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {candidate.education.length > 0 && (
        <Section title="Education">
          <div className="flex flex-col gap-3">
            {candidate.education.map((e) => (
              <div key={e.id}>
                <p className="font-medium">
                  {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ") || "Degree"} · {e.institution}
                </p>
                <p className="text-xs text-zinc-500">
                  {e.startDate || "?"} – {e.endDate || "?"}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p>{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </div>
  );
}
