import { NextRequest, NextResponse } from "next/server";
import { extractCvText, CvParsingError } from "@/lib/parsing/extractText";
import { structureCv } from "@/lib/parsing/structureCv";
import { uploadCvFile } from "@/lib/supabase/storage";
import { findPotentialDuplicate } from "@/lib/db/duplicates";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

// TODO(auth): once Supabase Auth is added, require a session here and scope
// uploads/candidates to the authenticated HR user/org.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum size is 15MB." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const { text, fileType } = await extractCvText({
      buffer,
      fileName: file.name,
      mimeType: file.type,
    });

    const extraction = await structureCv(text);

    const { path } = await uploadCvFile({
      buffer,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    });

    const duplicate = await findPotentialDuplicate({
      email: extraction.email,
      fullName: extraction.fullName,
    });

    return NextResponse.json({
      fileName: file.name,
      fileType,
      sourceFileUrl: path,
      rawText: text,
      extraction,
      duplicate: duplicate
        ? {
            id: duplicate.id,
            fullName: duplicate.fullName,
            email: duplicate.email,
            currentRole: duplicate.currentRole,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof CvParsingError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("CV extraction failed:", err);
    return NextResponse.json(
      { error: "Unexpected error while processing this CV. Please try again." },
      { status: 500 }
    );
  }
}
