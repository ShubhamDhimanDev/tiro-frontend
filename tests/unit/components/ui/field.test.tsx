import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, Input, Select } from "@/components/ui/field";

describe("Input / Field", () => {
  it("associates the label with the control", async () => {
    render(<Input label="Email" type="email" />);
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    await userEvent.type(input, "a@b.co");
    expect(input).toHaveValue("a@b.co");
  });

  it("wires hint into aria-describedby", () => {
    render(<Input label="Phone" hint="Mobile numbers only" />);
    const input = screen.getByLabelText("Phone");
    const hint = screen.getByText("Mobile numbers only");
    expect(input).toHaveAttribute("aria-describedby", hint.id);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows the error as an alert, marks the control invalid and describes it", () => {
    render(<Input label="Postcode" hint="4 digits" error="Enter a valid postcode" />);
    const input = screen.getByLabelText("Postcode");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Enter a valid postcode");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("marks required controls accessibly", () => {
    render(<Input label="Name" required />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("gives every field a unique id", () => {
    render(
      <>
        <Input label="One" />
        <Input label="Two" />
      </>,
    );
    expect(screen.getByLabelText("One").id).not.toBe(screen.getByLabelText("Two").id);
  });

  it("uses a 48px control", () => {
    render(<Input label="Size" />);
    expect(screen.getByLabelText("Size")).toHaveClass("min-h-12");
  });

  it("Select renders options under a label", async () => {
    render(
      <Select label="State" defaultValue="">
        <option value="">Choose</option>
        <option value="VIC">Victoria</option>
      </Select>,
    );
    const select = screen.getByLabelText("State");
    await userEvent.selectOptions(select, "VIC");
    expect(select).toHaveValue("VIC");
  });

  it("Field render prop lets custom controls opt in", () => {
    render(
      <Field label="Custom" error="Bad">
        {(p) => <textarea {...p} />}
      </Field>,
    );
    expect(screen.getByLabelText("Custom")).toHaveAttribute("aria-invalid", "true");
  });
});
