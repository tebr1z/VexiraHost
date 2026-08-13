import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { MarketingShell } from "@/components/layout/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { getBlogUi, listBlogPosts, type BlogCategoryId } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seoPages");
  return buildPageMetadata({
    title: t("blogTitle"),
    description: t("blogDescription"),
    path: "/blog",
  });
}

export default async function BlogPage(): Promise<React.ReactElement> {
  const locale = await getLocale();
  const ui = getBlogUi(locale);
  const posts = listBlogPosts(locale);
  const tSeo = await getTranslations("seoPages");

  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: tSeo("blogTitle"), path: "/blog" },
        ])}
      />
      <section className="apple-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <header className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--label)] sm:text-4xl">
              {ui.title}
            </h1>
            <p className="mt-3 text-base text-[var(--label-secondary)] sm:text-lg">{ui.subtitle}</p>
          </header>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {posts.map((post) => {
              const category = ui.categories[post.category as BlogCategoryId];
              return (
                <article
                  key={post.slug}
                  className="flex flex-col rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                    <span className="text-[var(--accent)]">{category}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                    <span aria-hidden>·</span>
                    <span>{ui.readingTime.replace("{minutes}", String(post.readingMinutes))}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold tracking-tight text-[var(--label)] sm:text-xl">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[var(--accent)]">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--label-secondary)]">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    {ui.readMore} →
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
