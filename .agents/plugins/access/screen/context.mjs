import { createContext, useContext } from "./vendor/preact-htm.mjs";

/** What `mount` hands every part: the API client, and an app's title by its id. */
export const Screen = createContext(null);
export const useScreen = () => useContext(Screen);
