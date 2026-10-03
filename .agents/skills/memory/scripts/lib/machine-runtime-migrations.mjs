// Separate schema13 bundle. No historical manifest is relabeled or extended in place.
import { machineMigrations } from './machine-migrations.mjs';
export const machineRuntimeMigrations = Object.freeze([...machineMigrations,
  Object.freeze({ version: 13, filename: '0013_machine_runtime.sql', sha256: '1b98ad319fc5a34395b5de88a8aeef66ef858491cafcecfb6a139f448132ad89' }),
]);
export const machineRuntimeSchemaVersion = 13;
