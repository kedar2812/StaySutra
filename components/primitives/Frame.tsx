import Image from "next/image";
import { cn } from "@/lib/utils";
import { Plate } from "./Plate";
import type { PlateMood, PlateScene } from "@/lib/plate";

export interface MediaRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface FrameProps {
  /** Real media wins whenever it exists. */
  media?: MediaRef | null;
  /** Stable fallback seed — normally the entity slug. */
  seed: string;
  ratio?: "16/9" | "4/3" | "3/4" | "1/1" | "21/9";
  /**
   * Fill the parent instead of declaring an aspect ratio. Use this whenever the
   * frame is an `absolute inset-0` backdrop — an aspect ratio there computes
   * from the width and overflows the container, which silently pushes the
   * baked-in scrim out of view.
   */
  fill?: boolean;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  scene?: PlateScene;
  mood?: PlateMood;
  /** Duotone secondary imagery so mixed sources read as one brand. */
  muted?: boolean;
  children?: React.ReactNode;
}

const RATIO: Record<NonNullable<FrameProps["ratio"]>, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "3/4": "aspect-[3/4]",
  "1/1": "aspect-square",
  "21/9": "aspect-[21/9]",
};

/**
 * Every image slot on the site. Reserves its aspect ratio before anything loads,
 * so nothing shifts (CLS budget, DPR §8.6), and degrades to a branded plate
 * rather than a broken-image icon (DPR §12).
 */
export function Frame({
  media,
  seed,
  ratio = "4/3",
  fill = false,
  className,
  imgClassName,
  sizes = "100vw",
  priority = false,
  scene,
  mood,
  muted = false,
  children,
}: FrameProps) {
  // A frame taller than it is wide keeps its ground rather than its sky.
  const anchor = fill || ratio === "3/4" ? "bottom" : "center";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-ink-800",
        fill ? "size-full" : RATIO[ratio],
        className,
      )}
    >
      {media ? (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", anchor === "bottom" && "object-bottom", imgClassName)}
        />
      ) : (
        <div className={cn("absolute inset-0", imgClassName)}>
          <Plate seed={seed} scene={scene} mood={mood} muted={muted} anchor={anchor} />
        </div>
      )}
      {children}
    </div>
  );
}
