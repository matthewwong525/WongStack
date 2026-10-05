// Every route's use of saved keys, main and mini app alike: Access shows what dispatch enforces.
import { apiKeyUse } from "../api/router.ts";
import { appKeyUse } from "../apps/index.ts";

export const keyUse = [...apiKeyUse, ...appKeyUse];
