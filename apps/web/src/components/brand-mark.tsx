type BrandMarkProps = {
  className?: string;
  light?: boolean;
};

/** The transparent master mark stays identical on light and dark surfaces. */
export function BrandMark({className = "", light = false}: BrandMarkProps) {
  return <img
    src="/brand/mark-black.png"
    width={1254}
    height={1254}
    alt=""
    aria-hidden="true"
    className={`shrink-0 object-contain ${light ? "invert" : ""} ${className}`}
  />;
}
