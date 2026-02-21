import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "@/features/settings/settings-context";
import { TagInput } from "@/features/tags/tag-input";
import { api } from "@/shared/api/client";
import { storageKeys } from "@/shared/config/storage";

const TagInputHarness = () => {
  const [value, setValue] = useState("");

  return <TagInput value={value} onChange={setValue} label="Тег" />;
};

describe("TagInput", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(storageKeys.baseUrl, "http://localhost:8300/v1");
    window.localStorage.setItem(storageKeys.apiKey, "secret");
  });

  it("selects tag from dropdown", async () => {
    vi.spyOn(api, "listTags").mockResolvedValueOnce([
      { id: "tag-1", name: "finance", created_at: "2026-01-01T00:00:00Z" },
    ]);

    const user = userEvent.setup();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <TagInputHarness />
        </SettingsProvider>
      </QueryClientProvider>,
    );

    const input = screen.getByLabelText("Тег");
    await waitFor(() => expect(api.listTags).toHaveBeenCalled());
    await user.click(input);
    await user.click(await screen.findByRole("button", { name: "finance" }));

    expect(input).toHaveValue("finance");
  });
});
