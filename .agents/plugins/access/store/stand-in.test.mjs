import { describe, test } from 'vitest';
import { checkStore } from './contract.mjs';
import { standInStore } from './stand-in.mjs';

checkStore(standInStore, 'the stand-in store', { describe, test });
