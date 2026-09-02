"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LoadingSkeleton, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { PhoneCountryField } from "@/features/auth/components/phone-country-field";
import { signOutToHome } from "@/features/auth/lib/sign-out";
import {
  cancelTotpSetupRequest,
  confirmTotpRequest,
  disableTotpRequest,
  fetchProfile,
  isEmailTwoFactorSetupChallenge,
  requestPhoneVerification,
  setupTotpRequest,
  updateBillingAddress,
  updateEmailTwoFactor,
  updatePhone,
  verifyEmailTwoFactor,
  verifyPhone,
  type TotpSetupResponse,
} from "@/features/auth/services/auth.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { composePhoneE164, findDialByIso2, splitPhoneE164 } from "@/lib/phone/country-dial-codes";
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

type AccountTab = "profile" | "billing" | "security";

export default function AccountPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.account");
  const tc = useTranslations("dashboard.common");
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setSession = useAuthStore((s) => s.setSession);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const [tab, setTab] = useState<AccountTab>("profile");
  const [linked, setLinked] = useState<{ provider: string; createdAt: string }[]>([]);
  const [billingForm, setBillingForm] = useState(EMPTY_BILLING);
  const [billingSaving, setBillingSaving] = useState(false);
  const [phoneDialIso2, setPhoneDialIso2] = useState("AZ");
  const [phoneNational, setPhoneNational] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneRequesting, setPhoneRequesting] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneChallenge, setPhoneChallenge] = useState<{
    challengeId: string;
    phoneHint: string;
  } | null>(null);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeError, setPhoneCodeError] = useState<string | null>(null);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{
    challengeId: string;
    emailHint: string;
    desiredEnabled: boolean;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorCodeError, setTwoFactorCodeError] = useState<string | null>(null);
  const [twoFactorVerifying, setTwoFactorVerifying] = useState(false);
  const [totpSetup, setTotpSetup] = useState<TotpSetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpCodeError, setTotpCodeError] = useState<string | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpDisableMode, setTotpDisableMode] = useState(false);
  const tcCart = useTranslations("cart");

  const tabs: { id: AccountTab; label: string }[] = [
    { id: "profile", label: tp("tabs.profile") },
    { id: "billing", label: tp("tabs.billing") },
    { id: "security", label: tp("tabs.security") },
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/linked-providers`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
    })
      .then((r) => r.json())
      .then((body) => setLinked(body.data ?? []))
      .catch(() => undefined);
  }, []);

  const applyPhoneFromProfile = (profile: {
    phone?: string | null;
    whatsappNotificationsEnabled?: boolean;
  }) => {
    const split = splitPhoneE164(profile.phone);
    setPhoneDialIso2(split.iso2);
    setPhoneNational(split.national);
    setWhatsappEnabled(profile.whatsappNotificationsEnabled ?? true);
  };

  useEffect(() => {
    if (user?.billingAddress) {
      setBillingForm(user.billingAddress);
    }
    applyPhoneFromProfile(user ?? {});
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
          applyPhoneFromProfile(profile);
          setFromUser({
            preferredCurrency: profile.preferredCurrency,
            billingPeriod: profile.billingPeriod,
            currencyLocked: false,
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

  const handleSaveWhatsappPref = async () => {
    setPhoneSaving(true);
    try {
      const profile = await updatePhone({ whatsappNotificationsEnabled: whatsappEnabled });
      if (accessToken && refreshToken) {
        setSession({
          user: profile,
          tokens: { accessToken, refreshToken, expiresIn: "15m" },
        });
      }
      toast(tp("phonePrefsSaved"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("phoneSaveFailed")), "error");
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleRequestPhoneCode = async () => {
    const dial = findDialByIso2(phoneDialIso2)?.dial ?? "994";
    const composed = composePhoneE164(dial, phoneNational);
    if (!composed) {
      toast(tp("phoneInvalid"), "error");
      return;
    }
    setPhoneRequesting(true);
    setPhoneCodeError(null);
    try {
      const challenge = await requestPhoneVerification({
        phone: composed,
        whatsappNotificationsEnabled: whatsappEnabled,
      });
      setPhoneChallenge({
        challengeId: challenge.challengeId,
        phoneHint: challenge.phoneHint,
      });
      setPhoneCode("");
      toast(tp("phoneCodeSent"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("phoneCodeSendFailed")), "error");
    } finally {
      setPhoneRequesting(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneChallenge) return;
    setPhoneVerifying(true);
    setPhoneCodeError(null);
    try {
      const profile = await verifyPhone({
        challengeId: phoneChallenge.challengeId,
        code: phoneCode.trim(),
      });
      if (accessToken && refreshToken) {
        setSession({
          user: profile,
          tokens: { accessToken, refreshToken, expiresIn: "15m" },
        });
      }
      applyPhoneFromProfile(profile);
      setPhoneChallenge(null);
      setPhoneCode("");
      toast(tp("phoneVerified"), "success");
    } catch {
      setPhoneCodeError(tp("phoneCodeInvalid"));
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleRemovePhone = async () => {
    setPhoneSaving(true);
    try {
      const profile = await updatePhone({ removePhone: true });
      if (accessToken && refreshToken) {
        setSession({
          user: profile,
          tokens: { accessToken, refreshToken, expiresIn: "15m" },
        });
      }
      applyPhoneFromProfile(profile);
      setPhoneChallenge(null);
      setPhoneCode("");
      toast(tp("phoneRemoved"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("phoneSaveFailed")), "error");
    } finally {
      setPhoneSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-busy>
        <LoadingSkeleton className="h-10 w-48" />
        <LoadingSkeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.account") },
        ]}
      />

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={tp("title")}
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--fill-secondary)] text-[var(--label-secondary)] hover:bg-[var(--fill)] hover:text-[var(--label)]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" ? (
        <div className="space-y-4">
          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("profile")}
            </h2>
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

          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("linkedAccounts")}
            </h2>
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

          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("session")}
            </h2>
            <button
              type="button"
              onClick={() => void signOutToHome()}
              className="border-error/30 text-error hover:bg-error-container mt-4 rounded-xl border px-5 py-2.5 text-sm font-semibold"
            >
              {t("header.signOut")}
            </button>
          </section>
        </div>
      ) : null}

      {tab === "billing" ? (
        <div className="space-y-4">
          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("currency")}
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">{tp("currencyDesc")}</p>
            <div className="mt-4">
              <CurrencySwitcher variant="segmented" />
            </div>
            <p className="text-on-surface-variant mt-2 text-xs">{tp("currencyChangeAnytime")}</p>
          </section>

          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("phoneTitle")}
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">{tp("phoneDescription")}</p>

            {user.phone && user.phoneVerified ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                <span className="font-medium">+{user.phone}</span>
                <span className="text-xs uppercase tracking-wide">{tp("phoneVerifiedBadge")}</span>
              </p>
            ) : user.phone ? (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                {tp("phoneUnverifiedHint")}
              </p>
            ) : null}

            <div className="mt-4">
              <PhoneCountryField
                label={tp("phoneNumberLabel")}
                dialIso2={phoneDialIso2}
                nationalNumber={phoneNational}
                onDialIso2Change={setPhoneDialIso2}
                onNationalNumberChange={setPhoneNational}
                disabled={phoneRequesting || phoneVerifying}
              />
            </div>

            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(event) => setWhatsappEnabled(event.target.checked)}
                disabled={phoneVerifying}
                className="mt-1"
              />
              <span>{tp("whatsappReminders")}</span>
            </label>
            <p className="text-on-surface-variant mt-1 text-xs">{tp("phoneVerifyRequired")}</p>

            {!phoneChallenge ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={phoneRequesting || !phoneNational.trim()}
                  onClick={() => void handleRequestPhoneCode()}
                  className="dashboard-btn-primary disabled:opacity-60"
                >
                  {phoneRequesting ? tp("phoneCodeSending") : tp("phoneSendCode")}
                </button>
                {user.phone ? (
                  <button
                    type="button"
                    disabled={phoneSaving}
                    onClick={() => void handleRemovePhone()}
                    className="dashboard-btn-secondary disabled:opacity-60"
                  >
                    {tp("phoneRemove")}
                  </button>
                ) : null}
                {user.phoneVerified ? (
                  <button
                    type="button"
                    disabled={phoneSaving}
                    onClick={() => void handleSaveWhatsappPref()}
                    className="dashboard-btn-secondary disabled:opacity-60"
                  >
                    {phoneSaving ? tp("saving") : tp("phoneSavePrefs")}
                  </button>
                ) : null}
              </div>
            ) : (
              <form
                className="mt-4 space-y-3 rounded-xl border border-[var(--separator)] bg-[var(--fill-secondary)] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleVerifyPhone();
                }}
              >
                <p className="text-sm text-[var(--label-secondary)]">
                  {tp("phoneCodeHint", { phone: phoneChallenge.phoneHint })}
                </p>
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(event) => {
                      setPhoneCodeError(null);
                      setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    }}
                    placeholder={tp("phoneCodePlaceholder")}
                    aria-invalid={Boolean(phoneCodeError)}
                    className={
                      phoneCodeError
                        ? "dashboard-input border-[var(--danger)] px-4 text-sm"
                        : "dashboard-input px-4 text-sm"
                    }
                  />
                  {phoneCodeError ? (
                    <p className="mt-1.5 text-sm text-[var(--danger)]">{phoneCodeError}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={phoneVerifying || phoneCode.trim().length !== 6}
                    className="dashboard-btn-primary disabled:opacity-60"
                  >
                    {phoneVerifying ? tp("phoneVerifying") : tp("phoneConfirm")}
                  </button>
                  <button
                    type="button"
                    disabled={phoneVerifying}
                    onClick={() => {
                      setPhoneChallenge(null);
                      setPhoneCode("");
                      setPhoneCodeError(null);
                    }}
                    className="dashboard-btn-secondary"
                  >
                    {tp("phoneCancel")}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("billingAddress")}
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm">{tp("billingAddressDesc")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  {tcCart("billingFullName")}
                </label>
                <input
                  value={billingForm.fullName}
                  onChange={(e) => setBillingForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="dashboard-input px-4 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{tcCart("billingLine1")}</label>
                <input
                  value={billingForm.line1}
                  onChange={(e) => setBillingForm((p) => ({ ...p, line1: e.target.value }))}
                  className="dashboard-input px-4 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{tcCart("billingCity")}</label>
                <input
                  value={billingForm.city}
                  onChange={(e) => setBillingForm((p) => ({ ...p, city: e.target.value }))}
                  className="dashboard-input px-4 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{tcCart("billingRegion")}</label>
                <input
                  value={billingForm.region}
                  onChange={(e) => setBillingForm((p) => ({ ...p, region: e.target.value }))}
                  className="dashboard-input px-4 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {tcCart("billingPostalCode")}
                </label>
                <input
                  value={billingForm.postalCode}
                  onChange={(e) => setBillingForm((p) => ({ ...p, postalCode: e.target.value }))}
                  className="dashboard-input px-4 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{tcCart("billingCountry")}</label>
                <input
                  value={billingForm.country}
                  onChange={(e) => setBillingForm((p) => ({ ...p, country: e.target.value }))}
                  className="dashboard-input px-4 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={billingSaving}
              onClick={handleSaveBilling}
              className="dashboard-btn-primary mt-4 disabled:opacity-60"
            >
              {billingSaving ? tp("billingSaving") : tp("billingSave")}
            </button>
          </section>
        </div>
      ) : null}

      {tab === "security" ? (
        <div className="space-y-4">
          <section className="dashboard-section-card p-6">
            <h2 className="font-jakarta text-xl font-bold tracking-tight text-[var(--label-primary)]">
              {tp("security")}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-[var(--separator)] bg-[var(--fill-secondary)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{tp("twoFactor")}</h3>
                    <p className="text-on-surface-variant mt-1 text-sm">{tp("twoFactorDesc")}</p>
                    {!user?.emailVerified ? (
                      <p className="mt-2 text-sm text-[var(--danger)]">
                        {tp("twoFactorNeedEmail")}
                      </p>
                    ) : null}
                  </div>
                  {!twoFactorChallenge ? (
                    <button
                      type="button"
                      disabled={twoFactorSaving || !user?.emailVerified}
                      onClick={async () => {
                        if (!accessToken || !refreshToken || !user) return;
                        const next = !(user.emailTwoFactorEnabled ?? false);
                        setTwoFactorSaving(true);
                        try {
                          const result = await updateEmailTwoFactor(next);
                          if (isEmailTwoFactorSetupChallenge(result)) {
                            setTwoFactorChallenge({
                              challengeId: result.challengeId,
                              emailHint: result.emailHint,
                              desiredEnabled: result.desiredEnabled,
                            });
                            setTwoFactorCode("");
                            toast(tp("twoFactorCodeSent"), "success");
                            return;
                          }
                          setSession({
                            user: result,
                            tokens: { accessToken, refreshToken, expiresIn: "15m" },
                          });
                          toast(next ? tp("twoFactorEnabled") : tp("twoFactorDisabled"), "success");
                        } catch (err) {
                          const message =
                            err && typeof err === "object" && "error" in err
                              ? (err as { error?: { message?: string } }).error?.message
                              : tp("twoFactorFailed");
                          toast(message ?? tp("twoFactorFailed"), "error");
                        } finally {
                          setTwoFactorSaving(false);
                        }
                      }}
                      className={
                        user?.emailTwoFactorEnabled
                          ? "dashboard-btn-secondary shrink-0"
                          : "dashboard-btn-primary shrink-0"
                      }
                    >
                      {twoFactorSaving
                        ? tp("twoFactorSaving")
                        : user?.emailTwoFactorEnabled
                          ? tp("twoFactorDisable")
                          : tp("twoFactorEnable")}
                    </button>
                  ) : null}
                </div>

                {twoFactorChallenge ? (
                  <form
                    className="mt-4 space-y-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!accessToken || !refreshToken || !twoFactorChallenge) return;
                      setTwoFactorVerifying(true);
                      setTwoFactorCodeError(null);
                      try {
                        const profile = await verifyEmailTwoFactor({
                          challengeId: twoFactorChallenge.challengeId,
                          code: twoFactorCode.trim(),
                        });
                        setSession({
                          user: profile,
                          tokens: { accessToken, refreshToken, expiresIn: "15m" },
                        });
                        toast(
                          twoFactorChallenge.desiredEnabled
                            ? tp("twoFactorEnabled")
                            : tp("twoFactorDisabled"),
                          "success",
                        );
                        setTwoFactorChallenge(null);
                        setTwoFactorCode("");
                        setTwoFactorCodeError(null);
                      } catch {
                        setTwoFactorCodeError(tp("twoFactorCodeInvalid"));
                      } finally {
                        setTwoFactorVerifying(false);
                      }
                    }}
                  >
                    <p className="text-sm text-[var(--label-secondary)]">
                      {tp("twoFactorCodeHint", { email: twoFactorChallenge.emailHint })}
                    </p>
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(event) => {
                          setTwoFactorCodeError(null);
                          setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        }}
                        placeholder={tp("twoFactorCodePlaceholder")}
                        aria-invalid={Boolean(twoFactorCodeError)}
                        className={
                          twoFactorCodeError
                            ? "h-11 w-full rounded-xl border border-[var(--danger)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--danger)]"
                            : "h-11 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--accent)]"
                        }
                      />
                      {twoFactorCodeError ? (
                        <p className="mt-1.5 text-sm text-[var(--danger)]">{twoFactorCodeError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={twoFactorVerifying || twoFactorCode.trim().length !== 6}
                        className="dashboard-btn-primary disabled:opacity-60"
                      >
                        {twoFactorVerifying ? tp("twoFactorVerifying") : tp("twoFactorConfirm")}
                      </button>
                      <button
                        type="button"
                        disabled={twoFactorVerifying}
                        onClick={() => {
                          setTwoFactorChallenge(null);
                          setTwoFactorCode("");
                          setTwoFactorCodeError(null);
                        }}
                        className="dashboard-btn-secondary"
                      >
                        {tp("twoFactorCancel")}
                      </button>
                    </div>
                  </form>
                ) : null}

                {user?.emailTwoFactorEnabled && !twoFactorChallenge ? (
                  <p className="mt-3 text-sm font-medium text-[var(--success)]">
                    {tp("twoFactorOn")}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-[var(--separator)] bg-[var(--fill-secondary)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{tp("totpTitle")}</h3>
                    <p className="text-on-surface-variant mt-1 text-sm">{tp("totpDesc")}</p>
                  </div>
                  {!totpSetup && !totpDisableMode ? (
                    <button
                      type="button"
                      disabled={totpBusy}
                      onClick={async () => {
                        if (!accessToken || !refreshToken || !user) return;
                        setTotpBusy(true);
                        try {
                          if (user.totpEnabled) {
                            setTotpDisableMode(true);
                            setTotpCode("");
                            setTotpCodeError(null);
                            return;
                          }
                          const setup = await setupTotpRequest();
                          setTotpSetup(setup);
                          setTotpCode("");
                          setTotpCodeError(null);
                        } catch (err) {
                          const message =
                            err && typeof err === "object" && "error" in err
                              ? (err as { error?: { message?: string } }).error?.message
                              : tp("totpFailed");
                          toast(message ?? tp("totpFailed"), "error");
                        } finally {
                          setTotpBusy(false);
                        }
                      }}
                      className={
                        user?.totpEnabled
                          ? "dashboard-btn-secondary shrink-0"
                          : "dashboard-btn-primary shrink-0"
                      }
                    >
                      {totpBusy
                        ? tp("totpWorking")
                        : user?.totpEnabled
                          ? tp("totpDisable")
                          : tp("totpEnable")}
                    </button>
                  ) : null}
                </div>

                {totpSetup ? (
                  <form
                    className="mt-4 space-y-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!accessToken || !refreshToken) return;
                      setTotpBusy(true);
                      setTotpCodeError(null);
                      try {
                        const profile = await confirmTotpRequest(totpCode.trim());
                        setSession({
                          user: profile,
                          tokens: { accessToken, refreshToken, expiresIn: "15m" },
                        });
                        setTotpSetup(null);
                        setTotpCode("");
                        setTotpCodeError(null);
                        toast(tp("totpEnabled"), "success");
                      } catch {
                        setTotpCodeError(tp("totpCodeInvalid"));
                      } finally {
                        setTotpBusy(false);
                      }
                    }}
                  >
                    <p className="text-sm text-[var(--label-secondary)]">{tp("totpScanHint")}</p>
                    <div className="flex justify-center rounded-xl bg-white p-4">
                      <img
                        src={totpSetup.qrCodeDataUrl}
                        alt={tp("totpQrAlt")}
                        width={200}
                        height={200}
                        className="h-[200px] w-[200px]"
                      />
                    </div>
                    <p className="text-center text-xs text-[var(--label-tertiary)]">
                      {tp("totpManualHint")}
                    </p>
                    <code className="block select-all break-all rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-center text-sm tracking-wider text-[var(--label)]">
                      {totpSetup.secret}
                    </code>
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={totpCode}
                        onChange={(event) => {
                          setTotpCodeError(null);
                          setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        }}
                        placeholder={tp("totpCodePlaceholder")}
                        aria-invalid={Boolean(totpCodeError)}
                        className={
                          totpCodeError
                            ? "h-11 w-full rounded-xl border border-[var(--danger)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--danger)]"
                            : "h-11 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--accent)]"
                        }
                      />
                      {totpCodeError ? (
                        <p className="mt-1.5 text-sm text-[var(--danger)]">{totpCodeError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={totpBusy || totpCode.trim().length !== 6}
                        className="dashboard-btn-primary disabled:opacity-60"
                      >
                        {totpBusy ? tp("totpWorking") : tp("totpConfirm")}
                      </button>
                      <button
                        type="button"
                        disabled={totpBusy}
                        onClick={async () => {
                          if (!accessToken || !refreshToken) return;
                          setTotpBusy(true);
                          try {
                            const profile = await cancelTotpSetupRequest();
                            setSession({
                              user: profile,
                              tokens: { accessToken, refreshToken, expiresIn: "15m" },
                            });
                            setTotpSetup(null);
                            setTotpCode("");
                            setTotpCodeError(null);
                          } catch {
                            setTotpSetup(null);
                            setTotpCode("");
                            setTotpCodeError(null);
                          } finally {
                            setTotpBusy(false);
                          }
                        }}
                        className="dashboard-btn-secondary"
                      >
                        {tp("totpCancel")}
                      </button>
                    </div>
                  </form>
                ) : null}

                {totpDisableMode ? (
                  <form
                    className="mt-4 space-y-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!accessToken || !refreshToken) return;
                      setTotpBusy(true);
                      setTotpCodeError(null);
                      try {
                        const profile = await disableTotpRequest(totpCode.trim());
                        setSession({
                          user: profile,
                          tokens: { accessToken, refreshToken, expiresIn: "15m" },
                        });
                        setTotpDisableMode(false);
                        setTotpCode("");
                        setTotpCodeError(null);
                        toast(tp("totpDisabled"), "success");
                      } catch {
                        setTotpCodeError(tp("totpCodeInvalid"));
                      } finally {
                        setTotpBusy(false);
                      }
                    }}
                  >
                    <p className="text-sm text-[var(--label-secondary)]">{tp("totpDisableHint")}</p>
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={totpCode}
                        onChange={(event) => {
                          setTotpCodeError(null);
                          setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        }}
                        placeholder={tp("totpCodePlaceholder")}
                        aria-invalid={Boolean(totpCodeError)}
                        className={
                          totpCodeError
                            ? "h-11 w-full rounded-xl border border-[var(--danger)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--danger)]"
                            : "h-11 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 text-[var(--label)] outline-none focus:border-[var(--accent)]"
                        }
                      />
                      {totpCodeError ? (
                        <p className="mt-1.5 text-sm text-[var(--danger)]">{totpCodeError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={totpBusy || totpCode.trim().length !== 6}
                        className="dashboard-btn-primary disabled:opacity-60"
                      >
                        {totpBusy ? tp("totpWorking") : tp("totpConfirmDisable")}
                      </button>
                      <button
                        type="button"
                        disabled={totpBusy}
                        onClick={() => {
                          setTotpDisableMode(false);
                          setTotpCode("");
                          setTotpCodeError(null);
                        }}
                        className="dashboard-btn-secondary"
                      >
                        {tp("totpCancel")}
                      </button>
                    </div>
                  </form>
                ) : null}

                {user?.totpEnabled && !totpSetup && !totpDisableMode ? (
                  <p className="mt-3 text-sm font-medium text-[var(--success)]">{tp("totpOn")}</p>
                ) : null}
              </div>

              <div className="rounded-xl border border-[var(--separator)] bg-[var(--fill-secondary)] p-4">
                <h3 className="font-semibold">{tp("apiKeys")}</h3>
                <p className="text-on-surface-variant mt-1 text-sm">{tp("apiKeysDesc")}</p>
                <button type="button" disabled className="dashboard-btn-secondary mt-3 opacity-60">
                  {tp("comingSoon")}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
