# server-config

Sunucuya kopyalanacak hazır yapılandırma dosyaları.

**Kılavuz:** [docs/guvenli-sunucu-kilavuzu.md](../docs/guvenli-sunucu-kilavuzu.md)

## Dosyalar

| Dosya | Sunucudaki Hedef Yol |
|-------|----------------------|
| `nginx/healthai.conf` | `/etc/nginx/sites-available/healthai` |
| `fail2ban/jail.local` | `/etc/fail2ban/jail.local` |

## Sunucuya Kopyalama

```bash
# nginx config
scp -P 2222 server-config/nginx/healthai.conf user@165.245.209.17:/etc/nginx/sites-available/healthai

# fail2ban config
scp -P 2222 server-config/fail2ban/jail.local user@165.245.209.17:/etc/fail2ban/jail.local
```

> `api.yourdomain.com` → kendi domain adresinizle değiştirin.
