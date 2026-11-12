// The operations every Access store answers, by name. A project's store keeps the data where the project keeps its
// own; the rules read and write only through these. Each is async. store/contract.mjs checks a store against them.

/** People and rules: one snapshot per caller, the lists, and each save with its change-record lines. */
export const PEOPLE = ['policy', 'open', 'admin', 'installed', 'started', 'listApps', 'sets', 'savePerson', 'saveRole',
  'removeRole', 'start', 'startKeys', 'status', 'audit', 'audited'];
/** The sign-in list's steps: the lease, each pending step, and each list write whose outcome may still be unknown. */
export const SIGN_IN_LIST = ['lease', 'release', 'leaseCurrent', 'step', 'stepFailed', 'stepStale', 'stepUnresolved', 'stepDone',
  'stepWaiting', 'beginWrite', 'endWrite', 'unresolvedWrites', 'listed'];
/** Tools added from a chat, and keys sent sealed that wait for the next publish. */
export const SERVICES = ['tools', 'saveTool', 'removeTool', 'sealed', 'saveSealed'];
export const OPERATIONS = [...PEOPLE, ...SIGN_IN_LIST, ...SERVICES];

/** The operations a store lacks, by name; none for a whole store. */
export const missingOperations = store => OPERATIONS.filter(name => typeof store?.[name] !== 'function');
