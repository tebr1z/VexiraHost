import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { BlogArticleBody } from "@/components/blog/blog-article-body";
import { MarketingShell } from "@/components/layout/marketing-shell";
import {
  BLOG_SLUGS,
  getBlogPost,
  getBlogUi,
  getRelatedPosts,
  type BlogCategoryId,
} from "@/content/blog";
import { Link } from "@/i18n/navigation";

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function generateStaticParams(): Array<{ slug: string }> {
  return BLOG_SLUGS.map((slug) => ({ slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const locale = await getLocale();
  const ui = getBlogUi(locale);
  const post = getBlogPost(locale, slug);

  if (!post) notFound();

  const related = getRelatedPosts(locale, slug);

  return (
    <MarketingShell>
      <article className="apple-page py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <Link href="/blog" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            ← {ui.backToBlog}
          </Link>

          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
              <span className="text-[var(--accent)]">
                {ui.categories[post.category as BlogCategoryId]}
              </span>
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
              <span aria-hidden>·</span>
              <span>{ui.readingTime.replace("{minutes}", String(post.readingMinutes))}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--label)] sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[var(--label-secondary)] sm:text-lg">
              {post.excerpt}
            </p>
          </header>

          <div className="mt-10">
            <BlogArticleBody body={post.body} />
          </div>

          <div className="mt-10 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <Link
              href={post.ctaHref}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              {post.ctaLabel}
            </Link>
          </div>

          {related.length > 0 ? (
            <section className="mt-14">
              <h2 className="text-xl font-semibold text-[var(--label)]">{ui.relatedTitle}</h2>
              <ul className="mt-4 space-y-3">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/blog/${item.slug}`}
                      className="text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </MarketingShell>
  );
}
