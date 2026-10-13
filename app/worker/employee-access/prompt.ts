// The one setup message, the same for everyone who may connect. It names the app's own setup file and holds no
// key; setup decides what a person receives from their access when it runs. wiki/stack/employee-project.md
export const SETUP_PATH = "/_memory/setup.mjs";
export const setupMessage = (origin: string) => `Set up my company's project for me in this folder.
Download ${origin}${SETUP_PATH} and run it with node.
Print the sign-in link it shows into the chat and wait while I sign in.
Then tell me what works and what is left.`;
