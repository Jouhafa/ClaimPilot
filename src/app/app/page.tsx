import { AppShell } from "@/components/app";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata = {
  title: "App — ClaimPilot",
  description: "Track and manage your expense reimbursements",
};

export default function AppPage() {
  return (
    <AuthGuard>
      <AppShell />
    </AuthGuard>
  );
}

