import { OnboardingGuard } from "@/components/app/onboarding-guard";

/**
 * Cabinet Onboarding shell (UI-013X Gate 2 §16) — `max-w-2xl` (not the
 * original `max-w-lg`) and top-aligned rather than vertically centered,
 * mirroring UI-012ABCDE's own `book/layout.tsx` widening precedent: the
 * real wizard (services table, weekly hours grid, review sections) needs
 * more room than a single centered form, while staying well short of a
 * full authenticated-app width.
 *
 * Wrapped in `OnboardingGuard` (TENANT-001 §32): provisioning attaches to
 * the authenticated caller, so an anonymous visitor is sent to `/auth`
 * first, and an already-onboarded user is sent to `/app` instead of seeing
 * the wizard again.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <div className="flex min-h-dvh justify-center bg-background px-4 py-10">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </OnboardingGuard>
  );
}
