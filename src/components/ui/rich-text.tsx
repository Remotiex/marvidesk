import { sanitizeRichText, isRichTextEmpty } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

/**
 * Renders rich-text HTML safely (server-side sanitized) with prose styling.
 * Falls back to muted "No content" when empty.
 */
export function RichText({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (isRichTextEmpty(html)) {
    return <p className="text-sm text-muted">No description.</p>;
  }
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none prose-slate prose-a:text-primary",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
