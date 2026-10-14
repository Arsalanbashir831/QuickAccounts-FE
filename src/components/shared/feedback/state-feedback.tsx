import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type StateFeedbackProps = {
  state: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export const StateFeedback = ({ state, title, description, onRetry }: StateFeedbackProps) => {
  const Icon = state === "loading" ? LoaderCircle : state === "error" ? CircleAlert : Inbox;
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
      <div>
        <Icon className={state === "loading" ? "mx-auto size-6 animate-spin text-muted-foreground" : "mx-auto size-6 text-muted-foreground"} />
        <h3 className="mt-3 font-semibold">{title ?? (state === "loading" ? "Loading records" : state === "error" ? "Records could not load" : "No records yet")}</h3>
        {description ? <p className="mt-1 max-w-[50ch] text-sm text-muted-foreground">{description}</p> : null}
        {state === "error" && onRetry ? <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>Try again</Button> : null}
      </div>
    </div>
  );
};
