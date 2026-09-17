"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CandidateRow = {
  id: string;
  fullName: string;
  email: string | null;
  currentRole: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  languages: string[];
  createdAt: string;
};

export default function CandidatesPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [skill, setSkill] = useState("");
  const [minYears, setMinYears] = useState("");
  const [candidates, setCandidates] = useState<CandidateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (role) params.set("role", role);
      if (skill) params.set("skill", skill);
      if (minYears) params.set("minYears", minYears);

      try {
        const res = await fetch(`/api/candidates?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load candidates.");
        setCandidates(data.candidates);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [name, role, skill, minYears]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <Link href="/upload" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
          Upload CV
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          placeholder="Filter by name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={filterInput}
        />
        <input
          placeholder="Filter by role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={filterInput}
        />
        <input
          placeholder="Filter by skill"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className={filterInput}
        />
        <input
          placeholder="Min. years of experience"
          type="number"
          value={minYears}
          onChange={(e) => setMinYears(e.target.value)}
          className={filterInput}
        />
      </div>

      <div className="mt-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && candidates === null && <p className="text-sm text-zinc-500">Loading candidates…</p>}

        {!error && candidates && candidates.length === 0 && (
          <p className="rounded-md border border-dashed border-black/15 p-8 text-center text-sm text-zinc-500 dark:border-white/15">
            No candidates match these filters yet. {name || role || skill || minYears ? "Try clearing a filter, or " : ""}
            <Link href="/upload" className="underline">
              upload a CV
            </Link>{" "}
            to get started.
          </p>
        )}

        {!error && candidates && candidates.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs uppercase text-zinc-500 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Current role</th>
                  <th className="px-4 py-2 font-medium">Years</th>
                  <th className="px-4 py-2 font-medium">Skills</th>
                  <th className="px-4 py-2 font-medium">Languages</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-2">
                      <Link href={`/candidates/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{c.currentRole || "—"}</td>
                    <td className="px-4 py-2">{c.yearsOfExperience ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 5).map((s) => (
                          <span key={s} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                            {s}
                          </span>
                        ))}
                        {c.skills.length > 5 && <span className="text-xs text-zinc-500">+{c.skills.length - 5}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">{c.languages.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const filterInput =
  "rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40";
