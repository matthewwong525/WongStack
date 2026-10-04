// Pictures of the product: chat bubbles drawn in HTML, and real screenshots
// of Paseo's laptop and phone apps.

/** A chat, as pairs of [who, text]; "you" is the visitor's side. */
export type Chat = [who: "you" | "agent", text: string][];

export function Bubbles({ chat }: { chat: Chat }) {
  return chat.map(([who, text]) => (
    <p className={`bubble bubble-${who}`} key={text}>
      {text}
    </p>
  ));
}

/**
 * A real Paseo screenshot, from `public/paseo/`: the laptop app in the hero,
 * and the pressed phone screen beside "Built by chatting": chat, plan review,
 * changes, files, or workspaces. Only the hero's loads eagerly.
 */
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
