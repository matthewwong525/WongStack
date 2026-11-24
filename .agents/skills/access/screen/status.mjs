// What the owner pastes to their assistant when a key setup makes is missing: the live app's key for
// the sign-in list, or the read-only key for Cloudflare look-ups. One step makes both.
export const FINISH_REQUEST = "Finish Access setup: run the Access setup step, so the live app has its key for the sign-in list and the read-only key for Cloudflare look-ups, as wiki/stack/employee-access.md describes.";

// What the owner pastes when they let someone install a project kept on GitHub and the app holds no key to
// read it: the one key that also saves. The steps on GitHub stay on the page it names.
export const PROJECT_REQUEST = "Let teammates install the project: the app needs its key for this project. Send me the key link for WONG_CODE_WRITE with the steps in wiki/stack/employee-project.md, then load it into the app.";

// What the owner pastes when the app holds only the older key, which reads the project and can not save a change.
export const SAVE_REQUEST = "Let teammates save changes: the app needs its newer key for this project. Send me the key link for WONG_CODE_WRITE with the steps in wiki/stack/employee-project.md, then load it into the app.";

const live = status => status.environment === "live";
/** Whether the project keeps a sign-in list Access writes to: a status with no `key` has none. */
export const listed = status => status.key !== undefined;

/** One sign-in status per person, and whether the sign-in step is still unfinished for them. With no sign-in list,
 *  a person is only on Access's own list: Listed. */
export function signInLine(person, status) {
  if (person.status === "removed") {
    const signingOut = status.work.some(work => work.kind === "sessions" && work.status !== "ready");
    const unfinished = listed(status) && live(status) && (!person.settled || signingOut);
    return { text: unfinished ? "Removed · still signing out" : "Removed", unfinished };
  }
  if (!listed(status)) return { text: "Listed", unfinished: false };
  // A preview's people are for practice: the real sign-in list is never touched.
  if (!live(status)) return { text: "Practice list", unfinished: false };
  return person.settled ? { text: "Can sign in", unfinished: false } : { text: "Can't sign in yet", unfinished: true };
}

/** Try again can only work once the live app holds its key and permissions have started. */
export const canRetry = status => live(status) && status.key === "ready" && status.started;
