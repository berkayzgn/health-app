# Health AI App — Güvenli Sunucu Kılavuzu

> **Bu kılavuz bir checklist ve kural seti olarak kullanılır.**  
> Geliştirme yaparken bu sayfadan bağımsız hareket edilmez.  
> Her madde tamamlandığında ✅ ile işaretlenir.

---

## Kural Özetleri (Asla İhlal Edilmemelidir)

| # | Kural |
|---|-------|
| K1 | HTTP üzerinden kişisel / sağlık / ödeme verisi **gönderilemez** |
| K2 | Kart numarası / CVV backend'e veya DB'ye **yazılamaz** — yalnızca Stripe ID |
| K3 | `postgres` ve `pgadmin` portları dışarıya **asla expose edilmez** |
| K4 | `.env` dosyaları git'e **commit edilmez** |
| K5 | AI API anahtarı mobil uygulamaya **gömülemez**; çağrı backend'den yapılır |
| K6 | Tüm ortamlarda `EXPO_PUBLIC_API_URL` **HTTPS** ile başlamalıdır (production) |
| K7 | SSH'a `root` ile **girilemez**; sadece key-based auth kullanılır |
| K8 | `pgAdmin` arayüzüne yalnızca **SSH tüneli** üzerinden erişilir |
| K9 | Sağlık verisi (`conditionTypes`, hastalık) DB'de **şifreli** tutulur |
| K10 | Rate limiting tüm public endpoint'lerde **aktif** olmalıdır |

---

## Mimari Hedef

```
[Mobil App]
     │ HTTPS (443)
     ▼
[Cloudflare] ── DDoS koruma, SSL terminate
     │
[nginx :443] ── rate limit, güvenlik başlıkları, reverse proxy
     │
     ├── /api/*    ──▶  [NestJS :3000] (127.0.0.1 bind, docker içi)
     │
     └── /pgadmin  ── SADECE localhost (SSH tüneli ile)

[PostgreSQL :5432] ── Yalnızca Docker iç ağı
[Redis :6379]      ── Yalnızca Docker iç ağı (rate limit / cache)

Dışarıya açık portlar: 443 (HTTPS), 2222 (SSH, custom)
```

---

## Geliştirme Aşaması

Sunucu kurulumu uygulama yayına alınmadan önce yapılır.  
Şu an **lokal geliştirme** yapılıyorsa aşağıdaki akış geçerlidir:

```
Lokal Geliştirme                   Yayın (Production)
────────────────────────────────   ────────────────────────────────
Backend  : http://localhost:3000   Backend  : https://api.domain.com
DB       : Docker localhost:5433   DB       : Docker (iç ağ, kapalı)
pgAdmin  : http://localhost:5050   pgAdmin  : SSH tüneli → localhost:5050
iOS Sim  : http://localhost:3000   iOS/And  : https://api.domain.com
```

**`.env` (lokal):**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
# Fiziksel cihaz için: http://192.168.1.X:3000
```

**Sunucu adımlarına geçiş zamanı:**
- Temel özellikler (auth, meals, scan) çalışıyor
- App Store / Play Store'a yaklaşılıyor
- Stripe / ödeme entegre edilecek

---

## Adımlar ve Durum

### ✅ / ⬜ Adım 1 — Domain ve Cloudflare

- [ ] Bir domain satın al (ör. `healthaiapp.com`)
- [ ] Cloudflare'e ekle → **DNS** → A kaydı: `api` → `165.245.209.17`, **Proxy: ON** (turuncu bulut)
- [ ] `EXPO_PUBLIC_API_URL=https://api.yourdomain.com` olarak güncelle

```bash
# Test
curl -v https://api.yourdomain.com/health
```

---

### ⬜ Adım 2 — Sunucu Sertleştirme

```bash
# 1. Root şifresini kilitle
sudo passwd -l root

# 2. SSH yapılandırması
sudo nano /etc/ssh/sshd_config
```

`/etc/ssh/sshd_config` içinde şunlar olmalı:

```
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
```

```bash
sudo systemctl restart sshd

# 3. Firewall — sadece 2222 ve 443 dışarıya
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp comment 'SSH'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw enable
sudo ufw status

# 4. fail2ban
sudo apt install fail2ban -y
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
# [sshd] altında: enabled = true, port = 2222, maxretry = 5
sudo systemctl enable fail2ban && sudo systemctl start fail2ban
```

