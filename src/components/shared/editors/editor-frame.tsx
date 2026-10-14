import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export const EditorFrame = ({ children, footer }: { children: ReactNode; footer: ReactNode }) => (
  <Card className="overflow-hidden">
    <div className="p-5 sm:p-6">{children}</div>
    <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-card/95 p-4 backdrop-blur">{footer}</div>
  </Card>
);
