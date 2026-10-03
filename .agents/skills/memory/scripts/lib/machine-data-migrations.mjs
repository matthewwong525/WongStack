// Separate schema14 manifest; original manifests remain immutable.
import { machineRuntimeMigrations } from './machine-runtime-migrations.mjs';
export const machineDataMigrations = Object.freeze([...machineRuntimeMigrations, Object.freeze({version:14,filename:'0014_machine_data_lifecycle.sql',sha256:'1aafd85829342c97702cc00568302c8bf82cfa4bb262ab9c0f9a20ef842cd1dd'})]);
export const machineDataSchemaVersion = 14;
