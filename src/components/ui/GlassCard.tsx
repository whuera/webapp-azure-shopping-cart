import clsx from "clsx";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
}

const pads = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export default function GlassCard({ children, padding = "md", className, ...rest }: Props) {
  return (
    <div className={clsx("glass", pads[padding], "animate-fade-in", className)} {...rest}>
      {children}
    </div>
  );
}
