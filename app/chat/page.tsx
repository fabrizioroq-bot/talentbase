"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type CitedCandidate = { id: string; fullName: string; currentRole: string | null };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedCandidates?: CitedCandidate[];
  refused?: boolean;
};

const SUGGESTIONS = [
  "I need a chef — give me a top candidates I could place.",
  "Who has React and at least 3 years of experience?",
  "Do we have any candidates with hotel front-desk experience?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextLocalId = useRef(0);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setError(null);
    nextLocalId.current += 1;
    const userMessage: ChatMessage = { id: `local-${nextLocalId.current}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: "assistant",
          content: data.answer,
          citedCandidates: data.citedCandidates,
          refused: data.refused,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-65px)] max-w-3xl flex-col px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Recruiter Chat</h1>
      <p className="text-sm text-zinc-500">
        Ask about candidates in the database. Answers are grounded in stored CV data and cite candidate profiles.
      </p>

      <div className="mt-4 flex-1 overflow-y-auto rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-zinc-500">Try asking:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
                    : `max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2 text-sm ${
                        m.refused
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-black/5 dark:bg-white/10"
                      }`
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.citedCandidates && m.citedCandidates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/10 pt-2 dark:border-white/10">
                    {m.citedCandidates.map((c) => (
                      <Link
                        key={c.id}
                        href={`/candidates/${c.id}`}
                        className="rounded-full bg-white px-2.5 py-0.5 text-xs underline decoration-dotted dark:bg-black"
                      >
                        {c.fullName}
                        {c.currentRole ? ` · ${c.currentRole}` : ""}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-zinc-500">Thinking…</p>}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about candidates, skills, or roles…"
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
