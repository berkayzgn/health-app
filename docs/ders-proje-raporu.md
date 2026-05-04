# Luminous Health — Ders Projesi Teknik Raporu

Bu belge, **sağlık profiline göre ambalaj/yemek görüntüsü analizi** yapan mobil uygulama ve arka uç sisteminin; ders kapsamında teslim edilecek rapor başlıklarıyla özetlenmiş halidir. Tüm teknik ifadeler kod tabanıyla uyumludur (`health-ai-app` monorepo).

---

## 1. Uygulamanın amacı

Uygulama, kullanıcıların **kayıtlı hastalık ve alerji profilleri** ile **ürün etiketi veya tabak fotoğrafı** arasında bilgi köprüsü kurmayı hedefler:

- Görüntüden **içerik listesi, ürün başlığı ve (mümkünse) besin özetleri** çıkarılması.
- Bu içeriklerin, kullanıcıya özel **tetikleyici sözlüğü** ile eşleştirilerek **güvenli / dikkat / kaçın** düzeyinde sınıflandırılması.
- İsteğe bağlı olarak **tüketim kaydı** ile günlük besin toplamları ve kural tabanlı **uyarıların** üretilmesi.

**Önemli sınırlama:** Uygulama tıbbi tanı veya tedavi önerisi sunmaz; eğitim ve farkındalık amaçlı bir yardımcı araçtır. Kritik kararlarda mutlaka uzman görüşü gereklidir.

---

## 2. Kullanıcı senaryosu (özet akış)

| Adım | Aktör          | Olay                                                                                                                                    |
| ---- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Yeni kullanıcı | E-posta/şifre ile kayıt veya giriş (JWT oturumu).                                                                                       |
| 2    | Kullanıcı      | Onboarding / profil: hastalık ve alerji tiplerini katalogdan seçer.                                                                     |
| 3    | Kullanıcı      | Ana ekrandan tarama başlatır; kamera veya galeriden görüntü seçer (`label` / `meal` / `auto`).                                          |
| 4    | Sistem         | Kota kontrolü (abonelik planına göre günlük tarama limiti).                                                                             |
| 5    | Backend        | Görüntüyü işler, **Google Gemini Vision** ile yapılandırılmış JSON çıktı alır, içerik satırlarını profil tetikleyicileriyle eşleştirir. |
| 6    | Kullanıcı      | Analiz sonucunu okur; uygunsa **porsiyon** ile “tükettim” işaretler.                                                                    |
| 7    | Sistem         | Günlük özet ve kural motoru (ör. eşik aşımı) ile dashboard metrikleri güncellenir.                                                      |
| 8    | Kullanıcı      | Geçmiş taramaları listeleyebilir, detayına gidebilir; ayarlardan dil/tema/destraktif işlemlere erişir.                                  |

Bu senaryo, **tek kullanıcılı** mobil istemci + **çok kiracılı olmayan** API modeliyle özetlenmiştir.

---

## 3. Kullanıcı etkinlik raporu (sistemde kayıt altına alınan veriler)

Raporlama veya analiz için sistemde tutulabilecek **etkinlik/veri öğeleri**:

| Veri             | Kaynak (Prisma)               | Açıklama                                                                                                                                        |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Kimlik / profil  | `User`                        | E-posta, isim, oluşturma güncelleme zamanları, abonelik planı.                                                                                  |
| Seçilen koşullar | `UserMedicalCondition`        | Kullanıcı–tıbbi koşul çoklu ilişkisi.                                                                                                           |
| Tarama geçmişi   | `ScanHistory`                 | Ürün başlığı, ham içerik satırları, eşleşen tetikleyiciler, güvenlik etiketi, tarama zamanı, opsiyonel `resultSnapshot`, besin başına değerler. |
| Tüketim          | `ConsumptionLog`              | Hangi tarama, hangi yerel gün, porsiyon, ölçeklenmiş besinler.                                                                                  |
| Kota kullanımı   | `scan_history` üzerinde sorgu | Kullanıcının **IANA timezone**’una göre yerel gün içindeki tarama sayısı (`ScanQuotaService`).                                                  |

Ders raporunda “kullanıcı etkinlik raporu” bu tablolar üzerinden **SQL/BI** veya basit **admin export** ile üretilebilir; ürün içinde ayrı bir “PDF etkinlik raporu” modülü tanımlanmamıştır, fakat veri modeli buna uygundur.

---

## 4. Paket tipleri, kullanım hakları ve ücretler

### 4.1 Plan kimlikleri ve günlük tarama limiti

Backend `plan-limits.ts` ve mobil `subscriptionPlans.ts` ile **aynı** mantık kullanılır:

| Plan        | Günlük `POST /label-scan` limiti |
| ----------- | -------------------------------- |
| **starter** | 5 tarama / gün                   |
| **plus**    | 15 tarama / gün                  |
| **pro**     | Sınırsız (`null`)                |

