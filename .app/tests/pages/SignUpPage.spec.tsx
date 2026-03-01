import { expect, test, describe, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SignUpPage from "../../app/(auth)/signup/page";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.create_account": "Create an account",
        "common.full_name": "Full Name",
        "common.full_name_placeholder": "John Doe",
        "common.email": "Email Address",
        "common.email_placeholder": "you@company.com",
        "common.password": "Password",
        "common.password_placeholder": "••••••••",
        "common.confirm_password": "Confirm Password",
        "common.already_have_account": "Already have an account?",
        "common.login": "Login",
        "common.google_login": "Google",
        "common.sign_in": "Sign In",
        "common.password_min_chars": "(min 6 chars)",
        "common.enter_details":
          "Enter your details below to create your account.",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("@/app/context/UserContext", () => ({
  useUser: () => ({
    refreshUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("SignUpPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders create account heading", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("heading", { name: /Create an account/i }),
    ).toBeInTheDocument();
  });

  test("renders form inputs", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password.*min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test("renders create account button", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("button", { name: /create.*account/i }),
    ).toBeInTheDocument();
  });

  test("renders google sign up button", () => {
    render(<SignUpPage />);
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  test("renders sign in link", () => {
    render(<SignUpPage />);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});
