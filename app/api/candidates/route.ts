import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// TODO(auth): scope this list to the authenticated HR user/org once
// Supabase Auth is added.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const role = searchParams.get("role")?.trim();
  const skill = searchParams.get("skill")?.trim();
  const minYears = searchParams.get("minYears");

  const where: Prisma.CandidateWhereInput = {};
  const and: Prisma.CandidateWhereInput[] = [];

  if (name) {
    and.push({ fullName: { contains: name, mode: "insensitive" } });
  }
  if (role) {
    and.push({ currentRole: { contains: role, mode: "insensitive" } });
  }
  if (skill) {
    and.push({ skills: { has: skill } });
  }
  if (minYears && !Number.isNaN(Number(minYears))) {
    and.push({ yearsOfExperience: { gte: Number(minYears) } });
  }
  if (and.length > 0) where.AND = and;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      currentRole: true,
      yearsOfExperience: true,
      skills: true,
      languages: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ candidates });
}
