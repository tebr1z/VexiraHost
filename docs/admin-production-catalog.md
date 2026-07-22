# Production catalog checklist (admin)

Real product content is edited in the admin UI — no code deploy needed for copy/prices.

## Products

1. Open `/t4abriz/panel/products`
2. Edit each seed/demo product (or deactivate/delete and create new ones):
   - Name, description (real marketing text)
   - AZN / USD / EUR monthly & yearly prices
   - Category + hosting plan link for HOSTING items
   - Active = on only when ready to sell
3. Confirm public catalog pages show the updated names/prices

## Hosting (if selling shared hosting)

1. `/t4abriz/panel/hosting` — active server with working Plesk/credentials
2. Link each HOSTING product to a plan that has an **assigned active server**
3. Products without an active server stay hidden from the public menu

## Payments (System)

1. `/t4abriz/panel/system` → Payments = **Kapital Bank (live)**
2. Merchant username/password stay in server `.env` only (`KAPITAL_*`)
3. Production callback/return URLs must be public HTTPS when the site is live
4. If create-order returns **HTTP 520** from `e-commerce.kapitalbank.az`, the bank/Cloudflare is blocking or the origin is down — ask Kapital to whitelist your server IP and confirm the merchant is activated for Ecommerce API.

## Quick verify

- Checkout or invoice **Ödəniş edin** → browser opens `https://e-commerce.kapitalbank.az/...`
- After paid card → invoice status `PAID` and services provision
- Local connectivity script (no secrets printed): `node apps/backend/scripts/check-kapital-prod.js`
