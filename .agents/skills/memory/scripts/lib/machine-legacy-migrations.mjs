// Separate15 release; the original fourteen-file manifest remains frozen.
import { machineDataMigrations } from './machine-data-migrations.mjs';
export const machineLegacyExtension = Object.freeze([{"version":15,"filename":"0015_legacy_cutover.sql","sha256":"1f0755394309c2c789d61c4b6cb586231ca492e82df73a4472d46788ba859abb"}]);
export const machineLegacyMigrations = Object.freeze([...machineDataMigrations,...machineLegacyExtension]);
