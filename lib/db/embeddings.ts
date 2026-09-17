import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Prisma Client has no native pgvector type, so embedding reads/writes go
// through raw SQL. `vector` accepts the textual "[0.1,0.2,...]" format.
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function setCandidateEmbedding(candidateId: string, embedding: number[]) {
  const literal = toVectorLiteral(embedding);
  await prisma.$executeRaw`
    UPDATE "Candidate"
    SET "embedding" = ${literal}::vector
    WHERE "id" = ${candidateId}
  `;
}

export type SimilarCandidateRow = {
  id: string;
  similarity: number;
};

/**
 * Cosine-similarity nearest-neighbor search over candidate embeddings.
 * Returns candidate ids ordered by relevance, most similar first.
 */
export async function findSimilarCandidates(
  queryEmbedding: number[],
  limit: number
): Promise<SimilarCandidateRow[]> {
  const literal = toVectorLiteral(queryEmbedding);
  const rows = await prisma.$queryRaw<SimilarCandidateRow[]>`
    SELECT "id",
           1 - ("embedding" <=> ${literal}::vector) AS similarity
    FROM "Candidate"
    WHERE "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${literal}::vector
    LIMIT ${Prisma.raw(String(limit))}
  `;
  return rows;
}
