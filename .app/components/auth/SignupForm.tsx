"use client";

import axios from "axios";
import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/shared/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import { useTranslation } from "react-i18next";

export function SignupForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setServerError(null);
    setIsSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: t("auth.passwords_dont_match") });
      setIsLoading(false);
      return;
    }

    setErrors({}); // Clear previous errors

    try {
      const response = await axios.post("/api/auth/signup", {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        fullName: formData.name,
      });

      if (response.data.autoRedirect) {
        // Automatically log in the user to establish session
        try {
          await axios.post("/api/auth/login", {
            email: formData.email,
            password: formData.password,
          });
          router.push("/dashboard");
          return;
        } catch (loginErr) {
          console.error("Auto-login failed:", loginErr);
          // Fallback to manual login or success message
          setIsSuccess(true);
        }
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error("Signup error:", err);

      if (err.response?.status === 400 && err.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        const apiErrors = err.response.data.errors;

        if (Array.isArray(apiErrors)) {
          apiErrors.forEach((error: any) => {
            const field = error.path?.[0];
            if (field) {
              newErrors[field] = error.message;
            }
          });
        }
        setErrors(newErrors);
      } else {
        setServerError(
          err.response?.data?.message || t("common.error_occurred"),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {t("common.create_account")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("common.enter_details")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <Alert
            variant="destructive"
            className="animate-in fade-in duration-300"
          >
            <XCircle className="h-4 w-4" />
            <AlertTitle>{t("common.registration_failed")}</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <Alert
            variant="success"
            className="bg-success/10 border-success/20 text-success"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle>{t("common.success")}</AlertTitle>
            <AlertDescription>
              {t("common.signup_success_msg")}
              <div className="mt-2">
                <Link href="/login" className="font-bold underline">
                  {t("common.go_to_signin")}
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!isSuccess && (
          <>
            <div className="space-y-2">
              <label htmlFor="fullname" className="text-sm font-medium">
                {t("common.full_name")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullname"
                  type="text"
                  placeholder={t("common.full_name_placeholder")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`pl-10 h-11 bg-white ${errors.fullName ? "border-red-500" : ""}`}
                  required
                />
              </div>
              {errors.fullName && (
                <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium">
                {t("common.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={t("common.email_placeholder")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`pl-10 h-11 bg-white ${errors.email ? "border-red-500" : ""}`}
                  required
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium">
                {t("common.password")}{" "}
                <span className="text-muted-foreground font-normal text-xs ml-1">
                  {t("common.password_min_chars")}
                </span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("common.password_placeholder")}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`pl-10 pr-10 h-11 bg-white ${errors.password ? "border-red-500" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                {t("common.confirm_password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("common.password_placeholder")}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`pl-10 pr-10 h-11 bg-white ${errors.confirmPassword ? "border-red-500" : ""}`}
                  required
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("common.creating_account")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {t("common.create_account")}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#F7F7F7] lg:bg-white px-2 text-muted-foreground">
                  {t("common.or_continue_with")}
                </span>
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-white border-border hover:bg-slate-50 text-foreground font-medium flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t("common.google_login")}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground pt-4">
              {t("common.already_have_account")}{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                {t("common.sign_in")}
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
