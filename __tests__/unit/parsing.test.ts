import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { extractCvText, CvParsingError } from "@/lib/parsing/extractText";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

describe("extractCvText", () => {
  it("extracts the expected text from a sample PDF CV", async () => {
    const buffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { text, fileType } = await extractCvText({
      buffer,
      fileName: "sample-cv.pdf",
      mimeType: "application/pdf",
    });

    expect(fileType).toBe("pdf");
    expect(text).toContain("John Sample");
    expect(text).toContain("Backend Software Engineer");
    expect(text).toContain("john.sample@example.com");
    expect(text).toContain("Python, Django, PostgreSQL, AWS");
    expect(text).toContain("Example Corp");
  });

  it("extracts the expected text from a sample DOCX CV", async () => {
    const buffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.docx"));
    const { text, fileType } = await extractCvText({
      buffer,
      fileName: "sample-cv.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(fileType).toBe("docx");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Frontend Developer");
    expect(text).toContain("jane.doe@example.com");
    expect(text).toContain("React, TypeScript, CSS, Jest");
    expect(text).toContain("Webify");
  });

  it("throws a clear CvParsingError for an unsupported file format", async () => {
    await expect(
      extractCvText({
        buffer: Buffer.from("hello"),
        fileName: "sample-cv.txt",
        mimeType: "text/plain",
      })
    ).rejects.toBeInstanceOf(CvParsingError);
  });

  it("throws a clear CvParsingError for a file with no extractable text (e.g. scanned/image-only PDF)", async () => {
    // A structurally valid but essentially empty PDF (no text-drawing content stream)
    // simulates a scanned/image-only PDF that yields no extractable text.
    const emptyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n" +
        "trailer<</Size 4/Root 1 0 R>>\n%%EOF"
    );
    await expect(
      extractCvText({ buffer: emptyPdf, fileName: "scanned.pdf", mimeType: "application/pdf" })
    ).rejects.toBeInstanceOf(CvParsingError);
  });
});

describe("structureCv", () => {
  it("produces the expected structured fields from extracted CV text (LLM call mocked)", async () => {
    const expectedExtraction = {
      fullName: "John Sample",
      email: "john.sample@example.com",
      phone: "+1 555 000 1111",
      currentRole: "Backend Engineer",
      yearsOfExperience: 6,
      summary: "Experienced software engineer with 6 years of experience in backend development.",
      skills: ["Python", "Django", "PostgreSQL", "AWS"],
      languages: ["English (native)"],
      certifications: ["AWS Certified Developer"],
      workExperience: [
        {
          company: "Example Corp",
          title: "Backend Engineer",
          startDate: "Jan 2020",
          endDate: null,
          isCurrent: true,
          description: "Built scalable APIs serving millions of requests per day.",
        },
        {
          company: "Startup Inc",
          title: "Junior Developer",
          startDate: "Jun 2017",
          endDate: "Dec 2019",
          isCurrent: false,
          description: "Worked on internal tooling and automation scripts.",
        },
      ],
      education: [
        {
          institution: "State University",
          degree: "B.Sc.",
          fieldOfStudy: "Computer Science",
          startDate: "2013",
          endDate: "2017",
        },
      ],
    };

    vi.resetModules();
    vi.doMock("ai", () => ({
      generateObject: vi.fn().mockResolvedValue({ object: expectedExtraction }),
    }));
    vi.doMock("@/lib/ai/provider", () => ({ chatModel: () => "mock-model" }));

    const { structureCv } = await import("@/lib/parsing/structureCv");
    const buffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-cv.pdf"));
    const { text } = await extractCvText({ buffer, fileName: "sample-cv.pdf", mimeType: "application/pdf" });

    const result = await structureCv(text);

    expect(result.fullName).toBe("John Sample");
    expect(result.skills).toEqual(["Python", "Django", "PostgreSQL", "AWS"]);
    expect(result.workExperience).toHaveLength(2);
    expect(result.workExperience[0].company).toBe("Example Corp");
    expect(result.education[0].institution).toBe("State University");

    vi.doUnmock("ai");
    vi.doUnmock("@/lib/ai/provider");
  });
});
