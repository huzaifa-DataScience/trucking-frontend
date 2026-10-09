import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up - Goel App",
  description: "Create a new Goel App account",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
