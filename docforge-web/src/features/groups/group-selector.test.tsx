import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { SettingsProvider } from "@/features/settings/settings-context";
import { GroupSelector } from "@/features/groups/group-selector";

const groups = [
  { id: "group-1", name: "Contracts", description: "", created_at: "2026-01-01T00:00:00Z" },
  { id: "group-2", name: "Policies", description: "", created_at: "2026-01-02T00:00:00Z" },
];

const GroupSelectorHarness = () => {
  const [value, setValue] = useState("group-1");

  return <GroupSelector groups={groups} value={value} onChange={setValue} allowAll />;
};

describe("GroupSelector", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("selects 'All groups' from dropdown", async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <GroupSelectorHarness />
      </SettingsProvider>,
    );

    const input = screen.getByLabelText(/Search groups by name|Поиск групп по названию/i);
    await user.click(input);
    await user.click(screen.getByRole("button", { name: /All groups|Все группы/i }));

    expect(input).toHaveValue("Все группы");
  });
});
