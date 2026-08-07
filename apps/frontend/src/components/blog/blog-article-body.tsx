import type { BlogBlock } from "@/content/blog";

export function BlogArticleBody({ body }: { body: BlogBlock[] }): React.ReactElement {
  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-[var(--label-secondary)] sm:text-base">
      {body.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "p") {
          return (
            <p key={key} className="text-[var(--label-secondary)]">
              {block.text}
            </p>
          );
        }
        if (block.type === "h2") {
          return (
            <h2
              key={key}
              className="pt-2 text-xl font-semibold tracking-tight text-[var(--label)] sm:text-2xl"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={key} className="list-disc space-y-2 pl-5">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={key} className="list-decimal space-y-2 pl-5">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          );
        }
        return (
          <aside
            key={key}
            className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--label)] sm:px-5 sm:py-4"
          >
            {block.text}
          </aside>
        );
      })}
    </div>
  );
}
