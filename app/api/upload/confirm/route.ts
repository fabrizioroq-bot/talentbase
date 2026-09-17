import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { setCandidateEmbedding } from "@/lib/db/embeddings";
import { generateEmbedding } from "@/lib/ai/embed";
import { cvExtractionSchema } from "@/lib/parsing/schema";
import { deleteCvFile } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

const confirmSchema = z.object({
  extraction: cvExtractionSchema,
  rawText: z.string().min(1),
  sourceFileUrl: z.string().min(1),
  sourceFileType: z.enum(["pdf", "docx"]),
  sourceFileName: z.string().min(1),
  // How to resolve a detected duplicate: replace the existing candidate,
  // keep both as separate records, or null when no duplicate was detected.
  duplicateResolution: z.enum(["replace", "keepBoth"]).nullable(),
  duplicateCandidateId: z.string().nullable(),
});

function candidateWriteData(extraction: z.infer<typeof cvExtractionSchema>, file: {
  sourceFileUrl: string;
  sourceFileType: string;
  sourceFileName: string;
}, rawText: string) {
  return {
    fullName: extraction.fullName,
    email: extraction.email,
    phone: extraction.phone,
    currentRole: extraction.currentRole,
    yearsOfExperience: extraction.yearsOfExperience,
    skills: extraction.skills,
    languages: extraction.languages,
    certifications: extraction.certifications,
    summary: extraction.summary,
    rawText,
    sourceFileUrl: file.sourceFileUrl,
    sourceFileType: file.sourceFileType,
    sourceFileName: file.sourceFileName,
  };
}

// TODO(auth): scope this write to the authenticated HR user/org once
// Supabase Auth is added.
export async function POST(req: NextRequest) {
  const parsed = confirmSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { extraction, rawText, duplicateResolution, duplicateCandidateId } = parsed.data;
  const fileMeta = {
    sourceFileUrl: parsed.data.sourceFileUrl,
    sourceFileType: parsed.data.sourceFileType,
    sourceFileName: parsed.data.sourceFileName,
  };

  try {
    const isReplace = duplicateResolution === "replace" && duplicateCandidateId;

    let candidateId: string;
    let previousFileUrl: string | null = null;

    if (isReplace) {
      const existing = await prisma.candidate.findUnique({
        where: { id: duplicateCandidateId! },
      });
      if (!existing) {
        return NextResponse.json({ error: "Candidate to replace was not found." }, { status: 404 });
      }
      previousFileUrl = existing.sourceFileUrl;

      await prisma.$transaction([
        prisma.workExperience.deleteMany({ where: { candidateId: existing.id } }),
        prisma.education.deleteMany({ where: { candidateId: existing.id } }),
        prisma.candidate.update({
          where: { id: existing.id },
          data: candidateWriteData(extraction, fileMeta, rawText),
        }),
      ]);
      candidateId = existing.id;
    } else {
      const created = await prisma.candidate.create({
        data: candidateWriteData(extraction, fileMeta, rawText),
      });
      candidateId = created.id;
    }

    if (extraction.workExperience.length > 0) {
      await prisma.workExperience.createMany({
        data: extraction.workExperience.map((w, i) => ({
          candidateId,
          company: w.company,
          title: w.title,
          startDate: w.startDate,
          endDate: w.endDate,
          isCurrent: w.isCurrent,
          description: w.description,
          sortOrder: i,
        })),
      });
    }

    if (extraction.education.length > 0) {
      await prisma.education.createMany({
        data: extraction.education.map((e, i) => ({
          candidateId,
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          startDate: e.startDate,
          endDate: e.endDate,
          sortOrder: i,
        })),
      });
    }

    // Embed the full CV text (not just structured fields) so semantic search
    // benefits from phrasing/context the structured extraction may have dropped.
    const embedding = await generateEmbedding(rawText);
    await setCandidateEmbedding(candidateId, embedding);

    if (previousFileUrl && previousFileUrl !== fileMeta.sourceFileUrl) {
      await deleteCvFile(previousFileUrl).catch(() => {
        // Non-fatal: an orphaned file in storage doesn't break the app.
      });
    }

    return NextResponse.json({ candidateId }, { status: 201 });
  } catch (err) {
    console.error("Failed to save candidate:", err);
    return NextResponse.json(
      { error: "Unexpected error while saving this candidate. Please try again." },
      { status: 500 }
    );
  }
}
