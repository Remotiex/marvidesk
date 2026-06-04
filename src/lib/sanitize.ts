import DOMPurify from "isomorphic-dompurify";

/** Whitelist of tags/attributes our rich-text editor can produce. */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3",
      "ul", "ol", "li", "blockquote", "code", "pre", "a", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}

/** True when rich-text HTML has no visible content. */
export function isRichTextEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length === 0;
}
