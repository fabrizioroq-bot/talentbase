import { prisma } from "./prisma";

/**
 * Looks for an existing candidate that is plausibly the same person as a
 * freshly-parsed CV: exact email match, or an exact case-insensitive full
 * name match when no email is available on either side.
 */
export async function findPotentialDuplicate(params: {
  email: string | null;
  fullName: string;
}) {
  if (params.email) {
    const byEmail = await prisma.candidate.findFirst({
      where: { email: { equals: params.email, mode: "insensitive" } },
    });
    if (byEmail) return byEmail;
  }

  const byName = await prisma.candidate.findFirst({
    where: { fullName: { equals: params.fullName, mode: "insensitive" } },
  });
  return byName;
}
