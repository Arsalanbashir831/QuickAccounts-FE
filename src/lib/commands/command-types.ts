export type CommandState =
  | { status: "idle" }
  | { status: "submitting"; commandId: string }
  | { status: "accepted"; commandId: string; jobId: string }
  | { status: "confirmed"; commandId: string; reference: string }
  | { status: "unknown"; commandId: string; message: string }
  | { status: "failed"; commandId: string; message: string };
