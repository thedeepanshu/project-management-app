// Seeds a user's workspace with a realistic sample portfolio of clients and projects.
//   npm run seed -- you@example.com          → only seeds when that workspace is empty
//   npm run seed -- you@example.com --reset  → wipes that user's clients & projects first

import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/db.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

const reset = process.argv.includes("--reset");
const email = process.argv.slice(2).find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run seed -- <email of an existing account> [--reset]");
  process.exit(1);
}

const daysFromNow = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const clients = [
  { key: "northwind", name: "Aarav Mehta", email: "aarav.mehta@northwindstudio.com", phone: "+91 98201 44718", company: "Northwind Studio" },
  { key: "maison", name: "Sofia Laurent", email: "sofia@maisonbleu.fr", phone: "+33 6 48 21 90 37", company: "Maison Bleu" },
  { key: "kumo", name: "Kenji Watanabe", email: "k.watanabe@kumolabs.io", phone: "+81 90 3318 2276", company: "Kumo Labs" },
  { key: "greenleaf", name: "Amara Okafor", email: "amara.okafor@greenleafenergy.co", phone: "+234 803 512 6604", company: "Greenleaf Energy" },
  { key: "trilha", name: "Lucas Ferreira", email: "lucas@trilha.app", phone: "+55 11 97412 3389", company: "Trilha Outdoors" },
  { key: "halcyon", name: "Emily Carter", email: "emily.carter@halcyonhealth.com", phone: "+1 (415) 555-0142", company: "Halcyon Health" },
  { key: "fintrail", name: "Rohan Kapoor", email: "rohan@fintrail.in", phone: "+91 99104 87213", company: "Fintrail Capital" },
  { key: "atelier", name: "Isabella Rossi", email: "isabella@ateliernove.it", phone: "+39 347 812 5590", company: "Atelier Nove" },
];

