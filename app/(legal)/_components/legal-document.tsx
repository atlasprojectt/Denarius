import {
  LEGAL_UPDATED_AT,
  legalChrome,
  type LegalBlock,
  type LegalDocument as LegalDocumentCopy,
} from "../copy";

// One presenter for both legal documents (issue #57): a policy and a terms page
// that drift apart in shape read as two unrelated documents. Copy arrives as
// structured data from copy.ts, so no string is inlined in JSX (F2).

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "text":
      return (
        <>
          {block.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm/relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </>
      );

    case "list":
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((item) => (
            <li
              key={item}
              className="relative pl-4 text-sm/relaxed text-muted-foreground before:absolute before:top-[0.6em] before:left-0 before:size-1.5 before:rounded-full before:bg-border"
            >
              {item}
            </li>
          ))}
        </ul>
      );

    case "definitions":
      return (
        <dl className="flex flex-col gap-4">
          {block.items.map((item) => (
            <div key={item.term} className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-foreground">{item.term}</dt>
              <dd className="text-sm/relaxed text-muted-foreground">
                {item.description}
              </dd>
            </div>
          ))}
        </dl>
      );

    // Deliberately a stacked list rather than a table: this is the widest
    // content on the page and a table would force horizontal scroll on a phone.
    case "subprocessors":
      return (
        <ul className="flex flex-col gap-3">
          {block.items.map((item) => (
            <li
              key={item.name}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-foreground">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.purpose}
                </span>
              </div>
              <p className="text-sm/relaxed text-muted-foreground">
                {item.receives}
              </p>
              <p className="text-xs text-muted-foreground">{item.location}</p>
            </li>
          ))}
        </ul>
      );
  }
}

export function LegalDocument({ doc }: { doc: LegalDocumentCopy }) {
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {doc.title}
        </h1>
        {/* text-pretty, not text-balance: the lead is a paragraph, and
            balancing a long body text ragged-rights every line of it. */}
        <p className="text-sm/relaxed text-pretty text-muted-foreground">
          {doc.lead}
        </p>
        <p className="text-xs text-muted-foreground">
          {legalChrome.updatedPrefix} {LEGAL_UPDATED_AT}
        </p>
      </header>

      {doc.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="flex scroll-mt-8 flex-col gap-4"
        >
          <h2 className="text-lg font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}
