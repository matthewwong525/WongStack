/** A real Paseo screenshot, from public/paseo/. */
export function PaseoShot({
  src,
  alt,
  width,
  height,
  lazy,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  lazy?: boolean;
}) {
  return (
    <img className="paseo-shot" src={src} alt={alt} width={width} height={height} loading={lazy ? "lazy" : "eager"} />
  );
}
