import type { Action } from "./actions";

export const can = (allowedActions: readonly string[], action: Action) =>
  allowedActions.includes(action);
