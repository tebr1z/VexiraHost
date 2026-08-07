import { blogPostsAz, blogUiAz } from "./az";
import { blogPostsEn, blogUiEn } from "./en";
import { BLOG_POST_META } from "./meta";
import { blogPostsRu, blogUiRu } from "./ru";
import { blogPostsTr, blogUiTr } from "./tr";
import type { BlogLocale, BlogPostContent, BlogPostMeta, BlogUiCopy } from "./types";

export type {
  BlogLocale,
  BlogBlock,
  BlogCategoryId,
  BlogPostContent,
  BlogPostMeta,
  BlogUiCopy,
} from "./types";
export { BLOG_POST_META, BLOG_SLUGS } from "./meta";

const UI: Record<BlogLocale, BlogUiCopy> = {
  az: blogUiAz,
  tr: blogUiTr,
  en: blogUiEn,
  ru: blogUiRu,
};

const POSTS: Record<BlogLocale, Record<string, BlogPostContent>> = {
  az: blogPostsAz,
  tr: blogPostsTr,
  en: blogPostsEn,
  ru: blogPostsRu,
};

export function resolveBlogLocale(locale: string): BlogLocale {
  return locale in UI ? (locale as BlogLocale) : "en";
}

export function getBlogUi(locale: string): BlogUiCopy {
  return UI[resolveBlogLocale(locale)];
}

export type BlogPost = BlogPostMeta & BlogPostContent;

export function getBlogPost(locale: string, slug: string): BlogPost | null {
  const meta = BLOG_POST_META.find((p) => p.slug === slug);
  const content = POSTS[resolveBlogLocale(locale)][slug];
  if (!meta || !content) return null;
  return { ...meta, ...content };
}

export function listBlogPosts(locale: string): BlogPost[] {
  const loc = resolveBlogLocale(locale);
  return BLOG_POST_META.map((meta) => {
    const content = POSTS[loc][meta.slug];
    if (!content) return null;
    return { ...meta, ...content };
  })
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getRelatedPosts(locale: string, slug: string, limit = 3): BlogPost[] {
  const current = getBlogPost(locale, slug);
  if (!current) return [];
  return listBlogPosts(locale)
    .filter((p) => p.slug !== slug && p.category === current.category)
    .slice(0, limit);
}
