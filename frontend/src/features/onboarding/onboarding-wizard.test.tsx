import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";
import { OnboardingWizard } from "./onboarding-wizard";

const { provisionTenantMock } = vi.hoisted(() => ({ provisionTenantMock: vi.fn() }));

vi.mock("@/features/tenancy/api", () => ({ provisionTenant: provisionTenantMock }));

const PROVISIONED_USER = {
  id: "user-1",
  email: "docteur@cabinet.test",
  status: "active",
  lastLoginAt: null,
  tenant: { id: "tenant-1", name: "Cabinet Test", slug: "cabinet-test", status: "active" },
  membership: { id: "membership-1", profileType: "owner_admin", isOwner: true },
};

function DirRoot({ children }: { children: React.ReactNode }) {
  const { direction } = useLocale();
  return <div dir={direction}>{children}</div>;
}

function renderWizard(locale: Locale) {
  return render(
    <LocaleProvider initialLocale={locale}>
      <DirRoot>
        <OnboardingWizard />
      </DirRoot>
    </LocaleProvider>,
  );
}

function fillCabinetStep() {
  fireEvent.change(screen.getByLabelText(/^Nom du cabinet/), { target: { value: "Cabinet Test" } });
  fireEvent.change(screen.getByLabelText(/^Téléphone/), { target: { value: "0522334455" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
}

/** Cabinet -> Horaires -> Services -> Équipe -> Préférences -> Review, accepting every step's default/empty state. */
function reachReviewStep() {
  fillCabinetStep();
  fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // hours
  fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // services
  fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // team
  fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // preferences
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
  provisionTenantMock.mockReset();
});

describe("OnboardingWizard", () => {
  it("starts on the Cabinet step with progress 'Étape 1 sur 6'", () => {
    renderWizard("fr");
    expect(screen.getByText("Étape 1 sur 6")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configuration du cabinet" })).toBeInTheDocument();
  });

  it("blocks continuing from Cabinet without a required field", () => {
    renderWizard("fr");
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getAllByText("Ce champ est obligatoire.").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Configuration du cabinet" })).toBeInTheDocument();
  });

  it("advances to Horaires once Cabinet is valid", () => {
    renderWizard("fr");
    fillCabinetStep();
    expect(screen.getByRole("heading", { name: "Vos horaires" })).toBeInTheDocument();
    expect(screen.getByText("Étape 2 sur 6")).toBeInTheDocument();
  });

  it("every weekday starts closed — a brand-new cabinet has no invented default schedule", () => {
    renderWizard("fr");
    fillCabinetStep();
    expect(screen.getAllByText("Fermé").length).toBe(7);
  });

  it("rejects an interval where end is before start, using the same validation Paramètres itself uses", () => {
    renderWizard("fr");
    fillCabinetStep();

    const mondayRow = screen.getByText("Lundi").closest("div") as HTMLElement;
    fireEvent.click(within(mondayRow).getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Ouverture"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Fermeture"), { target: { value: "09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByRole("heading", { name: "Vos horaires" })).toBeInTheDocument();
  });

  it("accepts a valid interval and advances to Services", () => {
    renderWizard("fr");
    fillCabinetStep();

    const mondayRow = screen.getByText("Lundi").closest("div") as HTMLElement;
    fireEvent.click(within(mondayRow).getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Ouverture"), { target: { value: "08:30" } });
    fireEvent.change(screen.getByLabelText("Fermeture"), { target: { value: "18:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByRole("heading", { name: "Vos services et tarifs" })).toBeInTheDocument();
  });

  it("Services step allows continuing with zero services — no invented minimum-service requirement", () => {
    renderWizard("fr");
    fillCabinetStep();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // hours, all-closed default
    expect(screen.getByText("Aucun service ajouté pour le moment")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("heading", { name: "Votre équipe" })).toBeInTheDocument();
  });

  it("adding a service via the reused ServiceFormDialog shows it in the reused ServiceTable", () => {
    renderWizard("fr");
    fillCabinetStep();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // hours

    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un service" }));
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: "Consultation" } });
    fireEvent.change(screen.getByLabelText(/^Durée/), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText(/^Prix/), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByText("Consultation")).toBeInTheDocument();
  });

  it("Team step is optional — continuing with zero members works, and adding one requires first/last name", () => {
    renderWizard("fr");
    fillCabinetStep();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // hours
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // services

    expect(screen.getByText("Aucun membre ajouté — vous pourrez en ajouter depuis Équipe à tout moment.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un membre" }));
    expect(screen.getAllByText("Ce champ est requis.").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: "Amal" } });
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: "Idrissi" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un membre" }));
    expect(screen.getByText("Amal Idrissi")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("heading", { name: "Vos préférences" })).toBeInTheDocument();
  });

  it("reaches Review with a valid default duration, and Review lists every section", () => {
    renderWizard("fr");
    fillCabinetStep();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // hours
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // services
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // team
    fireEvent.click(screen.getByRole("button", { name: "Continuer" })); // preferences

    expect(screen.getByRole("heading", { name: "Récapitulatif" })).toBeInTheDocument();
    expect(screen.getByText("Cabinet Test")).toBeInTheDocument();
    expect(screen.getByText("Aucun service ajouté")).toBeInTheDocument();
    expect(screen.getByText("Aucun membre ajouté")).toBeInTheDocument();
  });

  it("going back from Horaires to Cabinet preserves the already-entered values in memory", () => {
    renderWizard("fr");
    fillCabinetStep();
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByDisplayValue("Cabinet Test")).toBeInTheDocument();
  });

  it("Terminer la configuration provisions the tenant for real and reaches the completion screen", async () => {
    provisionTenantMock.mockResolvedValue(PROVISIONED_USER);
    renderWizard("fr");
    reachReviewStep();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la configuration" }));

    expect(await screen.findByRole("heading", { name: "Votre espace est prêt" })).toBeInTheDocument();
    expect(screen.getByText("Votre cabinet a été créé avec succès.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir mon espace" })).toHaveAttribute("href", "/app");
    expect(provisionTenantMock).toHaveBeenCalledTimes(1);

    const payload = provisionTenantMock.mock.calls[0][0];
    expect(payload.cabinet.name).toBe("Cabinet Test");
    expect(payload.preferences.defaultDurationMinutes).toBe(30);
  });

  it("disables the finish button and shows a submitting label while provisioning is in flight", async () => {
    let resolveProvisioning: (value: unknown) => void = () => {};
    provisionTenantMock.mockReturnValue(
      new Promise((resolve) => {
        resolveProvisioning = resolve;
      }),
    );
    renderWizard("fr");
    reachReviewStep();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la configuration" }));

    const submittingButton = await screen.findByRole("button", { name: "Création du cabinet…" });
    expect(submittingButton).toBeDisabled();

    resolveProvisioning(PROVISIONED_USER);
    expect(await screen.findByRole("heading", { name: "Votre espace est prêt" })).toBeInTheDocument();
  });

  it("shows an inline error and stays on Review when provisioning fails", async () => {
    provisionTenantMock.mockRejectedValue(new Error("network exploded"));
    renderWizard("fr");
    reachReviewStep();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la configuration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Une erreur est survenue. Réessayez.");
    expect(screen.getByRole("heading", { name: "Récapitulatif" })).toBeInTheDocument();
  });

  it("never touches localStorage/cookies at any point in the flow, including a successful finish", async () => {
    provisionTenantMock.mockResolvedValue(PROVISIONED_USER);
    renderWizard("fr");
    reachReviewStep();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la configuration" }));

    await screen.findByRole("heading", { name: "Votre espace est prêt" });
    expect(window.localStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });

  it("progress is hidden once the flow reaches completion", async () => {
    provisionTenantMock.mockResolvedValue(PROVISIONED_USER);
    renderWizard("fr");
    reachReviewStep();
    fireEvent.click(screen.getByRole("button", { name: "Terminer la configuration" }));

    await screen.findByRole("heading", { name: "Votre espace est prêt" });
    expect(screen.queryByText(/Étape \d sur 6/)).not.toBeInTheDocument();
  });

  it("renders in Arabic with RTL direction", () => {
    renderWizard("ar");
    expect(screen.getByRole("heading", { name: "إعداد العيادة" })).toBeInTheDocument();
    expect(document.querySelector("[dir='rtl']")).toBeInTheDocument();
  });
});
