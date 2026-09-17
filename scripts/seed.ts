/**
 * Seeds the database with sample HR/hospitality candidates so the
 * candidates list and recruiter chatbot can be exercised immediately after
 * setup. Requires OPENAI_API_KEY (used to generate embeddings) and
 * DATABASE_URL to be set. Run with: npm run seed
 */
import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { setCandidateEmbedding } from "../lib/db/embeddings";
import { generateEmbedding } from "../lib/ai/embed";

type SeedCandidate = {
  fullName: string;
  email: string;
  phone: string;
  currentRole: string;
  yearsOfExperience: number;
  summary: string;
  skills: string[];
  languages: string[];
  certifications: string[];
  workExperience: {
    company: string;
    title: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string;
  }[];
  education: { institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string }[];
};

const CANDIDATES: SeedCandidate[] = [
  {
    fullName: "Marco Rossi",
    email: "marco.rossi@example.com",
    phone: "+39 345 123 4567",
    currentRole: "Executive Chef",
    yearsOfExperience: 12,
    summary:
      "Executive chef with 12 years of experience leading kitchens in Michelin-recognized restaurants, specializing in modern Italian and French cuisine, menu development, and cost control.",
    skills: ["Menu development", "French cuisine", "Italian cuisine", "HACCP", "Staff management", "Cost control", "Butchery"],
    languages: ["Italian (native)", "English (fluent)", "French (conversational)"],
    certifications: ["HACCP Level 3", "ServSafe Manager"],
    workExperience: [
      {
        company: "La Terrazza Ristorante",
        title: "Executive Chef",
        startDate: "Mar 2019",
        endDate: null,
        isCurrent: true,
        description: "Leading a 15-person kitchen brigade, redesigned the seasonal tasting menu, reduced food cost by 8%.",
      },
      {
        company: "Ristorante Bella Vista",
        title: "Sous Chef",
        startDate: "Jun 2014",
        endDate: "Feb 2019",
        isCurrent: false,
        description: "Managed daily kitchen operations and mentored junior chefs.",
      },
    ],
    education: [
      { institution: "Istituto Alberghiero di Roma", degree: "Diploma", fieldOfStudy: "Culinary Arts", startDate: "2008", endDate: "2011" },
    ],
  },
  {
    fullName: "Aisha Khan",
    email: "aisha.khan@example.com",
    phone: "+1 415 555 0192",
    currentRole: "Frontend Developer",
    yearsOfExperience: 5,
    summary:
      "Frontend developer with 5 years of experience building React/TypeScript applications, focused on performance and accessible UI.",
    skills: ["React", "TypeScript", "Next.js", "GraphQL", "Tailwind CSS", "Jest", "Accessibility"],
    languages: ["English (native)", "Urdu (fluent)"],
    certifications: [],
    workExperience: [
      {
        company: "Northwind Software",
        title: "Frontend Developer",
        startDate: "Jul 2021",
        endDate: null,
        isCurrent: true,
        description: "Built and maintained a React/Next.js design system used across 6 product teams.",
      },
      {
        company: "PixelForge Agency",
        title: "Junior Web Developer",
        startDate: "Aug 2019",
        endDate: "Jun 2021",
        isCurrent: false,
        description: "Developed client marketing sites in React and vanilla JS.",
      },
    ],
    education: [
      { institution: "University of Toronto", degree: "B.Sc.", fieldOfStudy: "Computer Science", startDate: "2015", endDate: "2019" },
    ],
  },
  {
    fullName: "Daniel Osei",
    email: "daniel.osei@example.com",
    phone: "+44 7700 900123",
    currentRole: "Front Desk Agent",
    yearsOfExperience: 4,
    summary:
      "Hotel front desk agent and night auditor with 4 years of experience in 4-star properties, skilled in guest relations, upselling, and PMS systems.",
    skills: ["Opera PMS", "Guest relations", "Check-in/check-out", "Upselling", "Night audit", "Conflict resolution"],
    languages: ["English (native)", "French (conversational)"],
    certifications: ["Opera PMS Certified User"],
    workExperience: [
      {
        company: "The Camberwell Hotel",
        title: "Front Desk Agent / Night Auditor",
        startDate: "Jan 2022",
        endDate: null,
        isCurrent: true,
        description: "Handle guest check-in/out, resolve escalations, and perform nightly financial audits for a 180-room hotel.",
      },
      {
        company: "Riverside Inn",
        title: "Front Desk Associate",
        startDate: "Feb 2020",
        endDate: "Dec 2021",
        isCurrent: false,
        description: "Managed reservations and guest inquiries, consistently top-rated on guest satisfaction surveys.",
      },
    ],
    education: [
      { institution: "Westminster Kingsway College", degree: "Diploma", fieldOfStudy: "Hospitality Management", startDate: "2018", endDate: "2020" },
    ],
  },
  {
    fullName: "Elena Petrova",
    email: "elena.petrova@example.com",
    phone: "+34 611 223 344",
    currentRole: "Sommelier",
    yearsOfExperience: 7,
    summary: "Certified sommelier with 7 years of experience curating wine lists and training front-of-house staff at fine dining restaurants.",
    skills: ["Wine pairing", "Wine list curation", "Staff training", "Inventory management", "WSET Level 3"],
    languages: ["Russian (native)", "Spanish (fluent)", "English (fluent)"],
    certifications: ["WSET Level 3 Award in Wines", "Court of Master Sommeliers - Certified"],
    workExperience: [
      {
        company: "Casa Lumen",
        title: "Head Sommelier",
        startDate: "May 2020",
        endDate: null,
        isCurrent: true,
        description: "Curated a 300-label wine list and trained a 12-person front-of-house team on pairing recommendations.",
      },
    ],
    education: [
      { institution: "WSET", degree: "Level 3 Award", fieldOfStudy: "Wines", startDate: "2018", endDate: "2018" },
    ],
  },
  {
    fullName: "Maria Santos",
    email: "maria.santos@example.com",
    phone: "+351 912 345 678",
    currentRole: "Housekeeping Supervisor",
    yearsOfExperience: 9,
    summary: "Housekeeping supervisor with 9 years of experience managing housekeeping teams and quality standards in large resort properties.",
    skills: ["Team supervision", "Quality inspection", "Inventory management", "Scheduling", "Health & safety compliance"],
    languages: ["Portuguese (native)", "English (fluent)", "Spanish (conversational)"],
    certifications: [],
    workExperience: [
      {
        company: "Ocean Pearl Resort",
        title: "Housekeeping Supervisor",
        startDate: "Sep 2017",
        endDate: null,
        isCurrent: true,
        description: "Supervise a team of 20 room attendants across a 250-room resort, maintaining a 98% inspection pass rate.",
      },
    ],
    education: [],
  },
  {
    fullName: "Wei Zhang",
    email: "wei.zhang@example.com",
    phone: "+1 650 555 0110",
    currentRole: "Backend Developer",
    yearsOfExperience: 6,
    summary: "Backend developer with 6 years of experience building Python services and data pipelines on AWS.",
    skills: ["Python", "Django", "PostgreSQL", "AWS", "Docker", "REST APIs", "Kafka"],
    languages: ["Mandarin (native)", "English (fluent)"],
    certifications: ["AWS Certified Solutions Architect – Associate"],
    workExperience: [
      {
        company: "DataForge Inc.",
        title: "Backend Developer",
        startDate: "Oct 2020",
        endDate: null,
        isCurrent: true,
        description: "Designed and scaled a Django/Postgres API handling 2M+ daily requests.",
      },
      {
        company: "Cloudline Systems",
        title: "Software Engineer",
        startDate: "Jul 2018",
        endDate: "Sep 2020",
        isCurrent: false,
        description: "Built ETL pipelines processing analytics data on AWS.",
      },
    ],
    education: [
      { institution: "UC San Diego", degree: "M.S.", fieldOfStudy: "Computer Science", startDate: "2016", endDate: "2018" },
    ],
  },
  {
    fullName: "James O'Connor",
    email: "james.oconnor@example.com",
    phone: "+353 87 123 4567",
    currentRole: "Food & Beverage Manager",
    yearsOfExperience: 10,
    summary: "F&B manager with 10 years of experience overseeing restaurant, bar, and banquet operations in 4- and 5-star hotels.",
    skills: ["P&L management", "Team leadership", "Vendor negotiation", "Event planning", "POS systems"],
    languages: ["English (native)"],
    certifications: ["Certified Food & Beverage Executive (CFBE)"],
    workExperience: [
      {
        company: "The Kilkenny Grand Hotel",
        title: "Food & Beverage Manager",
        startDate: "Feb 2018",
        endDate: null,
        isCurrent: true,
        description: "Oversee 3 outlets and banquet operations with combined annual revenue of €4.2M.",
      },
    ],
    education: [
      { institution: "Dublin Institute of Technology", degree: "B.A.", fieldOfStudy: "Hospitality Management", startDate: "2010", endDate: "2013" },
    ],
  },
  {
    fullName: "Sofia Marin",
    email: "sofia.marin@example.com",
    phone: "+40 721 234 567",
    currentRole: "Bartender",
    yearsOfExperience: 3,
    summary: "Bartender with 3 years of experience in high-volume cocktail bars, skilled in classic and craft cocktails and inventory control.",
    skills: ["Mixology", "Craft cocktails", "POS systems", "Inventory control", "Customer service"],
    languages: ["Romanian (native)", "English (fluent)", "Italian (conversational)"],
    certifications: ["TIPS Certified"],
    workExperience: [
      {
        company: "The Velvet Room",
        title: "Bartender",
        startDate: "Apr 2022",
        endDate: null,
        isCurrent: true,
        description: "Craft cocktail bar bartender serving 150+ covers on weekend nights.",
      },
    ],
    education: [],
  },
  {
    fullName: "Tom Becker",
    email: "tom.becker@example.com",
    phone: "+49 151 2345 6789",
    currentRole: "Full-Stack Developer",
    yearsOfExperience: 5,
    summary: "Full-stack developer with 5 years of experience across React frontends and Node.js backends for SaaS products.",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "GraphQL", "CI/CD"],
    languages: ["German (native)", "English (fluent)"],
    certifications: [],
    workExperience: [
      {
        company: "Berlin Softworks",
        title: "Full-Stack Developer",
        startDate: "Jan 2021",
        endDate: null,
        isCurrent: true,
        description: "Built React + Node.js features for a B2B SaaS product used by 500+ companies.",
      },
      {
        company: "StartHub GmbH",
        title: "Junior Developer",
        startDate: "Sep 2019",
        endDate: "Dec 2020",
        isCurrent: false,
        description: "Worked on internal tooling in React and Express.",
      },
    ],
    education: [
      { institution: "TU Berlin", degree: "B.Sc.", fieldOfStudy: "Computer Science", startDate: "2015", endDate: "2019" },
    ],
  },
  {
    fullName: "Layla Haddad",
    email: "layla.haddad@example.com",
    phone: "+971 50 123 4567",
    currentRole: "Hotel Concierge",
    yearsOfExperience: 6,
    summary: "Hotel concierge with 6 years of experience delivering personalized guest services in luxury hotels, multilingual.",
    skills: ["Guest relations", "Itinerary planning", "Reservations", "VIP services", "Local knowledge"],
    languages: ["Arabic (native)", "English (fluent)", "French (fluent)"],
    certifications: ["Les Clefs d'Or member"],
    workExperience: [
      {
        company: "Burj Al Sahra Hotel",
        title: "Concierge",
        startDate: "Mar 2019",
        endDate: null,
        isCurrent: true,
        description: "Coordinate VIP guest experiences, restaurant reservations, and local excursions for a 5-star property.",
      },
    ],
    education: [
      { institution: "Emirates Academy of Hospitality Management", degree: "B.A.", fieldOfStudy: "Hotel Management", startDate: "2013", endDate: "2016" },
    ],
  },
];

