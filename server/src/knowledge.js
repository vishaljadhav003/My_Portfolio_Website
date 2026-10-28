import { SITE, approach, education, experience, faq, projects, security, services, skills } from "../../src/data.js";

// Everything the assistant may talk about, split into small sections it can look up.
// For each question only the best matching sections go into the prompt, and the same
// list is shown to the visitor as "Sources", so what you see is what the model was given.

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const SECTIONS = [
  {
    id: "profile",
    title: "Profile",
    detail: SITE.role,
    core: true,
    keywords: ["who", "about", "vishal", "yourself", "introduce", "profile", "summary", "location", "based", "pune", "languages"],
    text: `${SITE.name} is a ${SITE.role} based in ${SITE.location}. ${SITE.summary} Languages: English, Hindi, Marathi.`,
  },
  {
    id: "contact",
    title: "Contact",
    detail: "Form, email, phone",
    core: true,
    keywords: ["contact", "hire", "email", "phone", "call", "reach", "inquiry", "enquiry", "quote", "price", "cost", "budget", "available", "whatsapp", "number"],
    text: `Contact: the form at /contact, email ${SITE.email}, phone ${SITE.phone}. No prices are quoted in chat; ${SITE.name} replies to every inquiry.`,
  },
  {
    id: "experience",
    title: "Experience",
    detail: `${experience.company}, ${experience.period}`,
    keywords: ["experience", "job", "work", "company", "employer", "years", "months", "role", "career", "motionpix"],
    text: `${experience.role} at ${experience.company}, ${experience.place}, ${experience.period}. ${experience.points.join(" ")}`,
  },
  {
    id: "education",
    title: "Education",
    detail: education[0].title,
    keywords: ["education", "degree", "study", "college", "university", "cgpa", "bsc", "school", "qualification", "marks"],
    text: education.map((item) => `${item.title}, ${item.place} (${item.period}, ${item.score})`).join("; "),
  },
  ...skills.map((group) => ({
    id: `skills-${slug(group.title)}`,
    title: `Skills: ${group.title}`,
    detail: group.tags.slice(0, 3).join(", "),
    keywords: ["skill", "skills", "stack", "tech", "technology", "tools", "know", "language", ...group.tags.map((tag) => tag.toLowerCase())],
    text: `${group.title}: ${group.tags.join(", ")}.`,
  })),
  ...projects.map((project) => ({
    id: `project-${project.id}`,
    title: `Project: ${project.title}`,
    detail: `${project.kind}, ${project.status}`,
    keywords: ["project", "projects", "portfolio", "built", "work", "website", "case", project.id, ...project.stack.map((tag) => tag.toLowerCase())],
    text: `${project.title} (${project.kind}, ${project.status}, ${project.url}): ${project.summary} ${project.points.join(". ")}. Stack: ${project.stack.join(", ")}.`,
  })),
  {
    id: "security-red",
    title: "Security: red team",
    detail: security.red.tagline,
    keywords: ["security", "cyber", "red", "pentest", "penetration", "hack", "hacking", "attack", "owasp", "vulnerability", "recon", "exploit"],
    text: `${security.text} Red team (${security.red.tagline}): ${security.red.points.join("; ")}. Tools: ${security.red.tools.join(", ")}.`,
  },
  {
    id: "security-blue",
    title: "Security: blue team",
    detail: security.blue.tagline,
    keywords: ["security", "cyber", "blue", "defence", "defense", "soc", "siem", "incident", "threat", "hunting", "logs", "monitoring", "harden"],
    text: `Blue team (${security.blue.tagline}): ${security.blue.points.join("; ")}. Tools: ${security.blue.tools.join(", ")}.`,
  },
  {
    id: "services",
    title: "Services",
    detail: "What you can hire him for",
    keywords: ["service", "services", "offer", "hire", "develop", "development", "build", "design", "app", "mobile", "seo", "software", "website"],
    text: `Services offered: ${services.map((service) => service.label).join(", ")}.`,
  },
  ...approach.map((item) => ({
    id: `approach-${slug(item.title)}`,
    title: `Approach: ${item.title}`,
    detail: "How he works",
    keywords: ["approach", "how", "process", "ai", "assistant", "chatbot", "secure", "motion", "3d", "animation"],
    text: `${item.title}. ${item.text}`,
  })),
  ...faq.map((item, index) => ({
    id: `faq-${index}`,
    title: `FAQ: ${item.q}`,
    detail: "Frequently asked",
    keywords: [],
    text: `Q: ${item.q} A: ${item.a}`,
  })),
];

const STOP = new Set([
  "the", "and", "for", "you", "your", "are", "can", "what", "how", "does", "with", "about", "tell", "have", "has", "his", "him", "her",
  "this", "that", "from", "any", "who", "why", "when", "where", "which", "please", "show", "give", "will", "would", "could", "should",
]);

const words = (text) => (String(text).toLowerCase().match(/[\p{L}\p{N}.+#]{2,}/gu) || []).filter((word) => !STOP.has(word));

/** Scores every section against the question and returns the best few. */
export function retrieve(question, { limit = 4 } = {}) {
  const queryWords = [...new Set(words(question))];
  const scored = SECTIONS.map((section) => {
    const title = section.title.toLowerCase();
    const body = section.text.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (title.includes(word)) score += 3;
      if (section.keywords.includes(word)) score += 2.5;
      if (body.includes(word)) score += 1;
    }
    return { section, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // A section far behind the best match is noise (for example every project matching the word "project").
  const best = scored[0]?.score ?? 0;
  const sections = scored.filter((entry) => entry.score >= best * 0.6).map((entry) => entry.section);
  return {
    sections,
    sources: sections.map(({ id, title, detail }) => ({ id, title, detail })),
  };
}

/** Text of the sections that are always included (who he is, how to contact him). */
export const CORE_FACTS = SECTIONS.filter((section) => section.core).map((section) => section.text).join("\n");
