// Separate complete schema12 source manifest; historical schema11 manifest is unchanged.
import { memoryMigrations } from './installation-migrations.mjs';
export const machineMigrations = Object.freeze([...memoryMigrations,
  Object.freeze({ version: 12, filename: '0012_machine_authorization.sql', sha256: '7a242f1227e2f78af869220d12f39a978332a6f658fe815232f73b784fa9cae7' }),
]);
export const machineSchemaVersion = 12;
