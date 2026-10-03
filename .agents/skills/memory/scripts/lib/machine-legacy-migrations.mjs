// Separate15 release; the original fourteen-file manifest remains frozen.
import { machineDataMigrations } from './machine-data-migrations.mjs';
export const machineLegacyExtension = Object.freeze([{"version":15,"filename":"0015_legacy_cutover.sql","sha256":"fb9e069490aa00cf0ebe8a9bea37d957300d27453ddd8134c7b9ed4c6c787698"}]);
export const machineLegacyMigrations = Object.freeze([...machineDataMigrations,...machineLegacyExtension]);
