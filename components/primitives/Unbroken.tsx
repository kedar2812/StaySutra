import { hyphenParts } from "@/lib/utils";

/** Text whose hyphenated words never break across a line. See `hyphenParts`. */
export function Unbroken({ children }: { children: string }) {
  return (
    <>
      {hyphenParts(children).map((part, i) =>
        part.keep ? (
          <span key={i} className="whitespace-nowrap">
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
