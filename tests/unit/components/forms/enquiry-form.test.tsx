import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const submit = vi.fn();
vi.mock("@/lib/enquiries/client-api", () => ({
  submitEnquiry: (...a: unknown[]) => submit(...a),
  THROTTLE_MESSAGE: "Too many messages, try again in a minute.",
}));

import { EnquiryForm } from "@/components/forms/enquiry-form";
import { OutOfAreaCapture } from "@/components/forms/out-of-area-capture";

describe("EnquiryForm", () => {
  beforeEach(() => submit.mockReset());

  it("shows inline errors linked with aria-describedby and focuses the first invalid field, without calling the API", async () => {
    const user = userEvent.setup();
    render(<EnquiryForm type="contact" />);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const name = screen.getByLabelText(/Your name/);
    expect(name).toHaveAttribute("aria-invalid", "true");
    const describedBy = name.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)).toHaveTextContent("Please tell us your name.");
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/How can we help/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("enquiry-alert")).toHaveTextContent("3 highlighted fields");
    await waitFor(() => expect(name).toHaveFocus());
    expect(submit).not.toHaveBeenCalled();
  });

  it("clears a field's error as the customer types", async () => {
    const user = userEvent.setup();
    render(<EnquiryForm type="contact" />);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    const name = screen.getByLabelText(/Your name/);
    await user.type(name, "J");
    expect(name).not.toHaveAttribute("aria-invalid");
  });

  it("sends the contact fields, always with an empty honeypot, then shows the reference", async () => {
    submit.mockResolvedValue({ kind: "success", reference: "ENQ-7K3P9XQ2", message: "Thanks, we've got your message. We'll be in touch soon." });
    const user = userEvent.setup();
    const onSent = vi.fn();
    render(<EnquiryForm type="contact" onSent={onSent} />);
    await user.type(screen.getByLabelText(/Your name/), "Jane Citizen");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
    await user.type(screen.getByLabelText(/How can we help/), "Do you fit run-flat tyres?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({
      type: "contact",
      name: "Jane Citizen",
      email: "jane@example.com",
      message: "Do you fit run-flat tyres?",
      website: "",
    });
    expect(await screen.findByTestId("enquiry-reference")).toHaveTextContent("ENQ-7K3P9XQ2");
    expect(screen.getByTestId("enquiry-success")).toBeInTheDocument();
    expect(onSent).toHaveBeenCalledWith("ENQ-7K3P9XQ2");
    // focus moves to the success message
    await waitFor(() => expect(screen.getByTestId("enquiry-success").parentElement).toHaveFocus());
  });

  it("hides the honeypot from keyboard and assistive tech", () => {
    render(<EnquiryForm type="contact" />);
    const honeypot = screen.getByTestId("enquiry-website");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    const wrapper = honeypot.closest("[aria-hidden='true']");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute("inert");
  });

  it("explains a 429 with the throttle wording and disables the button until the wait is over", async () => {
    submit.mockResolvedValue({ kind: "throttled", message: "Too many messages, try again in a minute.", retryAfter: 60 });
    const user = userEvent.setup();
    render(<EnquiryForm type="contact" />);
    await user.type(screen.getByLabelText(/Your name/), "Jane");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
    await user.type(screen.getByLabelText(/How can we help/), "A question about fitting");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByTestId("enquiry-alert")).toHaveTextContent("Too many messages, try again in a minute.");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("maps server 422 messages onto their fields and focuses the first", async () => {
    submit.mockResolvedValue({
      kind: "validation_error",
      message: "That email address does not look right. Check it and try again.",
      errors: { email: "That email address does not look right. Check it and try again." },
    });
    const user = userEvent.setup();
    render(<EnquiryForm type="contact" />);
    await user.type(screen.getByLabelText(/Your name/), "Jane");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.co");
    await user.type(screen.getByLabelText(/How can we help/), "A question about fitting");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const email = screen.getByLabelText(/^Email/);
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    await waitFor(() => expect(email).toHaveFocus());
  });

  it("quote form asks for a tyre size or plate, and prefills the size", async () => {
    const user = userEvent.setup();
    render(<EnquiryForm type="quote" initial={{ tyre_size: "205/55R16" }} />);
    expect(screen.getByLabelText(/^Tyre size/)).toHaveValue("205/55R16");
    await user.clear(screen.getByLabelText(/^Tyre size/));
    await user.click(screen.getByRole("button", { name: "Request my quote" }));
    expect(screen.getByLabelText(/^Tyre size/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Phone/)).toHaveAttribute("aria-invalid", "true");
  });

  it("fleet form has company, fleet size and phone, all required", async () => {
    const user = userEvent.setup();
    render(<EnquiryForm type="fleet" />);
    await user.click(screen.getByRole("button", { name: "Send fleet enquiry" }));
    for (const label of [/^Company/, /^Fleet size/, /^Phone/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    }
  });
});

describe("OutOfAreaCapture", () => {
  beforeEach(() => submit.mockReset());

  it("is a disclosure: the form appears only after the button, prefilled with the area", async () => {
    const user = userEvent.setup();
    render(<OutOfAreaCapture query="Ballarat" />);
    const button = screen.getByRole("button", { name: "Tell me when you reach my area" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/Your suburb or postcode/)).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Your suburb or postcode/)).toHaveValue("Ballarat");
  });

  it("posts an out_of_area enquiry, splitting a 4-digit postcode from a suburb name", async () => {
    submit.mockResolvedValue({ kind: "success", reference: "ENQ-AAAA1111", message: "Thanks" });
    const user = userEvent.setup();
    render(<OutOfAreaCapture query="6000" />);
    await user.click(screen.getByRole("button", { name: "Tell me when you reach my area" }));
    await user.type(screen.getByLabelText(/Your first name/), "Lee");
    await user.type(screen.getByLabelText(/^Email/), "lee@example.com");
    await user.click(screen.getByRole("button", { name: "Notify me" }));

    expect(submit.mock.calls[0][0]).toMatchObject({ type: "out_of_area", name: "Lee", email: "lee@example.com", postcode: "6000", suburb: "" });
    expect(await screen.findByTestId("enquiry-reference")).toHaveTextContent("ENQ-AAAA1111");
  });
});
