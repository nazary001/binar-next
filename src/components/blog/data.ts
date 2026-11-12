// Blog content model. The Figma «Блог» page defines 6 cards in the
// listing grid plus one fully-written article («Тендер на оснащення
// готелю»). The posts live in MongoDB (collection blog_posts, read by
// src/server/repos/blog.ts): the 6 designed cards plus 3 more in-theme
// posts so the "Показати більше" pagination and the category filter have
// something to reveal; the initial view (6 cards + button) still matches
// the Figma master 1:1. This module keeps the shapes and the chips; it
// must never import the dataset.

export type BlogPost = {
  slug: string;
  // Filter category — matches one of BLOG_CATEGORIES so the chips filter.
  category: string;
  // Short label shown on the card (rendered uppercase via CSS, matching
  // Figma where every card category is upper-cased).
  categoryLabel: string;
  title: string;
  excerpt: string;
  image: string;
};

// Filter chips, in Figma order. «Всі статті» is the default (orange) chip.
export const BLOG_CATEGORIES = [
  "Всі статті",
  "Готелі",
  "Клінінг",
  "Гігієна та косметика",
  "Стандарти якості",
  "Закупівлі",
] as const;

// The article body of a post (ArticleBody renders it in this order: the
// intro, each section's heading + paragraphs, the list section, the tags).
// Plain text only.
export type BlogArticleBody = {
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  listSection: { heading: string; items: string[] };
  tags: string[];
};
