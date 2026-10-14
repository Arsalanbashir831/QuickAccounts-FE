import type { Metadata } from "next";
import { AccessWorkspace } from "@/features/auth/access-workspace";

export const metadata: Metadata = { title: "Access" };

export default function AccessPage() {
  return <AccessWorkspace />;
}
