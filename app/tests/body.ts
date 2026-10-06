/** A JSON body a test reads without declaring its shape: every property, and every item, is loose again. */
export type Loose = { readonly [key: string]: Loose } & readonly Loose[];

/** A response's JSON body. Read it loosely to hand a value to `expect`; name the shape to compare one in the test itself. */
export async function body<T = Loose>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
