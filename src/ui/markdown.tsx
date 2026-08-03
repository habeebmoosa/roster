import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/cn";

const components: Components = {
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="text-base font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-border text-text-muted border-l-2 pl-3 italic">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-bg-subtle overflow-x-auto rounded-md p-3 font-mono text-xs">{children}</pre>
  ),
  code: ({ className, children }) => {
    // A fenced code block's <code> sits inside our <pre> override above (and
    // already carries a `language-*` class from remark) — style only the
    // inline case here, the block case is styled by the <pre> wrapper.
    if (className) return <code className={className}>{children}</code>;
    return <code className="bg-bg-subtle rounded px-1 py-0.5 font-mono text-xs">{children}</code>;
  },
};

/** Renders assistant chat replies as real markdown (bold, lists, code, links) — never raw HTML injection, react-markdown renders straight to React elements. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 text-sm leading-relaxed", className)}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
