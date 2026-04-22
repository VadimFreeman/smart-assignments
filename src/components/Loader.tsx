interface LoaderProps {
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

const Loader = ({ size = "md", label, className = "" }: LoaderProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`m3-loader ${size === "sm" ? "m3-loader-sm" : ""}`} />
      {label && <p className="text-sm text-muted-foreground animate-pulse">{label}</p>}
    </div>
  );
};

export default Loader;