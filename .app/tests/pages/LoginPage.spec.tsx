import { expect, test, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LoginPage from "../../app/(auth)/login/page";
import { vi } from "vitest";

vi.mock("@/app/context/UserContext", () => ({
  useUser: () => ({
    refreshUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders welcome message", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  test("renders email and password inputs", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  test("renders sign in button", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  test("renders google sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  test("renders create account link", () => {
    render(<LoginPage />);
    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });
});
