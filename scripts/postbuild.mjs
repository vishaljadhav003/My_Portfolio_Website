// Runs after `vite build`. Writes one HTML file per route (dist/about/index.html, ...) with its own
// <title>, meta tags, structured data and crawlable content, so every URL is indexable without running JavaScript.
// Set SITE_URL to also get canonical URLs, absolute social images, a sitemap and a robots.txt that points to it.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, faq, projects, security, seo, services, skills } from "../src/data.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = process.env.DIST_DIR || join(root, "dist");
const site = (process.env.SITE_URL || "").replace(/\/$/, "");
const template = readFileSync(join(dist, "index.html"), "utf8");

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const json = (data) => JSON.stringify(data).replace(/</g, "\\u003c");
const abs = (path) => (site ? site + path : path);

function setMeta(html, attribute, value) {
  const pattern = new RegExp(`(<meta ${attribute} content=")[^"]*(")`);
  return html.replace(pattern, (_, start, end) => start + esc(value) + end);
}

// ---------- Content that crawlers (and people without JavaScript) see before React loads ----------

const nav = `<nav><a href="/">Home</a> &middot; <a href="/about">About</a> &middot; <a href="/projects">Projects</a> &middot; <a href="/faq">FAQ</a> &middot; <a href="/contact">Contact</a></nav>`;

const fallback = {
  "/": () => `<h1>${esc(SITE.name)}</h1><img src="${abs("/vishal-jadhav-pune.jpg")}" alt="${esc(SITE.name)}, software engineer in Pune, India" width="160" height="200" style="border-radius:16px;display:block;margin:0 0 16px"><p>${esc(SITE.role)} in ${esc(SITE.location)}.</p><p>${esc(SITE.summary)}</p>
    <h2>${esc(security.title)}</h2><p>${esc(security.text)}</p>`,
  "/about": () => `<h1>About ${esc(SITE.name)}</h1><p>${esc(SITE.summary)}</p>
    <h2>Skills</h2><ul>${skills.map((group) => `<li><strong>${esc(group.title)}:</strong> ${esc(group.tags.join(", "))}</li>`).join("")}</ul>`,
  "/projects": () => `<h1>Projects</h1><ul>${projects
    .map((p) => `<li><h2>${esc(p.title)}</h2><p>${esc(p.summary)}</p><p><a href="${esc(p.url)}" rel="noopener">${esc(p.url)}</a></p></li>`)
    .join("")}</ul>`,
  "/faq": () => `<h1>Frequently asked questions</h1>${faq.map((item) => `<h2>${esc(item.q)}</h2><p>${esc(item.a)}</p>`).join("")}`,
  "/contact": () => `<h1>Contact ${esc(SITE.name)}</h1><p>Send an inquiry about: ${esc(services.map((s) => s.label).join(", "))}.</p>
    <p><a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a> &middot; <a href="${esc(SITE.phoneHref)}">${esc(SITE.phone)}</a></p>`,
};

function structuredData(path, { title, description }) {
  const blocks = [];
  if (path === "/") {
    blocks.push({ "@context": "https://schema.org", "@type": "WebSite", name: "Vishal Jadhav", alternateName: "Vishal Jadhav Pune", url: abs("/") });
    blocks.push({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: abs("/"),
      name: title,
      description,
      mainEntity: { "@id": abs("/#vishal-jadhav") },
      primaryImageOfPage: { "@type": "ImageObject", contentUrl: abs("/vishal-jadhav-pune.jpg"), caption: "Vishal Jadhav, software engineer in Pune, India" },
    });
  }
  if (path !== "/") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
        { "@type": "ListItem", position: 2, name: title.split("|")[0].trim(), item: abs(path) },
      ],
    });
  }
  if (path === "/faq") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    });
  }
  if (path === "/contact") {
    blocks.push({ "@context": "https://schema.org", "@type": "ContactPage", name: title, description, url: abs(path) });
  }
  if (path === "/projects") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: projects.map((p, index) => ({ "@type": "ListItem", position: index + 1, url: p.url, name: p.title })),
    });
  }
  return blocks.map((block) => `  <script type="application/ld+json">${json(block)}</script>\n`).join("");
}

function render(path, meta, { index = true } = {}) {
  const { title, description } = meta;
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name="description"', description);
  html = setMeta(html, 'property="og:title"', title);
  html = setMeta(html, 'property="og:description"', description);
  html = setMeta(html, 'name="twitter:title"', title);
  html = setMeta(html, 'name="twitter:description"', description);
  if (!index) html = setMeta(html, 'name="robots"', "noindex, nofollow");

  if (site) {
    html = html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")(\/[^"]*)"/g, (_, start, src) => `${start}${site}${src}"`);
    html = html.replace(/"(url|contentUrl|@id)": "(\/[^"]*)"/g, (_, key, value) => `"${key}": "${site}${value}"`);
    html = html.replace('<link rel="image_src" href="/', `<link rel="image_src" href="${site}/`);
    html = html.replace('<img src="/vishal-jadhav-pune.jpg"', `<img src="${site}/vishal-jadhav-pune.jpg"`);
  }

  const extra =
    (site && index ? `  <link rel="canonical" href="${abs(path === "/" ? "/" : path)}">\n  <meta property="og:url" content="${abs(path === "/" ? "/" : path)}">\n` : "") +
    (index ? structuredData(path, meta) : "");
  html = html.replace("</head>", () => `${extra}</head>`);

  if (fallback[path]) {
    html = html.replace(/<main class="static-fallback"[\s\S]*?<\/main>/, () => `<main class="static-fallback" style="font-family:system-ui,sans-serif;max-width:720px;margin:12vh auto;padding:0 20px;color:#e4f1ee">${fallback[path]()}${nav}</main>`);
  }
  return html;
}

const write = (path, html) => {
  if (path === "/") return writeFileSync(join(dist, "index.html"), html);
  const dir = join(dist, path.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
};

for (const [path, meta] of Object.entries(seo)) write(path, render(path, meta));
write("/admin", render("/admin", { title: "Admin | Vishal Jadhav", description: "Private area." }, { index: false }));

// Unknown URLs fall back to the app, which shows its own 404 page.
writeFileSync(join(dist, "404.html"), template);

const urls = Object.keys(seo).map((path) => {
  const priority = path === "/" ? "1.0" : path === "/projects" || path === "/contact" ? "0.9" : "0.7";
  const image =
    path === "/" || path === "/about"
      ? `<image:image><image:loc>${site}/vishal-jadhav-pune.jpg</image:loc><image:title>Vishal Jadhav</image:title><image:caption>Vishal Jadhav, software engineer in Pune, India</image:caption></image:image>`
      : "";
  return `  <url><loc>${site}${path === "/" ? "/" : path}</loc><changefreq>monthly</changefreq><priority>${priority}</priority>${image}</url>`;
});
const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n${site ? `\nSitemap: ${site}/sitemap.xml\n` : ""}`;
writeFileSync(join(dist, "robots.txt"), robots);
if (site) {
  writeFileSync(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`
  );
}

console.log(`postbuild: wrote ${Object.keys(seo).length} route pages${site ? " with canonical URLs and a sitemap" : " (set SITE_URL for canonical URLs and a sitemap)"}`);