// due: days from today (negative = past). createdAgo: days since the project started.
const projects = [
  { client: "northwind", name: "Brand identity system", status: "Completed", priority: "Medium", due: -24, createdAgo: 70,
    description: "Logo suite, colour palette, typography scale and a 40-page brand guidelines document for Northwind's ten-year anniversary rebrand." },
  { client: "northwind", name: "Marketing website rebuild", status: "In Progress", priority: "High", due: 9, createdAgo: 34,
    description: "Rebuild the marketing site on a headless CMS with a shared component library, improved Core Web Vitals and localisation for three markets." },
  { client: "maison", name: "E-commerce storefront", status: "In Progress", priority: "High", due: 4, createdAgo: 41,
    description: "Shopify Plus storefront with a custom product configurator, multi-currency checkout and Klaviyo flows ahead of the EU spring launch." },
  { client: "maison", name: "Lookbook approval portal", status: "Not Started", priority: "Low", due: 38, createdAgo: 6,
    description: "Private portal where stylists review, tag and approve imagery from seasonal photoshoots, with comments and version history." },
  { client: "kumo", name: "Realtime telemetry dashboard", status: "In Progress", priority: "High", due: -3, createdAgo: 52,
    description: "Streaming dashboard for 12,000 edge devices with anomaly alerts, configurable thresholds and CSV/Parquet export for the data team." },
  { client: "kumo", name: "Developer documentation hub", status: "Completed", priority: "Low", due: -31, createdAgo: 88,
    description: "Versioned API reference and integration guides with live code samples, full-text search and an OpenAPI-driven changelog." },
  { client: "kumo", name: "SDK onboarding flow", status: "Not Started", priority: "Medium", due: 27, createdAgo: 3,
    description: "Interactive first-run experience that takes developers from API key to first successful device event in under five minutes." },
  { client: "greenleaf", name: "Carbon footprint mobile app", status: "In Progress", priority: "High", due: 18, createdAgo: 29,
    description: "React Native app that estimates a household's monthly footprint from energy bills and suggests personalised, measurable swaps." },
  { client: "greenleaf", name: "Investor pitch deck", status: "Completed", priority: "High", due: -12, createdAgo: 26,
    description: "Series A narrative, market sizing and impact metrics designed into a 22-slide deck with a matching one-page executive summary." },
  { client: "trilha", name: "Trail booking platform", status: "In Progress", priority: "Medium", due: 14, createdAgo: 45,
    description: "Booking flow for guided hikes covering guide availability, digital waivers, group payments and automated weather notices." },
  { client: "trilha", name: "SEO & performance audit", status: "Not Started", priority: "Medium", due: null, createdAgo: 2,
    description: "Technical SEO, structured data and Core Web Vitals audit with an improvement roadmap ranked by traffic impact and effort." },
  { client: "halcyon", name: "Patient intake redesign", status: "In Progress", priority: "High", due: 6, createdAgo: 38,
    description: "Accessible, HIPAA-compliant digital intake replacing paper forms across 14 clinics, cutting average check-in time by half." },
  { client: "halcyon", name: "Clinician scheduling tool", status: "Not Started", priority: "Medium", due: 45, createdAgo: 5,
    description: "Shift planning for 300+ clinicians with availability preferences, coverage rules and one-click swap requests." },
  { client: "halcyon", name: "Accessibility compliance review", status: "Completed", priority: "Medium", due: -8, createdAgo: 33,
    description: "WCAG 2.2 AA audit of the patient portal with remediation tickets, screen-reader testing and a sign-off report." },
  { client: "fintrail", name: "Portfolio analytics dashboard", status: "In Progress", priority: "Medium", due: 21, createdAgo: 19,
    description: "Interactive dashboard for advisors showing allocation drift, risk exposure and performance against benchmarks." },
  { client: "fintrail", name: "KYC onboarding flow", status: "Not Started", priority: "High", due: 11, createdAgo: 8,
    description: "Mobile-first identity verification with document capture, liveness checks and automated risk scoring for new investors." },
  { client: "atelier", name: "Product photography CMS", status: "Completed", priority: "Low", due: -17, createdAgo: 60,
    description: "Lightweight CMS for managing product shoots, retouching status and export presets across 1,200 SKUs." },
  { client: "atelier", name: "Spring collection microsite", status: "In Progress", priority: "Medium", due: 2, createdAgo: 16,
    description: "Editorial microsite with scroll-driven storytelling, shoppable looks and a waitlist for the limited spring collection." },
];

await connectDB();

try {
  const user = await mongoose.connection.db.collection("user").findOne({ email });
  if (!user) {
    console.error(`✖ No account with the email ${email}. Sign up first, then run this again.`);
    process.exit(1);
  }
  const ownerId = user._id.toString();

  if (reset) {
    await Promise.all([Project.deleteMany({ ownerId }), Client.deleteMany({ ownerId })]);
    console.log(`Cleared ${email}'s clients and projects.`);
  } else if (await Client.exists({ ownerId })) {
    console.log("This workspace already has data — skipping. Add --reset to start over.");
    process.exit(0);
  }

  // Clients joined over the past few months, oldest first.
  const createdClients = await Client.insertMany(
    clients.map(({ key: _key, ...client }, index) => ({
      ...client,
      ownerId,
      createdAt: daysFromNow(-(100 - index * 9)),
    })),
    { timestamps: false }
  );
  const clientIdByKey = Object.fromEntries(clients.map((client, index) => [client.key, createdClients[index]._id]));

  await Project.insertMany(
    projects.map(({ client, due, createdAgo, ...project }) => {
      const createdAt = daysFromNow(-createdAgo);
      return {
        ...project,
        ownerId,
        clientId: clientIdByKey[client],
        dueDate: due === null ? undefined : daysFromNow(due),
        createdAt,
        updatedAt: daysFromNow(-Math.floor(createdAgo / 3)),
      };
    }),
    { timestamps: false }
  );

  console.log(`Seeded ${createdClients.length} clients and ${projects.length} projects for ${email}.`);
} finally {
  await disconnectDB();
}
