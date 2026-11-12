import { fail } from "./store.ts";

/** The week board's and the chat list's routes, gone: an older computer hears `retired`, logs one line and goes on. */
const retired = () => fail("retired", 404);
export const retiredRoutes = ["GET daily-tasks", "POST daily-task-add", "POST daily-task-place", "POST daily-task-status", "POST daily-task-remove",
  "POST daily-task-link", "GET week", "PUT week-goal", "POST sweep", "GET task-search", "POST task", "PATCH task", "DELETE task", "POST group",
  "PATCH group", "POST group-move", "DELETE group", "GET chats", "PUT chat", "POST chats-sync", "POST chat-remove", "POST chat-close",
].map(route => [route, retired] as const);
