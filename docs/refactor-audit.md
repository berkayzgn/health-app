# Luminous Health — Kapsamlı Refaktör & Denetim Raporu

**Tarih:** 2026-05-01  
**Kapsam:** Frontend (React Native / Expo), Backend (NestJS / Prisma), AI Prompt Mühendisliği, Onboarding Akışı  
**Durum:** Denetim tamamlandı — uygulama bekleniyor

---

## İçindekiler

1. [UI/UX Tutarsızlıkları ve İyileştirmeler](#1-uiux-tutarsızlıkları-ve-iyileştirmeler)
2. [Backend Hata ve İyileştirme Raporu](#2-backend-hata-ve-iyileştirme-raporu)
3. [AI API Kullanımı ve Prompt Tutarlılığı](#3-ai-api-kullanımı-ve-prompt-tutarlılığı)
4. [Onboarding Kalite ve Tutarlılık İncelemesi](#4-onboarding-kalite-ve-tutarlılık-incelemesi)
5. [Öncelik Matrisi](#5-öncelik-matrisi)

---

## 1. UI/UX Tutarsızlıkları ve İyileştirmeler

### 1.1 Renk / Tema Tutarsızlıkları

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Yüksek** | `src/app/(main)/index.tsx` | 20–34, 234 | Ana ekran `StatusBar style="dark"` ile **sabit açık tema** kullanıyor; `useStore` temasını okumadığı için karanlık modda kırılıyor. Diğer ekranlar `designRgb` + Tailwind semantik token kullanıyor. | `getThemeColors` veya `bg-background`/`text-on-surface` NativeWind token'ları ile yönet; StatusBar'ı tema'dan türet. |
| **Yüksek** | `src/app/auth.tsx` | 152–317 | `#f6f6f6`, `#4e6300`, `#cafd00` gibi hardcoded hex'ler `src/theme.ts` renk sabitleriyle paralel gidiyor fakat paylaşılmıyor. | `theme.ts` ve `designRgb` üzerinden birleştir. |
| **Orta** | `src/components/AppHeader.tsx` | 9–11, 64–66 | `#BFFF00` / `#2C3600` lime sabitleri `index.tsx` `C` nesnesiyle çakışıyor — iki ayrı kaynak. | `src/constants/brand.ts` gibi tek bir modül oluştur. |
| **Orta** | `src/components/MultiSelectSheet.tsx` | 56–64 | `#4e6300`, `#acadad`, `rgba(0,0,0,0.45)` hardcoded; birincil ve kontur renkler tema'dan türetilmiyor. | Tema token'ı kullan; scrim için paylaşımlı overlay sabiti. |
| **Orta** | `src/app/(main)/settings.tsx` | 74–85, 301–319 | İkon, chevron, Switch track/thumb renkleri tekrarlayan hardcoded değerler. | Tema'dan türet; `Switch` bileşeni için platform-aware koyu/açık renkler. |
| **Düşük** | `src/components/ScanAnalysisDetailContent.tsx` | 54–66, 154 | `#4a5e00`, `#b45309`, `#b02500` hardcoded; `yellow-100`/`yellow-800` Tailwind sınıfları koyu temada kırılabilir. | Anlamsal `text-error`/`text-warning`/`text-primary` token'larına taşı. |
| **Düşük** | `src/app/(main)/scan-history/index.tsx` | 116–145 | Güvenlik renkleri hardcoded; `scanHistorySafetyIcon` yardımcısı var ama renk haritalamaya dahil edilmemiş. | Yardımcıyı renk döndürecek şekilde genişlet. |

### 1.2 Tipografi Tutarsızlıkları

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Yüksek** | `src/app/(main)/index.tsx` | 432–490 | `StyleSheet` + sistem fontu; diğer tüm ekranlar **Manrope + Inter** yüklüyor. Ana sayfa görsel tutarsız. | Aynı font setini yükle veya `fontFamily` içeren paylaşımlı text bileşenleri kullan. |
| **Orta** | `src/app/(main)/profile.tsx` | 364 | `font-headline` class, bitişik bloklardan farklı şekilde, `fontFamily` style prop'u olmadan kullanıyor. | `Manrope_700Bold` veya `800ExtraBold` ekle; hiyerarşiye göre seç. |
| **Orta** | Çoklu | çeşitli | Uygulama genelinde `text-[10px]`, `text-xs`, `text-sm`, `text-[15px]` gibi karma yazı ölçeği; standart bir tip ölçeği yok. | 4–6 rol (display, title, body, caption, label, caption-small) içeren merkezi bir token seti tanımla. |
| **Düşük** | `src/app/onboarding.tsx` | 52–53, 231 | Benzer hiyerarşi için `Manrope_600SemiBold` kullanıyor; `auth`/`profile` `700`/`800` kullanıyor. | Başlık ağırlıklarını hizala. |

### 1.3 Spacing ve Layout

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Orta** | `src/app/(main)/index.tsx` | 241–244 | `paddingHorizontal: 16`, `gap: 10` — diğer ekranlar `paddingHorizontal: 24`, `gap-3`/`gap-4` kullanıyor. | Bir ızgara sözleşmesi seç (önerilen: yatayda 16/24, dikeyde 8/12/16). |
| **Orta** | `src/components/AppHeader.tsx` | 48–49, 128–129 | Home versiyonu `px-4`; inner versiyonu `px-5` — scroll içeriğiyle hizalanma uyumsuzluğu. | Header'da yatay dolguyu birleştir. |
| **Düşük** | `src/app/(main)/scan.tsx` | 677 | Sonuç footer `py-3`; profil footer `pt-4` — alt chrome yoğunluğu tutarsız. | Paylaşımlı `ScreenFooterBar` bileşeni. |
| **Düşük** | `src/app/payment/index.tsx` | 73–80 | `flexGrow: 0` kısa içeriğin scroll alanını doldurmadığı anlamına geliyor. | Boş alanı CTA altında göstermek için `flexGrow: 1`. |

### 1.4 Yükleme ve Boş Durum Eksiklikleri

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Orta** | `src/app/(main)/scan-history/index.tsx` | 69–71 | Font yüklenene kadar boş ekran, spinner yok. | `profile` ekranı gibi `ActivityIndicator` veya iskelet göster. |
| **Orta** | `src/app/(main)/scan-history/[id].tsx` | 71–73 | Aynı sorun — font yüklemesi sırasında boş ekran. | Spinner + etiket ekle. |
| **Orta** | `src/app/payment/index.tsx` | 61–63 | Font yüklemesi sırasında boş ekran. | Spinner veya header placeholder ile kabuk göster. |
| **Orta** | `src/app/(main)/scan.tsx` | 695–703 | `phase === "idle"` + `profileReady` + `hasMedicalSelections` için boş surface — `useEffect` pick akışını tetikleyene kadar görünür. | "Başlatılıyor…" veya küçük loader göster. |

### 1.5 Hata İşleme Eksiklikleri

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Yüksek** | `src/app/(main)/scan-history/[id].tsx` | 47–51, 86–99 | Ağ/sunucu hatalarında `detail === null` oluyor ve `notFound` kopya gösteriliyor — yanlış sınıflandırma. | `error`, `notFound`, `success` durumlarını ayır; ağ hataları için `scanHistory.loadError` + yeniden dene göster. |
| **Orta** | `src/app/(main)/index.tsx` | 137–143 | Geçmiş fetch hatası sessizce `[]` olarak yutuluyor; kullanıcı feedback yok. | Soft hata banner veya yeniden dene chip'i göster. |
| **Düşük** | `src/app/(main)/scan.tsx` | 195–204 | Hatalar `Alert.alert` ile gösteriliyor — tutarlı ama tarama ekranında modal yorgunluğu yaratıyor. | Tarama hataları için satır içi kurtarma paneli + yeniden dene. |

### 1.6 i18n Eksiklikleri

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Yüksek** | `src/app/(main)/settings.tsx` | 185 | **`"Manage Subscription"`** JSX'e hardcoded. | `settings.manageSubscription` anahtarını `en.json`/`tr.json`'a ekle. |
| **Orta** | `src/locales/en.json`/`tr.json` | 249 | `settings.themeSystemDefault` var ama `src/` içinde hiçbir yerde referans edilmiyor. | Sisteme tema bağlanırsa bağla; yoksa kaldır. |
| **Orta** | `src/components/ScanAnalysisDetailContent.tsx` | 127–159 | `ing.tag`, `ing.description`, `ing.warningFooter` backend'den gelen İngilizce stringler — TR kullanıcılar karma dil görüyor. | Bilinen tag'leri sunucu tarafında çevir veya statik tag'leri `t('labelScan.tags.xxx')` ile eşleştir. |
| **Düşük** | Genel | — | `onboarding` bloğundaki `stepOf`, `title`, `subtitle`, `backTitle`, `backMessage` anahtarları mevcut `onboarding.tsx` tarafından referans edilmiyor. | Kullanılanları belirle; gereksizleri kaldır. |

### 1.7 Erişilebilirlik

| Önem | Dosya | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------------------|
| **Orta** | `src/components/MultiSelectSheet.tsx` | Satır Pressable'ları ve kapat butonu `accessibilityRole`/`accessibilityLabel` yok. | `accessibilityRole="button"`, `accessibilityLabel` her satır için satır metni. |
| **Orta** | `src/app/(main)/index.tsx` | Birincil CTA Pressable'larında `accessibilityLabel` yok; "Tümünü gör" yalnızca `hitSlop={8}`. | `t('home.dashboard.scanCta…')` anahtarlarını etiket olarak kullan; tüm CTA'larda `hitSlop` artır. |
| **Orta** | `src/app/(main)/settings.tsx` | `SettingsNavRow` Pressable'larında `accessibilityLabel` yok. | `title` + isteğe bağlı `subtitle` ipucundan oluştur. |
| **Düşük** | `src/app/payment/index.tsx` | "Plan değiştir" Pressable'ında `accessibilityLabel` yok. | `t('payment.billing.changePlanCta')` ekle. |
| **Düşük** | `src/app/payment/manage.tsx` | İç içe geçmiş Pressable kart yapısı ekran okuyucuları karıştırabilir. | Tek bir press hedefi veya iç bileşene `accessible={false}`. |

### 1.8 Animasyon ve Basma Geri Bildirimi

| Önem | Dosya | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------------------|
| **Orta** | `src/app/(main)/index.tsx` | Birincil CTA Pressable'larında `pressed` opacity veya `android_ripple` yok — iOS'ta görsel feedback yok. | `onboarding.tsx`'deki `BigSelectCard` pattern'ini (`pressed ? 0.9 : 1`) uygula. |
| **Düşük** | `src/components/MultiSelectSheet.tsx` | Sadece `animationType="fade"` — other sheets / pickers slide ile açılıyor. | `slide` veya reanimated bottom sheet kullanmayı değerlendir. |

---

## 2. Backend Hata ve İyileştirme Raporu

### 2.1 Eksik Validasyon

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Orta** | `backend/src/label-scan/label-scan.controller.ts` | 47–51 | `limit` query parametresi negatif, sıfır veya çok büyük değerlere karşı sınırlandırılmamış. | `@Min(1) @Max(100)` dekoratörleri içeren bir query DTO'su + `ValidationPipe` ekle. |
| **Düşük** | `backend/src/users/dto/update-profile.dto.ts` | 19–22 | `conditionTypes` dizi uzunluğu ve eleman uzunluğu sınırsız. | `@ArrayMaxSize`, eleman bazında `@MaxLength` ekle. |
| **Düşük** | `backend/src/auth/dto/register.dto.ts` | 11–13 | `name` için `@MaxLength` yok. | DB/UI limitleriyle hizalı `@MaxLength` ekle. |

### 2.2 Hata İşleme Açıkları

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Yüksek** | `backend/src/users/users.service.ts` | 82–126 | `update()` herhangi bir hatada `null` döndürüyor — constraint hataları, bağlantı sorunları gizleniyor; istemci `200` veya belirsiz gövde alabiliyor. | Catch'i kaldır veya Prisma hata kodlarını HTTP exception'larına eşleştir; "not found"ı açık olarak ele al. |
| **Orta** | `backend/src/users/users.controller.ts` | 20–24 | `getProfile` kullanıcı yoksa `NotFoundException` yerine `null` dönüyor. | `!user` ise `NotFoundException` fırlat. |
| **Orta** | `backend/src/users/users.controller.ts` | 27–32 | `updateProfile`, servis `null` döndürdüğünde bunu ele almıyor. | Null ise fırlat veya kontratı belgele. |
| **Düşük** | `backend/src/label-scan/gemini-vision.service.ts` | 344–371 | JSON parse başarısız olursa satır bölme heuristiği sessizce devreye giriyor; model/şema sorunlarını maskeleyebilir. | `warn` ile logla; güvenlik kritik ayrıştırma için başarısız olmayı düşün. |

### 2.3 Güvenlik Sorunları

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Yüksek** | `backend/src/main.ts` | 19–28 | `ALLOWED_ORIGINS` boş olursa CORS `origin: '*'` — production'da yanlış yapılandırmaya açık. | Production'da boş origins ile başlatmayı reddet veya varsayılan olarak izin verme. |
| **Yüksek** | `backend/src/app.module.ts` | 11–14 | `ConfigModule.forRoot` zorunlu değişkenler (`JWT_SECRET`, `DATABASE_URL`) için **doğrulama şeması yok** — boot zamanı hataları yerine çalışma zamanı hataları. | `Joi`/`zod` ile `validationSchema` ekle. |
| **Orta** | `backend/src/auth/auth.module.ts` | 17–21 | `JWT_SECRET` null assertion — eksik secret runtime hatası veya zayıf davranışa yol açar. | `ConfigModule` validasyonu veya `useFactory`'de açık guard. |
| **Orta** | `backend/src/main.ts` | 47–48 | `0.0.0.0`'da dinliyor — tüm arayüzler, güvenlik duvarı açıksa riskli. | `127.0.0.1` veya env-driven host; production dağıtımını belgele. |
| **Düşük** | `backend/src/catalog/catalog.controller.ts` | 4–21 | `/catalog/medical-conditions` kimlik doğrulamasız erişilebilir; kazıma/aşırı yüklemeye açık. | Throttling veya CDN cache; hassassa auth ekle. |
| **Düşük** | Genel | — | `POST /auth/login` ve `/register` için rate limiting / brute-force koruması yok. | `@nestjs/throttler` veya kenar/WAF limiti ekle. |

### 2.4 Veritabanı / Prisma

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Orta** | `backend/src/users/users.service.ts` | 101–113 | Transaction içinde katalog kodu başına bir `findUnique` — N veritabanı round-trip. | `findMany({ where: { code: { in: catalogCodes } } })` + id eşleme. |
| **Düşük** | `backend/prisma/schema.prisma` | 72–73 | Bileşik `@@index([userId, scannedAt])` yanında gereksiz `@@index([userId])` — yazma maliyeti artıyor. | Profil sonuçlarına dayanarak `@@index([userId])`'yi kaldırmayı değerlendir. |
| **Düşük** | `backend/src/label-scan/label-scan.service.ts` | 166–216 | Gemini çağrısı + `create` etrafında transaction yok — `create` başarısız olursa API maliyeti karşılanmadan kullanılmış olur. | İsteğe bağlı: önce "beklemede" kaydı oluştur veya outbox/retry deseni. |

### 2.5 API Tasarımı

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Orta** | `backend/src/users/users.controller.ts` | 20–24 | `GET /users/me` null body dönebilir; diğer endpoint'ler exception kullanıyor. | Standart DTO wrapper veya 404. |
| **Düşük** | `backend/src/label-scan/label-scan.controller.ts` | 47–52 | Geçmiş yalnızca limit-tabanlı — büyük geçmişler için pagination yok. | `cursor`/`offset` + kararlı sıralama sözleşmesi ekle. |
| **Düşük** | Genel | — | Hata stringleri Türkçe ve İngilizce karışık (`ConflictException` İngilizce, auth hataları Türkçe). | API hata dilini merkezileştir veya hata kodları kullan. |

### 2.6 Tür Güvenliği

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Düşük** | `backend/src/auth/auth.module.ts` | 20 | `expiresIn: … as any` `StringValue` tipini devre dışı bırakıyor. | `ms` paketinden `StringValue` kullan veya `satisfies` ile uyumlu tipe geç. |
| **Düşük** | `backend/src/label-scan/label-scan.service.ts` | 207–214 | Prisma JSON alanları için `unknown` üzerinden cast — güven sınırlarında zod ile çalışma zamanı doğrulaması düşün. | Kritik alanlar için `zod.parse` ekle. |
| **Düşük** | `backend/src/users/users.controller.ts` | 21, 29 | `req` satır içi typed; Passport türlerinden `AuthenticatedRequest` arayüzü yok. | Paylaşımlı `AuthenticatedRequest` arayüzü tanımla. |

### 2.7 Performans

| Önem | Dosya | Satır | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------|-------------------|
| **Orta** | `backend/src/main.ts` | 8–17 | **15 MB** JSON body limiti — tarama payload'ları için bellek ve DoS yüzeyi. | DTO/serviste daha sıkı max uygula; büyük görseller için streaming veya presigned upload düşün. |
| **Orta** | `backend/src/label-scan/label-scan.service.ts` | 388–492 | Tüm glossary girişleri × içindekiler üzerinde iç içe döngü her taramada. | Glossary'yi kullanıcı trigger'larıyla önceden filtrele. |
| **Düşük** | `backend/src/label-scan/label-scan.service.ts` | 152–153 | `readFileSync` başlangıçta main thread'i blokluyor. | `fs.promises.readFile` ile async init kullan. |
| **Düşük** | `backend/src/label-scan/gemini-vision.service.ts` | 228–234 | Sharp resize istek yolunda — eşzamanlılık altında stall riski. | İş kuyruğu (Bull/BullMQ) veya worker servisi. |
| **Düşük** | `backend/src/auth/jwt.strategy.ts` | 20–25 | Her kimlik doğrulamalı istekte DB araması. | Kısa TTL JWT + "user exists" cache. |

### 2.8 Test Eksikliği

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Yüksek** | `src/` altında `*.spec.ts` yok — sıfır unit test. | `AuthService`, `UsersService.update`, `LabelScanService` eşleştirme edge case'leri için unit test ekle. |
| **Yüksek** | `test/app.e2e-spec.ts` → `GET / → 'Hello World!'` bekleniyor; böyle bir route yok — E2E muhtemelen başarısız. | Testi `/health` + JSON doğrulamasına yönlendir; auth akışları için test DB / mock kullan. |

---

## 3. AI API Kullanımı ve Prompt Tutarlılığı

### 3.1 TR/EN Prompt Tutarsızlıkları

| Önem | Alan | Bulgu | Önerilen Düzeltme |
|------|------|-------|-------------------|
| **Orta** | `LABEL_SYSTEM_INSTRUCTION` | EN "Do NOT add allergens not visible"; TR tüm görünmeyen bileşenler için yasak — TR daha kısıtlayıcı. | EN'i güçlendir: "Do NOT add any component (allergen or otherwise) not visible in the image text." |
| **Yüksek** | `MEAL_SYSTEM_INSTRUCTION` | **Önemli uyumsuzluk**: TR "şüphe varsa daha çok çıkarım satırı tercih et" (saldırgan); EN "bias mildly toward SAFETY" (ılımlı). | Sağlık uygulaması için EN konservatifl yaklaşımı referans al; TR talimatını EN ile hizala. |
| **Orta** | Yemek kullanıcı prompt'u | TR profil alaka bahsediyor; EN "prioritize allergens and staples" vurguluyor — eşdeğer değil. | Birbiriyle örtüşen tek bir temel cümleyi çevir. |

### 3.2 Halüsinasyon Riski

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Yüksek** | `parseGeminiResponse` (~satır 366–372): JSON parse başarısız olursa **düz metin satırları** ham içerik gibi işleniyor — prosedür metni gerçek içerik gibi eşleştirmeye giriyor. | JSON parse hatasında akışı durdur (BadRequest fırlat) veya en azından `warn` log'la + satır bazında katı sanitasyon uygula. |
| **Orta** | Yemek modu `muhtemel:` / `likely:` prefix'i `matchIngredients`'ta normalize edilmiyor — prefix'ten sonraki madde ismi yine de substring eşleşmesine dahil oluyor. | Eşleştirme öncesinde prefix'i soy; `isMealInference: boolean` bayrağı eşleşmiş trigger'lara ekle. |
| **Orta** | Label modunda besin tablosu satırları (ör. "Şeker 8g") ingredient olarak ekleniyor — trigger eşleşmesinde false positive riski var. | Besin satırlarını ayrı kategorize et; tetikleyici eşleştirmeye dahil etme. |

### 3.3 Şema Uyumu

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Düşük** | `MEAL_RESPONSE_SCHEMA` açıklama alanlarında TR metin var ama JSON key'leri İngilizce (`ingredients`) — tutarsız. | Tüm şema açıklamalarını tek dile (EN) standardize et. |
| **Düşük** | `required` dizisi önceki bir versiyonda `'Ingredients'` (büyük I) içeriyordu — şu an düzeltilmiş; `parseGeminiResponse` `ingredients` (küçük) bekliyor. | Şema geçişlerinde şema ↔ parse uyumunu doğrulayan bir CI adımı ekle. |

### 3.4 Model Konfigürasyonu

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **İyi** | `temperature: 0.2`, JSON schema-constrained output, `maxOutputTokens: 2048` — yapılandırılmış çıkarım için uygun. | — |
| **Düşük** | Label ve yemek modu için `maxOutputTokens` ve `temperature` aynı; yemek çıkarımı daha uzun olabilir. | Yemek modu için `maxOutputTokens: 3072`'yi değerlendir. |

### 3.5 Locale ve Hata Mesajları

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Orta** | 429/kimlik hata gövdeleri `gemini-vision.service.ts`'de Türkçe hardcoded — EN locale'deki kullanıcılar Türkçe hata görüyor. | Hata mesajlarını `locale` parametresine göre dil koşuluna bağla. |
| **Orta** | `BadRequestException('Geçersiz görüntü verisi.')` locale'e bakılmaksızın Türkçe. | `locale === 'en' ? 'Invalid image data.' : 'Geçersiz görüntü verisi.'` |
| **Düşük** | `getScanById`'da kayıt eksikse `summaryLine` fallback'i Türkçe hardcoded — EN kullanıcılar Türkçe görüyor. | `label-scan.service.ts`'de `locale` parametresini `getScanById`'a geçir veya eski kayıtlar için nötr metin kullan. |

---

## 4. Onboarding Kalite ve Tutarlılık İncelemesi

### 4.1 Akış Tamamlanabilirliği

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Yüksek** | `onboarding.tsx` Finish → `/payment`; `payment/index.tsx`'te **"Uygulamaya devam et"** gibi belirgin bir CTA yok. Ana uygulamaya ulaşmak için `payment/manage.tsx` içindeki `router.replace("/")` gerekiyor — yeni kullanıcı scanner'a nasıl ulaşacağını bilemeyebilir. | `payment/index.tsx`'e belirgin "Taramaya başla" veya "Ana sayfaya git" CTA'sı ekle; veya ödeme adımını onboarding sonrasına kaybet. |
| **Orta** | `profileNeedsOnboarding` doğruluğu `conditionTypes`'ın dolu olmasına bağlı; backend'de profil silinirse onboarding tetiklenmez (AsyncStorage gate nedeniyle). | `onboardingGateComplete` için sunucu tarafında doğrulama veya önemsiz bir sağlık kontrolü. |

### 4.2 Doğrulama Eksiklikleri

| Önem | Dosya | Bulgu | Önerilen Düzeltme |
|------|-------|-------|-------------------|
| **Orta** | `src/app/auth.tsx` | Email doğrulaması sadece boşluk kontrolü — format regex yok (profile.tsx'te `isValidEmail` var). | Kayıt formunda aynı `isValidEmail` regex'i kullan. |
| **Düşük** | `src/app/onboarding.tsx` | "Şimdilik atla" koşul seçimi doğrulamasını atlıyor. | Kısmi profille devam etmenin sağlık değerlendirmesini kısıtlayacağı konusunda uyar veya zorunlu kıl. |

### 4.3 Koşul Seçimi UX

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **İyi** | Hastalık/alerji ayrımı net: ayrı sayfalar, farklı ikonlar, katalog `kind` gösterimi. | — |
| **Orta** | Seçilen koşul sayısı görüntüleniyor ama seçilen isimlerin önizlemesi yok — çok sayıda seçimle koyuldu mu kontrolü zor. | Seçilen isimleri küçük bir chip listesinde göster. |

### 4.4 Profil Kalıcılığı ve Race Condition'lar

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Orta** | `updateProfile` başarılı + `refreshProfile` başarısız → `userProfile: null` geçici state; `onboarding.tsx` yine de navigasyon yapıyor — sonraki ekranda geçici tutarsızlık. | `refreshProfile` başarısız olursa `getMe` ile yeniden dene veya lokal state'i optimistik güncelle. |
| **Düşük** | `onboardingGateComplete` AsyncStorage-local — yeniden kurulum veya yeni cihazda sunucu profili olmasına rağmen onboarding tekrar gösterilebilir. | Mevcut `conditionTypes`'a göre gate hesapla; veya `onboardingCompletedAt` alanını backend'e ekle. |

### 4.5 i18n Onboarding Paritesi

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **İyi** | Ana onboarding block'u TR/EN arasında doğru çevrilmiş. | — |
| **Düşük** | `stepOf`, `title`, `subtitle`, `backTitle`, `backMessage`, `exitLink` anahtarları `onboarding.tsx`'te kullanılmıyor. | Referans yoksa kaldır; gelecek değişimde tutarsızlık riski. |

### 4.6 Hata Kurtarma

| Önem | Bulgu | Önerilen Düzeltme |
|------|-------|-------------------|
| **Orta** | Koşul kaydetme başarısız olursa `Alert` + kullanıcı sayfada kalıyor — bu iyi. Ancak ağ hatasının sunucu tarafında kısmi işlemeye yol açıp açmadığı belirsiz. | Backend `update()` transaction'ı atomik — iyi; ancak `null` dönüş değerini 500 yerine `HttpException` olarak ele al (bkz. Bölüm 2.2). |

---

## 5. Öncelik Matrisi

### Kritik (Hemen çözülmeli)

| # | Alan | Bulgu | Dosya |
|---|------|-------|-------|
| C1 | Güvenlik | CORS `*` varsayılan | `backend/src/main.ts` |
| C2 | Güvenlik | Env validasyon şeması yok | `backend/src/app.module.ts` |
| C3 | Backend | `UsersService.update` hataları yutuluyor → `null` dönüyor | `backend/src/users/users.service.ts` |
| C4 | UI/UX | `scan-history/[id].tsx` ağ hatası "Bulunamadı" olarak gösteriliyor | `src/app/(main)/scan-history/[id].tsx` |
| C5 | AI | JSON parse fallback ham prose'u içerik gibi işliyor | `backend/src/label-scan/gemini-vision.service.ts` |

### Yüksek Öncelik

| # | Alan | Bulgu | Dosya |
|---|------|-------|-------|
| H1 | UI/UX | Ana sayfa tema izolasyonu — sabit açık renk, Manrope/Inter eksik | `src/app/(main)/index.tsx` |
| H2 | AI | TR yemek prompt'u EN'den çok daha saldırgan çıkarım yapıyor | `backend/src/label-scan/gemini-vision.service.ts` |
| H3 | Onboarding | Kayıt email format doğrulaması yok | `src/app/auth.tsx` |
| H4 | Onboarding | Post-onboarding payment'ta ana uygulamaya CTA yok | `src/app/payment/index.tsx` |
| H5 | Backend | Test yok + E2E test bozuk | `backend/test/` |
| H6 | Backend | JWT secret boot-time doğrulaması yok | `backend/src/auth/auth.module.ts` |

### Orta Öncelik

| # | Alan | Bulgu |
|---|------|-------|
| M1 | UI/UX | Hardcoded renk sabitleri — tek kaynak yok |
| M2 | UI/UX | Font stack ana sayfada eksik |
| M3 | UI/UX | Yükleme sırasında boş ekranlar (scan-history, payment) |
| M4 | UI/UX | Erişilebilirlik etiketleri eksik (CTA'lar, sheet rows) |
| M5 | Backend | `GET /users/me` null dönüyor, `NotFoundException` fırlatmıyor |
| M6 | Backend | Limit query parametresi sınırlandırılmamış |
| M7 | Backend | N+1 koşul oluşturma |
| M8 | AI | Gemini hata mesajları locale'e göre dil seçmiyor |
| M9 | AI | Besin tablosu satırları trigger eşleştirmede false positive riski |
| M10 | Onboarding | `refreshProfile` başarısız sonrası geçici null state |

### Düşük Öncelik

| # | Alan | Bulgu |
|---|------|-------|
| L1 | UI/UX | Tip ölçeği standardizasyonu |
| L2 | UI/UX | Spacing grid sözleşmesi |
| L3 | UI/UX | Pressable animasyon geri bildirimi |
| L4 | Backend | Gereksiz DB index |
| L5 | Backend | `readFileSync` async yapılabilir |
| L6 | AI | Yemek modu için `maxOutputTokens` artırılabilir |
| L7 | Onboarding | Kullanılmayan i18n anahtarları (onboarding block) |
| L8 | Onboarding | `onboardingGateComplete` sunucu durumunu yansıtmıyor |

---

*Rapor 3 bağımsız analiz ajanının çıktısı sentezlenerek üretilmiştir. Değişiklik önerileri için [refactor branch üzerinde çalışılabilir](../ARCHITECTURE.md).*
