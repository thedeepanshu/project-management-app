// Seeds the database with demo clients and projects.
//   npm run seed            → only seeds when the database is empty
//   npm run seed -- --reset → wipes clients & projects first, then seeds

import { connectDB, disconnectDB } from "../config/db.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

const reset = process.argv.includes("--reset");

const daysFromNow = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const clients = [
  { name: "Aarav Mehta", email: "aarav@northwind.studio", phone: "+91 98765 43210", company: "Northwind Studio" },
  { name: "Sofia Laurent", email: "sofia@maisonbleu.fr", phone: "+33 6 12 34 56 78", company: "Maison Bleu" },
  { name: "Kenji Watanabe", email: "kenji@kumo.dev", phone: "+81 90 1234 5678", company: "Kumo Labs" },
  { name: "Amara Okafor", email: "amara@greenleaf.co", phone: "+234 803 123 4567", company: "Greenleaf Co." },
  { name: "Lucas Ferreira", email: "lucas@trilha.app", phone: "+55 11 91234 5678", company: "Trilha" },
];

const projects = [
  { client: 0, name: "Brand identity refresh", status: "Completed", priority: "Medium", due: -12,
    description: "New logo system, colour palette and typography guidelines for Northwind's 10-year anniversary." },
  { client: 0, name: "Marketing site rebuild", status: "In Progress", priority: "High", due: 9,
    description: "Rebuild the marketing site on a headless CMS with a component library shared with the product team." },
  { client: 1, name: "E-commerce storefront", status: "In Progress", priority: "High", due: 4,
    description: "Shopify storefront with custom product configurator and multi-currency checkout for the EU launch." },
  { client: 1, name: "Lookbook photoshoot portal", status: "Not Started", priority: "Low", due: 30,
    description: "Private portal where stylists can review, tag and approve images from seasonal photoshoots." },
  { client: 2, name: "Realtime analytics dashboard", status: "In Progress", priority: "Medium", due: -3,
    description: "Streaming dashboard for edge-device telemetry with alerting thresholds and CSV export." },
  { client: 2, name: "Developer docs site", status: "Completed", priority: "Low", due: -20,
    description: "Versioned API reference and guides with live code samples and full-text search." },
  { client: 3, name: "Carbon tracker mobile app", status: "Not Started", priority: "High", due: 21,
    description: "Cross-platform app that estimates a household's monthly footprint and suggests swaps." },
  { client: 4, name: "Trail booking platform", status: "In Progress", priority: "Medium", due: 14,
    description: "Booking flow for guided hikes with guide availability, waivers and group payments." },
  { client: 4, name: "SEO & performance audit", status: "Not Started", priority: "Medium", due: null,
    description: "Core Web Vitals audit, structured data and an improvement roadmap ranked by impact." },
];

await connectDB();

try {
  if (reset) {
    await Promise.all([Project.deleteMany({}), Client.deleteMany({})]);
    console.log("Cleared existing clients and projects.");
  } else if ((await Client.estimatedDocumentCount()) > 0) {
    console.log("Database already has data — skipping. Use `npm run seed -- --reset` to start over.");
    process.exit(0);
  }

  const createdClients = await Client.insertMany(clients);
  await Project.insertMany(
    projects.map(({ client, due, ...project }) => ({
      ...project,
      clientId: createdClients[client]._id,
      dueDate: due === null ? undefined : daysFromNow(due),
    }))
  );

  console.log(`Seeded ${createdClients.length} clients and ${projects.length} projects.`);
} finally {
  await disconnectDB();
}
