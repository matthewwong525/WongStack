// The one setup message, the same for everyone who may connect. It names the business and the app's own setup file and
// holds no key; setup decides what a person receives from their access when it runs. wiki/stack/employee-project.md
export const SETUP_PATH = "/_memory/setup.mjs";

/** The business, as the app knows it: its project's name, else its own address. No setting holds a display name. */
export function businessName(env: { WONG_CODE_REPOSITORY?: string }, origin: string): string {
  return env.WONG_CODE_REPOSITORY?.trim().split("/").pop() || new URL(origin).hostname;
}

export const setupMessage = (origin: string, business: string) => `Set up ${business}'s project for me in this folder.
Download ${origin}${SETUP_PATH} and run it with node.
This file signs me in to ${business} and downloads our project; read it first if you like.
Print the sign-in link it shows into the chat and wait while I sign in.
Then tell me what works and what is left.`;
