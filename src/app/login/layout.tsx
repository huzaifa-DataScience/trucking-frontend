import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in - Construction Logistics",
  description: "Sign in to your Construction Logistics account",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
