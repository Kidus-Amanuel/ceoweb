import { expect, test, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SignUpPage from "../../app/(auth)/signup/page";

describe("SignUpPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders create account heading", () => {
    render(<SignUpPage />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  test("renders form inputs", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test("renders create account button", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  test("renders google sign up button", () => {
    render(<SignUpPage />);
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  test("renders sign in link", () => {
    render(<SignUpPage />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
