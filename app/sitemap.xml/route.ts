const baseUrl = "https://www.smartreplypro.ai";

const routes = [
  { path: "", changeFrequency: "daily", priority: "1.0" },
  { path: "/pricing", changeFrequency: "weekly", priority: "0.9" },
  { path: "/privacy", changeFrequency: "monthly", priority: "0.7" },
  { path: "/terms", changeFrequency: "monthly", priority: "0.7" },
] as const;

export function GET() {
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    ({ path, changeFrequency, priority }) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
