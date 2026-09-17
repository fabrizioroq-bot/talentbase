import { generateObject } from "ai";
import { chatModel } from "@/lib/ai/provider";
import { cvExtractionSchema, type CvExtraction } from "./schema";
import { CvParsingError } from "./extractText";

const SYSTEM_PROMPT = `You extract structured candidate data from raw CV/resume text for an HR
recruitment tool. Only use information present in the text — never invent
names, dates, employers, or skills. If a field is not present, use null (or
an empty array for list fields). Estimate yearsOfExperience from the work
history date ranges when not explicitly stated.`;

const MAX_INPUT_CHARS = 20000;

export async function structureCv(rawText: string): Promise<CvExtraction> {
  const input = rawText.slice(0, MAX_INPUT_CHARS);

  try {
    const { object } = await generateObject({
      model: chatModel(),
      schema: cvExtractionSchema,
      system: SYSTEM_PROMPT,
      prompt: `Extract structured data from this CV text:\n\n"""\n${input}\n"""`,
    });
    return object;
  } catch (err) {
    throw new CvParsingError(
      `Could not extract structured data from this CV. (${(err as Error).message})`
    );
  }
}
