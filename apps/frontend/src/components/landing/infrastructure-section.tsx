"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "./material-icon";

const MAP_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDBiyD3LGFepVnsatZ14ONWIiFOhWv8DmcRs5jWWoBWMp4H577JPlsiZsn-zpHh3Ni9_mAxkF6oXSo6cnQ4c_MFHg0Nbo2qMMJuSXB2GK-SrpeU-0Epjdcht0WnOdFuN5bT0IIm4X2-zfcFXzAWa3wRbpNAlTRPzI9p0zqJ89sbkpGwCTGf0fQOaUMXx8aO4w7n8O4NKNGAQ4_xYV2XMJN-2Owoe-nV_W6kwfXyIjGnM6rwy40kysjRA43_gdfHPSHsl5d-pq5yws9r";

export function InfrastructureSection(): React.ReactElement {
  const t = useTranslations("infra");

  return (
    <section className="apple-page py-20 sm:py-28" id="infrastructure">
      <div className="mx-auto max-w-container-max px-5 md:px-8">
        <div className="mb-12 text-center">
          <h2 className="apple-section-title">{t("networkTitle")}</h2>
          <p className="apple-section-subtitle mx-auto mt-4">{t("networkDesc")}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="apple-card overflow-hidden p-0">
            <div
              className="h-56 bg-cover bg-center sm:h-72"
              style={{ backgroundImage: `url('${MAP_IMAGE}')` }}
              role="img"
              aria-label={t("mapAlt")}
            />
            <div className="grid grid-cols-2 divide-x divide-[var(--separator)] border-t-[0.5px] border-[var(--separator)]">
              <div className="px-5 py-6 text-center">
                <p className="text-3xl font-semibold tracking-tight text-[var(--label)]">
                  99.99<span className="text-lg">%</span>
                </p>
                <p className="mt-1 text-xs text-[var(--label-tertiary)]">{t("uptimeSla")}</p>
              </div>
              <div className="px-5 py-6 text-center">
                <p className="text-3xl font-semibold tracking-tight text-[var(--label)]">
                  120<span className="text-lg">TB</span>
                </p>
                <p className="mt-1 text-xs text-[var(--label-tertiary)]">{t("coreBackbone")}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="apple-card flex flex-1 flex-col justify-between p-6 sm:p-8">
              <div>
                <MaterialIcon name="shield_lock" className="mb-4 text-[32px] text-[var(--accent)]" />
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
                  {t("guardTitle")}
                </h3>
                <p className="mt-2 text-[17px] leading-relaxed text-[var(--label-secondary)]">
                  {t("guardDesc")}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-[12px] bg-[var(--bg-secondary)] px-4 py-3">
                <div>
                  <p className="text-xs text-[var(--label-tertiary)]">{t("systemStatus")}</p>
                  <p className="font-semibold text-[var(--label)]">{t("secure")}</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
              </div>
            </div>

            <div className="apple-card flex items-start gap-4 p-6 sm:p-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--fill)]">
                <MaterialIcon name="speed" className="text-[24px] text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[var(--label)]">
                  {t("fasterTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--label-secondary)]">
                  {t("fasterDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