Gün sayımı, kullanıcının gönderdiği **timezone** (ör. `Europe/Istanbul`) ile `scan_history.scannedAt` üzerinde **PostgreSQL** tarih dönüşümüyle yapılır; böylece “gece yarısı” kullanıcı yerel saatine göre belirlenir.

### 4.2 Arayüzde gösterilen fiyatlandırma (i18n)

`src/locales/en.json` içindeki ödeme kartları metinleri (örnek — gerçek ödeme entegrasyonu projeye göre değişebilir):

| Plan    | Metin özeti                                           |
| ------- | ----------------------------------------------------- |
| Starter | “Free Plan”, günlük 5 tarama, 3 günlük deneme vurgusu |
| Plus    | **$2.99/ay** (örnek), günlük 15 tarama                |
| Pro     | **$5.99/ay** (örnek), sınırsız tarama                 |

**Not:** Store (App Store / Play) faturalandırması bu raporun kapsamı dışında tutulabilir; kodda plan alanı `User.subscriptionPlan` string’i ile tutulur.

---

## 5. Kullanılan teknolojiler ve genel mimari

### 5.1 Mobil istemci

- **Expo** + **React Native**
- **Expo Router** (dosya tabanlı yönlendirme)
- **NativeWind** (Tailwind benzeri stiller)
- **Zustand** (oturum, tema, profil önbelleği)
- **react-i18next** (TR/EN)
- **TypeScript**

### 5.2 Backend

- **NestJS** (REST API, modüler yapı)
- **Prisma ORM** + **PostgreSQL**
- **JWT** (Passport) ile korunan uçlar
- **bcrypt** (şifre hash)
- **Google Generative AI SDK** + **Sharp** (görüntü ön işleme)
- **Joi** (ortam değişkeni doğrulama)
- **Docker** (dağıtım imajı)

### 5.3 Monorepo düzeni

```
Kök: Expo uygulaması (src/), abc.json, docker-compose, Dockerfile
backend/: NestJS API, prisma/, seed
```

Detaylı klasör özeti için `docs/ARCHITECTURE.md` dosyasına bakınız.

---

## 6. API ve yapay zekâ entegrasyonu

### 6.1 Tipik istek akışı (etiket tarama)

1. İstemci, Base64 görüntü + `locale` (`tr` | `en`) + `scanKind` + `timezone` ile `POST /label-scan` gönderir.
2. **`ScanQuotaService`**: Günlük limit aşılmışsa HTTP 429 benzeri reddedilir.
3. **`GeminiVisionService`**: Modele yapılandırılmış çıktı (schema) ile prompt gönderilir; model zinciri (`GEMINI_MODEL`, yedek modeller, 503/404 dayanıklılığı) ile çalışır.
4. **`LabelScanService`**: Çıkarılan içerik listesi kullanıcı koşullarıyla eşleştirilir, güvenlik etiketi ve kayıt (`ScanHistory`) üretilir.
5. JSON yanıt mobilde liste ve detay ekranlarında gösterilir.

### 6.2 Yapay zekânın rolü

- **Görsel çözümleme:** OCR yerine multimodal LLM ile etiket/yemek fotoğrafından yapısal veri.
- **Şema uyumu:** Sunucunun beklediği alanlar (ürün adı, içerik dizisi, özet vb.) için **response schema** kullanımı hatayı azaltır.

### 6.3 API güvenliği ve operasyon

- `GET /health`: İşlem + veritabanı ping (üretim sağlık kontrolü).
- **CORS:** `ALLOWED_ORIGINS`; mobil doğrudan API çağırdığında geniş origin zorunlu değildir.
- İstemci **timeout:** Geliştirme ve üretim için `api.ts` içinde yapılandırılmış istek süre sınırları (uzun tarama için ayrı uzun timeout `labelScanService` tarafında da kullanılabilir).

---

## 7. Kullanıcılara öneri ve kısıtların nasıl belirlendiği

Sistem **üç katmanlı** bir ayrıma sahiptir:

1. **Tarama anı (scan scope)**
   - `MedicalCondition.triggerFoods`: Koşula bağlı **anahtar token** listesi (ör. `sugar`, `gluten`).
   - `abc.json` tabanlı **filter glossary** (`filter_alias_en`): Her token için İngilizce etiket ve eş anlamlılar.
   - İçerik satırı bu sözlük ve token’larla eşleşince `matchedTriggers` ve bileşen kartlarında **uyarı** metinleri üretilir.

2. **Günlük tüketim ve kurallar (rule scope)**
   - `MedicalConditionRule`: `triggerSlug`, `operator`, `threshold`, `unit`, `period`, `riskLevel`, `scope` (`scan` | `advice`) alanları.
   - Kullanıcı “tükettim” dediğinde besinler ölçeklenir; `DailyIntakeService` günlük toplamlar üzerinden kuralları değerlendirir ve tetiklenen mesajları döndürebilir.

