import { prisma } from "@/lib/db/prisma";
import { generateEmbedding } from "@/lib/ai/embed";
import { findSimilarCandidates } from "@/lib/db/embeddings";

export type RetrievedCandidate = {
  id: string;
  fullName: string;
  email: string | null;
  currentRole: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  languages: string[];
  certifications: string[];
  summary: string | null;
  workExperience: { company: string; title: string; startDate: string | null; endDate: string | null; isCurrent: boolean }[];
  education: { institution: string; degree: string | null; fieldOfStudy: string | null }[];
  similarity: number | null;
};

const VECTOR_TOP_K = 15;
const KEYWORD_TOP_K = 15;
const MAX_RETURNED = 20;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "who", "has", "have", "that", "this", "are",
  "candidate", "candidates", "role", "years", "year", "experience", "give",
  "list", "top", "least", "need", "looking", "any", "does", "compare",
]);

function extractKeywords(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s+.#-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    )
  ).slice(0, 8);
}

const CANDIDATE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  currentRole: true,
  yearsOfExperience: true,
  skills: true,
  languages: true,
  certifications: true,
  summary: true,
  workExperience: {
    select: { company: true, title: true, startDate: true, endDate: true, isCurrent: true },
  },
  education: {
    select: { institution: true, degree: true, fieldOfStudy: true },
  },
} as const;

/**
 * Retrieves candidates relevant to a natural-language recruiter query using
 * a hybrid of vector similarity (semantic match against the full CV text)
 * and keyword matching (exact skill/role/name hits that embeddings can
 * miss). This is the ONLY data source ever handed to the chat LLM — it only
 * ever reads from Candidate/WorkExperience/Education, never arbitrary
 * uploaded files, so retrieved context can never include non-CV documents.
 */
export async function retrieveCandidates(query: string): Promise<RetrievedCandidate[]> {
  const embedding = await generateEmbedding(query);
  const vectorMatches = await findSimilarCandidates(embedding, VECTOR_TOP_K);
  const similarityById = new Map(vectorMatches.map((m) => [m.id, m.similarity]));

  const keywords = extractKeywords(query);
  const keywordMatches = keywords.length
    ? await prisma.candidate.findMany({
        where: {
          OR: [
            { skills: { hasSome: keywords } },
            ...keywords.map((k) => ({ currentRole: { contains: k, mode: "insensitive" as const } })),
            ...keywords.map((k) => ({ fullName: { contains: k, mode: "insensitive" as const } })),
          ],
        },
        select: { id: true },
        take: KEYWORD_TOP_K,
      })
    : [];

  const ids = Array.from(
    new Set([...vectorMatches.map((m) => m.id), ...keywordMatches.map((m) => m.id)])
  ).slice(0, MAX_RETURNED);

  if (ids.length === 0) return [];

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: ids } },
    select: CANDIDATE_SELECT,
  });

  return candidates
    .map((c) => ({ ...c, similarity: similarityById.get(c.id) ?? null }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
}
