-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "currentRole" TEXT,
    "yearsOfExperience" DOUBLE PRECISION,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "rawText" TEXT NOT NULL,
    "embedding" vector(1536),
    "sourceFileUrl" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citedCandidateIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_fullName_idx" ON "Candidate"("fullName");

-- CreateIndex
CREATE INDEX "WorkExperience_candidateId_idx" ON "WorkExperience"("candidateId");

-- CreateIndex
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (manual: pgvector index types aren't expressible in schema.prisma)
-- HNSW index for cosine-distance ANN search (matches the `<=>` operator used
-- in lib/db/embeddings.ts). Not load-bearing at seed-data scale, but keeps
-- candidate-similarity queries fast as the CV pool grows.
CREATE INDEX "Candidate_embedding_idx" ON "Candidate" USING hnsw ("embedding" vector_cosine_ops);
