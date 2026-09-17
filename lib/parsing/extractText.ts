import mammoth from "mammoth";

export type SourceFileType = "pdf" | "docx";

export class CvParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvParsingError";
  }
}

export function detectFileType(fileName: string, mimeType: string): SourceFileType {
  const lowerName = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return "docx";
  }
  throw new CvParsingError(
    "Unsupported file format. Please upload a PDF or Word (.docx) file."
  );
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } catch (err) {
    throw new CvParsingError(
      `Could not read this PDF — it may be corrupted or encrypted. (${(err as Error).message})`
    );
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  } catch (err) {
    throw new CvParsingError(
      `Could not read this Word document — it may be corrupted. (${(err as Error).message})`
    );
  }
}

const MIN_MEANINGFUL_CHARS = 40;

/**
 * Extracts raw text from a CV file. Throws CvParsingError with a
 * user-facing message on corrupted files, unsupported formats, or
 * scanned/image-only PDFs that yield no extractable text.
 */
export async function extractCvText(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ text: string; fileType: SourceFileType }> {
  const fileType = detectFileType(params.fileName, params.mimeType);

  const text =
    fileType === "pdf"
      ? await extractPdfText(params.buffer)
      : await extractDocxText(params.buffer);

  const trimmed = text.trim();
  if (trimmed.length < MIN_MEANINGFUL_CHARS) {
    throw new CvParsingError(
      "No readable text found in this file. It looks like a scanned/image-only document — " +
        "please upload a text-based PDF or Word file (OCR is not supported in this MVP)."
    );
  }

  return { text: trimmed, fileType };
}