**Kontrol:**

```bash
sudo ufw status verbose
sudo fail2ban-client status sshd
```

---

### ⬜ Adım 3 — nginx + SSL (Certbot)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Nginx temel config (domain ile)
sudo nano /etc/nginx/sites-available/healthai
```

```nginx
# /etc/nginx/sites-available/healthai

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL (certbot dolduracak)
    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;

    # Güvenlik başlıkları
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options            DENY                                  always;
    add_header X-Content-Type-Options     nosniff                               always;
    add_header Referrer-Policy            "no-referrer"                         always;

    # Fotoğraf upload limiti
    client_max_body_size 15M;

    location /api/ {
        limit_req zone=api_limit burst=15 nodelay;

        proxy_pass         http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
    }

    # pgAdmin — asla public değil
    location /pgadmin {
        deny all;
        return 403;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/healthai /etc/nginx/sites-enabled/
sudo nginx -t

# SSL sertifikası al
sudo certbot --nginx -d api.yourdomain.com
sudo systemctl reload nginx
```

**Kontrol:**

```bash
curl -I https://api.yourdomain.com/health
# HTTP/2 200 ve HSTS başlığı gelmeli
```

---

### ⬜ Adım 4 — Docker Compose (Production)

`docker-compose.prod.yml` ayrı dosya olarak tutulur. Portlar `127.0.0.1` ile bind edilir; dışarıya hiçbir şey açılmaz.

```yaml
# docker-compose.prod.yml
networks:
  healthai:
    driver: bridge

services:
  postgres:
    image: postgres:16-alpine
    container_name: health-ai-postgres
    restart: unless-stopped
    networks:
      - healthai
    # ❌ ports bloğu YOK — dışarıya açık değil
    environment:
      POSTGRES_USER:     ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB:       ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: health-ai-backend
    restart: unless-stopped
    networks:
      - healthai
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - ./backend/.env
    environment:
      NODE_ENV:     production
      PORT:         3000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
    ports:
      # Sadece localhost'a bind — nginx üzerinden erişilir
      - "127.0.0.1:3000:3000"

  pgadmin:
    image: dpage/pgadmin4:8.14
    container_name: health-ai-pgadmin
    restart: unless-stopped
    networks:
      - healthai
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      # Sadece localhost — SSH tüneli ile erişilir (K8 kuralı)
      - "127.0.0.1:5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL:    ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
      PGADMIN_CONFIG_SERVER_MODE: "False"
    volumes:
      - pgadmin_data:/var/lib/pgadmin

volumes:
  postgres_data:
  pgadmin_data:
```

```bash
# Çalıştırma
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d

# Durum
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

---

### ⬜ Adım 5 — pgAdmin SSH Tüneli

pgAdmin'e erişmek için:

```bash
# Kendi bilgisayarında çalıştır (sunucuda değil)
ssh -L 5050:127.0.0.1:5050 -p 2222 -N kullanici@165.245.209.17
```

Tarayıcıdan: `http://localhost:5050`  
Sunucu bağlantısı: `host=postgres`, `port=5432`, `db=healthai`

> pgAdmin URL'si nginx üzerinden asla public edilmez (K8 kuralı).

---

### ⬜ Adım 6 — Stripe Entegrasyonu

#### Kural (K2): Kart numarası backend'e **asla** gelmez.

**Akış:**

```
Kullanıcı → Stripe SDK (mobil) → Stripe sunucuları
                                        │
                             PaymentIntent ID / customer ID
                                        │
                          Backend: sadece bu ID'yi alır ve DB'ye yazar
```

**Backend `.env`'e eklenecekler:**

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Backend'de webhook doğrulama:**

```typescript
// Stripe webhook'u imza ile doğrulanmalı (K2)
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET,
);
```

**DB'de tutulacak:**

```
users tablosu:
  stripe_customer_id      VARCHAR  -- Stripe'tan gelen ID
  stripe_subscription_id  VARCHAR  -- Aktif abonelik ID
  subscription_status     VARCHAR  -- active | canceled | past_due
```

**DB'de TUTULMAYACAK:**

```
❌ card_number
❌ cvv
❌ expiry_date
❌ iban
```

---

### ⬜ Adım 7 — Sağlık Verisi Şifreleme (pgcrypto)

**Kural (K9):** `conditionTypes`, ilaç adları, tanı kodları şifreli saklanır.

```sql
-- PostgreSQL'de pgcrypto aktif et
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Şifreli alan örneği (Prisma ham SQL ile)
INSERT INTO user_medical_conditions (user_id, condition_encrypted)
VALUES (
  $1,
  pgp_sym_encrypt($2::text, current_setting('app.encryption_key'))
);

-- Okuma
SELECT pgp_sym_decrypt(condition_encrypted::bytea, current_setting('app.encryption_key'))
FROM user_medical_conditions WHERE user_id = $1;
```

**`app.encryption_key`** PostgreSQL session variable olarak backend başlangıcında set edilir; `.env`'den okunur ve git'e commit edilmez.

**Audit log tablosu:**

```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID         NOT NULL,  -- işlemi yapan kullanıcı/admin
  target_id   UUID,                   -- etkilenen kullanıcı
  action      VARCHAR(64)  NOT NULL,  -- READ_HEALTH_DATA | UPDATE_SUBSCRIPTION vb.
  ip_address  INET,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

### ⬜ Adım 8 — AI API Güvenli Akış

**Kural (K5):** Mobil uygulama AI API'ye doğrudan bağlanamaz.

```
[Mobil] → POST /api/meals/analyze  (fotoğraf binary / base64)
               │
               ├─ JWT doğrula
               ├─ Fotoğrafı geçici olarak al
               ├─ AWS Textract OCR + backend’de kural tabanlı eşleştirme
               ├─ Dönen metni kullanıcının hastalık tipine göre filtrele
               │    DB: user_medical_conditions → uyarı oluştur
               └─ Sonuç + uyarıları mobil'e dön
```

**Backend `.env`:**

```env
# Örnek: etiket taraması — yalnızca Textract (+ IAM’de textract:DetectDocumentText)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
```

Fotoğraf kalıcı olarak saklanacaksa → **Cloudflare R2** veya **AWS S3** kullan; sunucu diskinde tutma.

---

## Backend `.env` Tam Şablon

```env
# DB
DATABASE_URL=postgresql://healthai:GÜÇLÜ_ŞİFRE@postgres:5432/healthai?schema=public
POSTGRES_USER=healthai
POSTGRES_PASSWORD=GÜÇLÜ_ŞİFRE    # openssl rand -hex 32
POSTGRES_DB=healthai

# JWT
JWT_SECRET=                        # openssl rand -hex 64
JWT_EXPIRATION=7d

# App
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://api.yourdomain.com

# Şifreleme
ENCRYPTION_KEY=                    # openssl rand -hex 32

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS (Textract — etiket OCR)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1

# pgAdmin
PGADMIN_EMAIL=admin@yourdomain.com
PGADMIN_PASSWORD=GÜÇLÜ_ŞİFRE
```

---

## Periyodik Kontroller

| Sıklık | Kontrol |
|--------|---------|
| Haftalık | `docker compose -f docker-compose.prod.yml ps` — tüm servisler `Up` |
| Haftalık | `sudo fail2ban-client status sshd` — ban listesini gözden geçir |
| Aylık | `sudo certbot renew --dry-run` — SSL sertifikası yenileme testi |
| Aylık | `docker image pull` — base image güncellemeleri |
| Aylık | `npm audit` — backend bağımlılık güvenlik taraması |
| 3 Ayda bir | DB yedeği al ve restore testini yap |

---

## Hazır Dosyalar

Sunucuya geçince kopyalanmak üzere hazır yapılandırmalar repo'da mevcut:

| Dosya | Açıklama |
|-------|----------|
| `docker-compose.prod.yml` | Tüm portlar 127.0.0.1'e bind, pgAdmin dahil |
| `server-config/nginx/healthai.conf` | nginx reverse proxy + rate limit + güvenlik başlıkları |
| `server-config/fail2ban/jail.local` | SSH brute force koruması |

```bash
# Sunucuya kopyalama (domain hazır olunca)
scp -P 2222 server-config/nginx/healthai.conf   user@165.245.209.17:/etc/nginx/sites-available/healthai
scp -P 2222 server-config/fail2ban/jail.local   user@165.245.209.17:/etc/fail2ban/jail.local
scp -P 2222 docker-compose.prod.yml             user@165.245.209.17:~/health-ai-app/
```

---

## İlgili Dökümanlar

- [System Guide](./system-guide.md)
- [Backend Kılavuzu](./backend-kilavuzu.md)
- [Server Config README](../server-config/README.md)
