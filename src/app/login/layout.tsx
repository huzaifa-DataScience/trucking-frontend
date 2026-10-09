import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in - Goel App",
  description: "Sign in to your Goel App account",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
