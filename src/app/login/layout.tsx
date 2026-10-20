import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in - Goel One",
  description: "Sign in to your Goel One account",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
