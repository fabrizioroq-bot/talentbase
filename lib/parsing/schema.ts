import { z } from "zod";

export const workExperienceSchema = z.object({
  company: z.string().describe("Employer / company name"),
  title: z.string().describe("Job title"),
  startDate: z
    .string()
    .nullable()
    .describe("Start date as written on the CV, e.g. 'Jan 2020' or '2020'"),
  endDate: z
    .string()
    .nullable()
    .describe("End date as written on the CV, or null if not stated"),
  isCurrent: z.boolean().describe("True if this is the candidate's current role"),
  description: z
    .string()
    .nullable()
    .describe("Short description of responsibilities/achievements, if present"),
});

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const cvExtractionSchema = z.object({
  fullName: z.string().describe("Candidate's full name"),
  email: z.string().nullable().describe("Contact email if present"),
  phone: z.string().nullable().describe("Contact phone number if present"),
  currentRole: z
    .string()
    .nullable()
    .describe("Candidate's current or most recent job title"),
  yearsOfExperience: z
    .number()
    .nullable()
    .describe("Total years of professional experience, estimated from work history if not stated explicitly"),
  summary: z.string().nullable().describe("Short professional summary/objective if present"),
  skills: z.array(z.string()).describe("Skills, technologies, and tools mentioned"),
  languages: z.array(z.string()).describe("Spoken/written languages, e.g. 'English (fluent)'"),
  certifications: z.array(z.string()).describe("Certifications or professional qualifications"),
  workExperience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
});

export type CvExtraction = z.infer<typeof cvExtractionSchema>;
