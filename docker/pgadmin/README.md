# pgAdmin (Docker)

Sunucu **elle eklenir** (otomatik `servers.json` bağlamıyoruz; başlangıç çökmelerini önlemek için).

1. `http://localhost:5050` — `admin@example.com` / `admin123`
2. **Register → Server**
3. **Connection** sekmesi:
   - **Host**: `postgres` (asla `localhost` değil — pgAdmin başka bir konteyner)
   - **Port**: `5432`
   - **Maintenance database**: `healthai`
   - **Username** / **Password**: `healthai` / `healthai`

Kaydet; sol ağaçta `healthai` → `Schemas` → `public` → tablolar.
