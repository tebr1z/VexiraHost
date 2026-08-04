"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LoadingSkeleton, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  fetchProfile,
  updateBillingAddress,
  updatePhone,
} from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

const EMPTY_BILLING = {
  fullName: "",
  line1: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};
export default function AccountPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.account");
  const tc = useTranslations("dashboard.common");
  const tPricing = useTranslations("pricing");
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const [linked, setLinked] = useState<{ provider: string; createdAt: string }[]>([]);
  const [billingForm, setBillingForm] = useState(EMPTY_BILLING);
  const [billingSaving, setBillingSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const tcCart = useTranslations("cart");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/linked-providers`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
    })
      .then((r) => r.json())
      .then((body) => setLinked(body.data ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user?.billingAddress) {
      setBillingForm(user.billingAddress);
    }
    setPhone(user?.phone ?? "");
    setWhatsappEnabled(user?.whatsappNotificationsEnabled ?? true);
  }, [user?.billingAddress, user?.phone, user?.whatsappNotificationsEnabled]);

  useEffect(() => {
    if (user) {
      fetchProfile()
        .then((profile) => {
          if (accessToken && refreshToken) {
            setSession({
              user: profile,
              tokens: { accessToken, refreshToken, expiresIn: "15m" },
            });
          }
          if (profile.billingAddress) {
            setBillingForm(profile.billingAddress);
          }
          setPhone(profile.phone ?? "");
          setWhatsappEnabled(profile.whatsappNotificationsEnabled ?? true);
          setFromUser({
            preferredCurrency: profile.preferredCurrency,
            billingPeriod: profile.billingPeriod,
            currencyLocked: profile.currencyLocked,
          });
        })
        .catch(() => undefined);
    }
  }, [user?.id]);

  const handleSaveBilling = async () => {
    setBillingSaving(true);
    try {
      const profile = await updateBillingAddress(billingForm);
      if (accessToken && refreshToken) {
        setSession({
          user: profile,
          tokens: { accessToken, refreshToken, expiresIn: "15m" },
        });
      }
      toast(tp("billingSaved"), "success");
    } catch {
      toast(tp("billingSaveFailed"), "error");
    } finally {
      setBillingSaving(false);
    }
  };

  const handleSavePhone = async () => {
    setPhoneSaving(true);
    try {
      const profile = await updatePhone({
        phone: phone.trim() || null,
        whatsappNotificationsEnabled: whatsappEnabled,
      });
      if (accessToken && refreshToken) {
        setSession({
          user: profile,
          tokens: { accessToken, refreshToken, expiresIn: "15m" },
        });
      }
      toast(tp("phoneSaved"), "success");
    } catch {
      toast(tp("phoneSaveFailed"), "error");
    } finally {
      setPhoneSaving(false);
    }
  };
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl space-y-6" aria-busy>
        <LoadingSkeleton className="h-10 w-48" />
        <LoadingSkeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.account") },
        ]}
      />

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("profile")}</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">{tp("email")}</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">{tp("name")}</dt>
            <dd>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">{tp("emailVerified")}</dt>
            <dd>{user.emailVerified ? tc("yes") : tc("no")}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("currency")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("currencyDesc")}</p>
        <div className="mt-4">
          <CurrencySwitcher variant="segmented" />
        </div>
        {user.currencyLocked ? (
          <p className="text-on-surface-variant mt-2 text-xs">{tPricing("azLocked")}</p>
        ) : !user.canChangeCurrency && user.nextCurrencyChangeAt ? (
          <p className="text-on-surface-variant mt-2 text-xs">
            {tp("nextChangeAt", {
              date: new Date(user.nextCurrencyChangeAt).toLocaleDateString(locale),
            })}
          </p>
        ) : (
          <p className="text-on-surface-variant mt-2 text-xs">{tp("currencyCooldownHint")}</p>
        )}
      </section>

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("phoneTitle")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("phoneDescription")}</p>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+994501234567"
          className="border-outline-variant mt-4 h-11 w-full rounded-xl border px-4 text-sm"
        />
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={whatsappEnabled}
            onChange={(event) => setWhatsappEnabled(event.target.checked)}
            className="mt-1"
          />
          <span>{tp("whatsappReminders")}</span>
        </label>
        <button
          type="button"
          disabled={phoneSaving}
          onClick={() => void handleSavePhone()}
          className="bg-primary text-on-primary mt-4 h-10 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
        >
          {phoneSaving ? tp("saving") : tp("savePhone")}
        </button>
      </section>

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("billingAddress")}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">{tp("billingAddressDesc")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">{tcCart("billingFullName")}</label>
            <input
              value={billingForm.fullName}
              onChange={(e) => setBillingForm((p) => ({ ...p, fullName: e.target.value }))}
              className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">{tcCart("billingLine1")}</label>
            <input
              value={billingForm.line1}
              onChange={(e) => setBillingForm((p) => ({ ...p, line1: e.target.value }))}
              className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tcCart("billingCity")}</label>
            <input
              value={billingForm.city}
              onChange={(e) => setBillingForm((p) => ({ ...p, city: e.target.value }))}
              className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tcCart("billingRegion")}</label>
            <input
              value={billingForm.region}
              onChange={(e) => setBillingForm((p) => ({ ...p, region: e.target.value }))}
              className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tcCart("billingPostalCode")}</label>
            <input
              value={billingForm.postalCode}
              onChange={(e) => setBillingForm((p) => ({ ...p, postalCode: e.target.value }))}
              className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tcCart("billingCountry")}</label>
            <input
              value={billingForm.country}
              onChange={(e) => setBillingForm((p) => ({ ...p, country: e.target.value }))}
              className="border-outline-variant h-11 w-full rounded-xl border px-4 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={billingSaving}
          onClick={handleSaveBilling}
          className="bg-primary text-on-primary mt-4 inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
        >
          {billingSaving ? tp("billingSaving") : tp("billingSave")}
        </button>
      </section>

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("linkedAccounts")}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {linked.length === 0 ? (
            <li className="text-on-surface-variant">{tp("noOAuth")}</li>
          ) : (
            linked.map((item) => (
              <li key={item.provider} className="flex justify-between">
                <span className="capitalize">{item.provider.toLowerCase()}</span>
                <span className="text-on-surface-variant">
                  {new Date(item.createdAt).toLocaleDateString(locale)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("security")}</h2>
        <div className="mt-4 space-y-4">
          <div className="border-outline-variant/40 bg-surface-container-low rounded-xl border p-4">
            <h3 className="font-semibold">{tp("twoFactor")}</h3>
            <p className="text-on-surface-variant mt-1 text-sm">{tp("twoFactorDesc")}</p>
            <button
              type="button"
              disabled
              className="border-outline-variant mt-3 rounded-lg border px-4 py-2 text-sm font-medium opacity-60"
            >
              {tp("comingSoon")}
            </button>
          </div>
          <div className="border-outline-variant/40 bg-surface-container-low rounded-xl border p-4">
            <h3 className="font-semibold">{tp("apiKeys")}</h3>
            <p className="text-on-surface-variant mt-1 text-sm">{tp("apiKeysDesc")}</p>
            <button
              type="button"
              disabled
              className="border-outline-variant mt-3 rounded-lg border px-4 py-2 text-sm font-medium opacity-60"
            >
              {tp("comingSoon")}
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card rounded-lg p-6">
        <h2 className="font-jakarta text-xl font-semibold">{tp("session")}</h2>
        <button
          type="button"
          onClick={() => clearSession()}
          className="border-error/30 text-error hover:bg-error-container mt-4 rounded-xl border px-5 py-2.5 text-sm font-semibold"
        >
          {t("header.signOut")}
        </button>
      </section>
    </div>
  );
}
