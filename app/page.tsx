import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">TalentBase</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Internal CV repository and recruiter chatbot.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/candidates"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Browse candidates
        </Link>
        <Link
          href="/upload"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Upload a CV
        </Link>
        <Link
          href="/chat"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Ask the chatbot
        </Link>
      </div>
    </div>
  );
}