function buildRawText(c: SeedCandidate): string {
  const experience = c.workExperience
    .map((w) => `${w.title} at ${w.company} (${w.startDate} - ${w.isCurrent ? "Present" : w.endDate}): ${w.description}`)
    .join("\n");
  const education = c.education.map((e) => `${e.degree} in ${e.fieldOfStudy}, ${e.institution} (${e.startDate}-${e.endDate})`).join("\n");

  return [
    c.fullName,
    c.currentRole,
    c.email,
    c.phone,
    c.summary,
    "Skills: " + c.skills.join(", "),
    "Languages: " + c.languages.join(", "),
    c.certifications.length ? "Certifications: " + c.certifications.join(", ") : "",
    "Work experience:\n" + experience,
    education ? "Education:\n" + education : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function main() {
  console.log(`Seeding ${CANDIDATES.length} candidates...`);

  for (const c of CANDIDATES) {
    const existing = await prisma.candidate.findFirst({ where: { email: c.email } });
    if (existing) {
      console.log(`  skip (already exists): ${c.fullName}`);
      continue;
    }

    const rawText = buildRawText(c);
    const candidate = await prisma.candidate.create({
      data: {
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        currentRole: c.currentRole,
        yearsOfExperience: c.yearsOfExperience,
        summary: c.summary,
        skills: c.skills,
        languages: c.languages,
        certifications: c.certifications,
        rawText,
        sourceFileUrl: `seed/${c.fullName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        sourceFileType: "pdf",
        sourceFileName: `${c.fullName}.pdf`,
        workExperience: {
          create: c.workExperience.map((w, i) => ({ ...w, sortOrder: i })),
        },
        education: {
          create: c.education.map((e, i) => ({ ...e, sortOrder: i })),
        },
      },
    });

    try {
      const embedding = await generateEmbedding(rawText);
      await setCandidateEmbedding(candidate.id, embedding);
      console.log(`  created + embedded: ${c.fullName}`);
    } catch (err) {
      console.warn(`  created ${c.fullName} but failed to embed (chat search won't find them): ${(err as Error).message}`);
    }
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
