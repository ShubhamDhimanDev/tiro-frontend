import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

const search = vi.fn();
vi.mock("@/lib/suburbs/client-api", () => ({ suburbsApi: { search: (...a: unknown[]) => search(...a) } }));

import { SuburbTypeahead } from "@/components/checkout/suburb-typeahead";
import type { SuburbSuggestion } from "@/lib/suburbs/types";

const richmond: SuburbSuggestion = { id: 2, name: "Richmond", state: "VIC", postcode: "3121", label: "Richmond VIC 3121", serviceable: true, service_zone_id: 3 };
const richmondNsw: SuburbSuggestion = { id: 9, name: "Richmond", state: "NSW", postcode: "2753", label: "Richmond NSW 2753", serviceable: false, service_zone_id: null };

function Harness({ onPick }: { onPick: (s: SuburbSuggestion) => void }) {
  const [value, setValue] = useState("");
  return (
    <SuburbTypeahead
      value={value}
      onChange={setValue}
      onPick={(s) => {
        setValue(s.name);
        onPick(s);
      }}
    />
  );
}

describe("SuburbTypeahead", () => {
  beforeEach(() => {
    search.mockReset();
    search.mockResolvedValue({ kind: "success", status: 200, data: { data: [richmond, richmondNsw] } });
  });

  it("asks the API once, after typing settles, and offers the suggestions as options", async () => {
    const user = userEvent.setup();
    render(<Harness onPick={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: "Suburb" }), "rich");
    const list = await screen.findByRole("listbox", { name: "Suburb suggestions" });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith("rich");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(list).toHaveTextContent("Richmond VIC 3121");
    expect(screen.getByRole("combobox", { name: "Suburb" })).toHaveAttribute("aria-expanded", "true");
  });

  it("labels a suburb we do not serve but still lets it be picked", async () => {
    const user = userEvent.setup();
    render(<Harness onPick={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: "Suburb" }), "rich");
    const nsw = await screen.findByRole("option", { name: /Richmond NSW 2753/ });
    expect(nsw).toHaveTextContent("Outside our area");
  });

  it("does not search for fewer than two characters", async () => {
    const user = userEvent.setup();
    render(<Harness onPick={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: "Suburb" }), "r");
    await new Promise((r) => setTimeout(r, 400));
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("picking with the keyboard (arrows then Enter) reports the suggestion and closes the list without searching again", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    const input = screen.getByRole("combobox", { name: "Suburb" });
    await user.type(input, "rich");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringMatching(/-0$/));
    await user.keyboard("{Enter}");
    expect(onPick).toHaveBeenCalledWith(richmond);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await new Promise((r) => setTimeout(r, 400));
    expect(search).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("Richmond");
  });

  it("Escape closes the list; typing is never blocked when the API has nothing or fails", async () => {
    const user = userEvent.setup();
    render(<Harness onPick={vi.fn()} />);
    const input = screen.getByRole("combobox", { name: "Suburb" });
    await user.type(input, "rich");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();

    search.mockResolvedValue({ kind: "unknown_error", status: 503, message: "down" });
    await user.type(input, "mo");
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveValue("richmo");
  });
});
