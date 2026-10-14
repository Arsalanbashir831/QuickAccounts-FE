import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AccountForm } from "@/features/accounts/components/account-form";

describe("AccountForm", () => {
  it("keeps the plain-language account-name validation close to the field", async () => {
    const user = userEvent.setup();
    render(<AccountForm groupId="expenses" groupLabel="Expenses" purposeId="operating-expense" submitLabel="Add Expense Category" />);
    await user.click(screen.getByRole("button", { name: "Add Expense Category" }));
    expect(await screen.findByText("Enter an account name.")).toBeVisible();
  });
});
