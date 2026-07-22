# Vexira Host — Yol Haritası Durumu

## Tamamlanan (Backend + temel Frontend)

| Faz | İçerik | Backend | Frontend |
|-----|--------|---------|----------|
| **Faz 0** | Monorepo, auth, JWT, dashboard iskelet | ✅ | ✅ |
| **Faz 1** | OAuth, katalog, sepet | ✅ | ⚠️ temel |
| **Faz 2** | Domain arama, kayıt, DNS | ✅ | ⚠️ temel |
| **Faz 3** | Hosting paketleri, mock provisioning | ✅ | ⚠️ manuel create |
| **Faz 4** | VPS/dedicated (Proxmox mock) | ✅ | ⚠️ temel |
| **Faz 5** | Addon services (SSL, lisans…) | ✅ | ⚠️ temel |
| **Faz 6** | Ödeme, fatura, ticket, admin API | ✅ | ⚠️ admin tek sayfa |
| **i18n** | Landing + auth (EN/TR/RU/AZ) | — | ✅ landing |
| **Frontend F1** | Dashboard sidebar + ortak UI | — | ✅ |

---

## KALAN İŞLER

Detaylı checklist → **[FRONTEND-ROADMAP.md](./FRONTEND-ROADMAP.md#kalan-işler--özet)**

### Frontend fazları

| Faz | Odak | Durum |
|-----|------|-------|
| **F1** | Dashboard sidebar, ortak UI | ✅ Tamamlandı |
| **F2** | Müşteri paneli (hosting detay, sepet, sipariş) | ⏳ Bekliyor |
| **F3** | Admin panel (users, orders, tickets) | ⏳ Bekliyor |
| **F4** | Hosting sunucu + otomatik provision + panel SSO | ⏳ Bekliyor — **kritik** |
| **F5** | Admin plan/ürün CRUD | ⏳ Bekliyor |
| **F6** | Dashboard & admin i18n | ⏳ Bekliyor |
| **F7** | UX polish, E2E testler | ⏳ Bekliyor |

### F1 — Kalan (küçük)

- Domains, Servers, Orders, Invoices, Tickets, Cart, Account sayfalarında yeni UI bileşenlerine geçiş

### F4 — Kritik (WHMCS akışı)

**Backend**
- `HostingServer` modeli (IP, WHM user, şifre, varsayılan sunucu)
- Admin sunucu CRUD API
- Sipariş/ödeme sonrası otomatik hosting provision
- `GET /hosting/:id/panel-login` — cPanel SSO

**Frontend**
- Admin: sunucu ekleme/düzenleme formları
- Müşteri: Panel Giriş butonu, otomatik provision durumu

### Backend production (genel)

- Gerçek registrar, Proxmox, WHM/cPanel API
- Stripe / PayPal ödeme
- E-posta SMTP, invoice PDF
- Hosting suspend/unsuspend, VPS console
- Test coverage

---

## Sprint durumu

| Sprint | İçerik | Durum |
|--------|--------|-------|
| S1 | F1 — Dashboard shell + UI | ✅ |
| S2 | F4 backend — HostingServer + SSO | ✅ |
| S3 | F4 frontend — Admin sunucu + panel giriş | ✅ |
| S4 | F3 — Admin panel | ⏳ **Sırada** |
| S5 | F2 — Müşteri paneli | ⏳ |
| S6 | F5 + F6 — Plan CRUD + i18n | ⏳ |
| S7 | F7 — Test & deploy | ⏳ |

---

Detaylı mimari: [Architecture.md](./Architecture.md)  
Frontend plan: [FRONTEND-ROADMAP.md](./FRONTEND-ROADMAP.md)
