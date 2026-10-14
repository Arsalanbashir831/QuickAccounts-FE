import { z } from "zod";

export const accountFormSchema = z.object({
  name: z.string().trim().min(2, "Enter an account name.").max(120),
  groupId: z.string().min(1, "Choose a group."),
  purposeId: z.string().min(1, "Choose what this account is used for."),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;
