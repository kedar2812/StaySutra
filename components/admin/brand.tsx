/** The app mark: StaySutra's inscriptional S on a gold tile, with a lit top edge. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[linear-gradient(160deg,#f6d27a,#e2a92b_55%,#c48a17)] font-mark font-semibold text-[#2a1b00] shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_1px_2px_rgb(0_0_0/0.18)]"
      style={{ width: size, height: size, fontSize: size * 0.5, borderRadius: size * 0.3 }}
      aria-hidden
    >
      S
    </span>
  );
}
