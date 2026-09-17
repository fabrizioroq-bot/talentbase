import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isRecruitmentQuery, SCOPE_REFUSAL_MESSAGE } from "@/lib/guard/scopeGuard";
import { retrieveCandidates } from "@/lib/rag/retrieve";
import { generateAnswer } from "@/lib/rag/answer";

export const runtime = "nodejs";
export const maxDuration = 30;

const chatRequestSchema = z.object({
  conversationId: z.string().nullable(),
  message: z.string().min(1).max(2000),
});

// TODO(auth): once Supabase Auth is added, scope conversations to the
// authenticated HR user instead of being anonymous/session-only.
export async function POST(req: NextRequest) {
  const parsed = chatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { message } = parsed.data;
  let conversationId = parsed.data.conversationId;

  try {
    if (!conversationId) {
      const conversation = await prisma.chatConversation.create({ data: {} });
      conversationId = conversation.id;
    }

    await prisma.chatMessage.create({
      data: { conversationId, role: "user", content: message },
    });

    // Layer 1 + 2 of the scope guard: heuristic + (if needed) LLM
    // classification, with NO candidate data attached to this check.
    const inScope = await isRecruitmentQuery(message);

    if (!inScope) {
      const saved = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content: SCOPE_REFUSAL_MESSAGE,
          refused: true,
        },
      });
      return NextResponse.json({
        conversationId,
        messageId: saved.id,
        answer: SCOPE_REFUSAL_MESSAGE,
        refused: true,
        citedCandidates: [],
      });
    }

    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const candidates = await retrieveCandidates(message);

    const result = await generateAnswer({
      question: message,
      candidates,
      history: history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const citedCandidates = candidates
      .filter((c) => result.citedCandidateIds.includes(c.id))
      .map((c) => ({ id: c.id, fullName: c.fullName, currentRole: c.currentRole }));

    const saved = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: result.answer,
        citedCandidateIds: result.citedCandidateIds,
      },
    });

    return NextResponse.json({
      conversationId,
      messageId: saved.id,
      answer: result.answer,
      refused: false,
      noMatch: result.noMatch,
      citedCandidates,
    });
  } catch (err) {
    console.error("Chat request failed:", err);
    return NextResponse.json(
      { error: "Something went wrong while answering. Please try again.", conversationId },
      { status: 500 }
    );
  }
}
