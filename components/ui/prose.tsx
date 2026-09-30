import { renderMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

/**
 * Redactionele tekst uit het CMS. De markdown wordt op de server omgezet en
 * opgeschoond (zie lib/markdown.ts), zodat er geen losse HTML uit een
 * gekopieerde tekst doorheen glipt.
 */
export function Prose({
  markdown,
  className,
  size = 'md',
}: {
  markdown: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const html = renderMarkdown(markdown);
  if (!html) return null;

  return (
    <div
      className={cn(
        'prose prose-mekaere max-w-none',
        size === 'sm' && 'prose-sm',
        size === 'lg' && 'prose-lg',
        'prose-headings:font-display prose-headings:font-semibold',
        'prose-a:underline prose-a:decoration-brand-300 prose-a:decoration-2 prose-a:underline-offset-2',
        'hover:prose-a:decoration-brand-700',
        'prose-img:rounded-2xl prose-img:shadow-soft',
        'prose-blockquote:border-l-4 prose-blockquote:not-italic prose-blockquote:font-display',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
