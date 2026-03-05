import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up - Construction Logistics",
  description: "Create a new Construction Logistics account",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
