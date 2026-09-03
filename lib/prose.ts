import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A deliberately small Markdown subset — headings, paragraphs, lists, quotes,
 * rules, links, bold and italic. Phase 2 replaces this with Tiptap's sanitised
 * HTML output; the block vocabulary is identical, so the article template does
 * not change when it does. DPR §3.1, §7.9
 */

export type Block =
  | { kind: "h2" | "h3"; text: string; id: string }
  | { kind: "p"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "rule" };

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => escapeMap[c] as string);
}

/** Escapes first, then re-introduces only the inline marks we allow. */
export function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-hi">$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, '<code class="rounded-chip bg-ink-700 px-1.5 py-0.5 text-[0.9em]">$1</code>')
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      '<a href="$2" class="text-gold-500 underline decoration-gold-500/40 underline-offset-4 transition-colors hover:decoration-gold-500">$1</a>',
    );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function parseProse(source: string): Block[] {
  const blocks: Block[] = [];
  const chunks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trimEnd());
    const firstLine = lines[0] ?? "";

    if (/^---+$/.test(firstLine)) {
      blocks.push({ kind: "rule" });
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(firstLine);
    if (heading) {
      const text = heading[2]!.trim();
      blocks.push({
        kind: heading[1]!.length === 2 ? "h2" : "h3",
        text,
        id: slugify(text),
      });
      continue;
    }

    if (lines.every((l) => l.startsWith(">"))) {
      blocks.push({
        kind: "quote",
        text: lines.map((l) => l.replace(/^>\s?/, "")).join(" ").trim(),
      });
      continue;
    }

    if (firstLine.startsWith("- ")) {
      const items: string[] = [];
      for (const line of lines) {
        if (line.startsWith("- ")) items.push(line.slice(2).trim());
        // A wrapped bullet continues the previous item rather than starting one.
        else if (line.trim() && items.length) items[items.length - 1] += ` ${line.trim()}`;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    blocks.push({ kind: "p", text: lines.join(" ").trim() });
  }

  return blocks;
}

export async function loadStoryBody(slug: string): Promise<Block[] | null> {
  try {
    const source = await readFile(
      join(process.cwd(), "content", "stories", `${slug}.md`),
      "utf8",
    );
    return parseProse(source);
  } catch {
    return null;
  }
}

/** Plain text for excerpts, search and the Phase 2 `bodyText` column. */
export function toPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.kind === "ul") return b.items.join(" ");
      if (b.kind === "rule") return "";
      return b.text;
    })
    .filter(Boolean)
    .join("\n\n");
}