3. **Abonelik kısıtı**
   - Günlük tarama sayısı plan limitine göre kesilir; aşımda yeni tarama reddedilir.

**Öneri metinleri** büyük ölçüde **kural ve katalog JSON’larındaki** (`messages`, keyword’ler) tanımlı metinlerden gelir; LLM özet satırları destekleyici niteliktedir.

---

## 8. Hastalık tipleri ve alerji tipleri

- Veri modeli `MedicalCondition.kind` alanı ile **`disease`** ve **`allergy`** ayırır.
- Katalog içeriği kök **`abc.json`** dosyasından seed ile `medical_conditions` tablosuna aktarılır (`prisma/seed.ts`).
- Her koşulun:
  - `code` (benzersiz),
  - `displayNames` (çok dilli gösterim),
  - `triggerFoods` (tarama eşleştirmesinde kullanılan token listesi),
  - isteğe bağlı `groupLabel` (UI gruplaması)
    alanları vardır.

Ders raporunda örnek koşul isimleri için canlı veritabanı veya `abc.json` içeriğine bakılabilir; mimari olarak **genişletilebilir katalog** tasarımı seçilmiştir.

---

## 9. Kısıtlama / filtreleme algoritması (içerik eşleştirme)

Özet: **Satır bazlı**, **sözlük destekli**, **Türkçe/İngilizce normalizasyonlu** eşleştirme.

1. **Girdi:** Gemini’den gelen `rawIngredients[]` (dize listesi).
2. **Kullanıcı tarafı:** `UserMedicalCondition` → her koşulun `triggerFoods` token’ları; token → `conditionCode[]` haritası oluşturulur.
3. **Sözlük:** `abc.json` içinden yüklenen `filter_alias_en` → her token için `label` ve `alias[]`.
4. **Normalizasyon:** Her içerik satırı için küçük harf, locale (`tr-TR` / `en-US`), `foldTurkishAscii`, ve `impliedEnglishHints` ile aday küme (`candidates`).
5. **Eşleşme (`rowMatchesFilterEntry`):**
   - Tam eşleşme veya minimum uzunluk (**3 karakter**) ile alt dize içerme (iki yönlü).
   - Token’un sözlükteki tüm terimleriyle karşılaştırma.
6. **Çıktı:**
   - `MatchedTrigger`: `filterToken`, `filterLabel`, `ingredientName`, `conditionCodes`.
   - Her satır için `ScanIngredient`: eşleşme varsa `warning`, yoksa `normal`.
7. **Genel güvenlik etiketi (`deriveSafetyLabel`):**
   - Tetikleyici sayısı **0** → `safe`
   - **1–2** → `caution`
   - **3+** → `avoid`

Bu kural basit bir **ürün-politikası** seçimidir; tıbbi ağırlıklandırma değildir — ders notunda “sezgisel eşik” olarak tartışılabilir.

---

## 10. Genel özet

| Başlık               | Özet                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Problem              | Özel sağlık bağlamında paket içeriğini hızlı anlamak.                                                                |
| Çözüm                | Mobil istemci + Nest API + Postgres + Gemini Vision + katalog/kural tabanlı eşleştirme.                              |
| Güçlü yönler         | Modüler mimari, i18n, günlük kota, tüketim ve kural pipeline’ına uygun şema.                                         |
| Zayıf / risk yanlar  | LLM çıktısı hatalı olabilir; eşleştirme alt dize tabanlıdır (false positive/negative); tıbbi sorumluluk üstlenilmez. |
| Geliştirme fikirleri | Admin panel, gerçek ödeme, gelişmiş NER/ontoloji, kullanıcı geri bildirimi ile sözlük iyileştirme.                   |

---

## Kaynak dosyalar (kod referansı)

| Konu            | Dosya / modül                                                                   |
| --------------- | ------------------------------------------------------------------------------- |
| Plan limitleri  | `backend/src/subscription/plan-limits.ts`, `src/constants/subscriptionPlans.ts` |
| Kota            | `backend/src/users/scan-quota.service.ts`                                       |
| Eşleştirme      | `backend/src/label-scan/label-scan.service.ts`                                  |
| Gemini          | `backend/src/label-scan/gemini-vision.service.ts`                               |
| Günlük kurallar | `backend/src/daily-intake/daily-intake.service.ts`                              |
| Şema            | `backend/prisma/schema.prisma`                                                  |
| Mimari özet     | `docs/ARCHITECTURE.md`                                                          |

---

_Belge tarihi: proje deposu ile senkron; ders teslimi için kopyalanıp PDF’e dönüştürülebilir._
