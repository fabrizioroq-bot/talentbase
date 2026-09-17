import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { RetrievedCandidate } from "@/lib/rag/retrieve";

// These tests exercise the answer-generation safety contract in isolation
// (no live database / vector search, no real LLM call) — they verify that:
//   1. When retrieval finds nothing for a role/skill that doesn't exist in
//      the candidate pool, the answer honestly reports no match instead of
//      the LLM being free to invent one.
//   2. Even if the LLM response cites a candidate id that wasn't actually
//      retrieved, generateAnswer strips it before it reaches the UI —
//      the "never invent candidates" requirement is enforced in code, not
//      only via prompting.
const sampleCandidate: RetrievedCandidate = {
  id: "cand_1",
  fullName: "Aisha Khan",
  email: "aisha.khan@example.com",
  currentRole: "Frontend Developer",
  yearsOfExperience: 5,
  skills: ["React", "TypeScript"],
  languages: ["English"],
  certifications: [],
  summary: null,
  workExperience: [],
  education: [],
  similarity: 0.8,
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("ai");
  vi.doUnmock("@/lib/ai/provider");
});

describe("generateAnswer", () => {
  it("returns an honest no-match answer when no candidates were retrieved for the query", async () => {
    vi.doMock("ai", () => ({
      generateObject: vi.fn().mockResolvedValue({
        object: {
          answer: "No candidates in the database currently match a 'chef' role.",
          noMatch: true,
          citedCandidateIds: [],
        },
      }),
    }));
    vi.doMock("@/lib/ai/provider", () => ({ chatModel: () => "mock-model" }));

    const { generateAnswer } = await import("@/lib/rag/answer");
    const result = await generateAnswer({
      question: "I need a chef, who do we have?",
      candidates: [], // simulates retrieval finding nothing for "chef"
      history: [],
    });

    expect(result.noMatch).toBe(true);
    expect(result.citedCandidateIds).toEqual([]);
    expect(result.answer.toLowerCase()).not.toContain("chef ");
  });

  it("strips any hallucinated candidate id that wasn't actually retrieved", async () => {
    vi.doMock("ai", () => ({
      generateObject: vi.fn().mockResolvedValue({
        object: {
          answer: "Aisha Khan and Someone Invented both match.",
          noMatch: false,
          citedCandidateIds: ["cand_1", "cand_does_not_exist"],
        },
      }),
    }));
    vi.doMock("@/lib/ai/provider", () => ({ chatModel: () => "mock-model" }));

    const { generateAnswer } = await import("@/lib/rag/answer");
    const result = await generateAnswer({
      question: "Who has React experience?",
      candidates: [sampleCandidate],
      history: [],
    });

    expect(result.citedCandidateIds).toEqual(["cand_1"]);
    expect(result.citedCandidateIds).not.toContain("cand_does_not_exist");
  });
});
