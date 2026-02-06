import { expect, test, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SignUpPage from "../../app/signup/page";

describe("SignUpPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders create account heading", () => {
    render(<SignUpPage />);
    // Updated to match the user's latest change "Create your accounts"
    expect(screen.getByText("Create your accounts")).toBeDefined();
  });

  test("renders create account button", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeDefined();
  });
});
