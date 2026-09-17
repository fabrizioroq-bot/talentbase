import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalentBase",
  description: "Internal HR recruitment tool — CV repository and recruiter chatbot.",
};

// TODO(auth): wrap this layout (or add middleware.ts) with Supabase Auth
// session checks once authentication is introduced, redirecting
// unauthenticated requests away from /upload, /candidates and /chat.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
