import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSignedFileUrl } from "@/lib/supabase/storage";

export const runtime = "nodejs";

// TODO(auth): scope this to the authenticated HR user/org once Supabase
// Auth is added.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      workExperience: { orderBy: { sortOrder: "asc" } },
      education: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  let signedFileUrl: string | null = null;
  try {
    signedFileUrl = await getSignedFileUrl(candidate.sourceFileUrl);
  } catch (err) {
    console.error("Failed to sign CV file URL:", err);
  }

  return NextResponse.json({ candidate, signedFileUrl });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.candidate.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
