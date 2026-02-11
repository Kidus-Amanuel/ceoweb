import BaseLayout from "@/layout/BaseLayout";

export { metadata } from "@/layout/BaseLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <BaseLayout>{children}</BaseLayout>;
}
