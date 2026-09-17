import { embed } from "ai";
import { embeddingModel } from "./provider";

/** Truncate to a safe character budget before embedding (model context limit). */
const MAX_EMBED_CHARS = 24000;

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.slice(0, MAX_EMBED_CHARS);
  const { embedding } = await embed({
    model: embeddingModel(),
    value: input,
  });
  return embedding;
}
