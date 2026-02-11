import { expect, test, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SignUpPage from "../../app/(auth)/signup/page";

describe("SignUpPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders create account heading", () => {
    render(<SignUpPage />);
    expect(screen.getByText("Create your account")).toBeDefined();
  });

  test("renders create account button", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeDefined();
  });
});
