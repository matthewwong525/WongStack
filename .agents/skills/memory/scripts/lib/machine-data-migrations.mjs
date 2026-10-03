// Separate schema14 manifest; original manifests remain immutable.
import { machineRuntimeMigrations } from './machine-runtime-migrations.mjs';
export const machineDataMigrations = Object.freeze([...machineRuntimeMigrations, Object.freeze({version:14,filename:'0014_machine_data_lifecycle.sql',sha256:'93fee960e87c4175c610389841b08e321af95aac820632e672c2efc909b47836'})]);
export const machineDataSchemaVersion = 14;
