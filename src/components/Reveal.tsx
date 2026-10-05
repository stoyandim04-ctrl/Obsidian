import { useRef, type ElementType, type ReactNode } from "react";
import { useInView } from "../media/hooks";

/** 20px / 640ms entrance once in view. With motion off, content is simply shown (see base.css). */
export function Reveal({ as: Tag = "div", className = "", children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, "0px 0px -12% 0px", true);
  return (
    <Tag ref={ref} className={`reveal${seen ? " is-in" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
