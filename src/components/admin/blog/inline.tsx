// The inline marks of an article (**жирний**, *курсив*,
// [текст](https://посилання)) are parsed by the public renderer, so the
// panel and the site can never disagree about them: a link opens only an
// http(s) address or a path of the site; any other target shows its label
// as plain text.
export { renderInline } from "@/components/blog/ArticleBlocks";
