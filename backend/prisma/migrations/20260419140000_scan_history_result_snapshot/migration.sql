-- Tam analiz detayı (özet, glisemik, içerik listesi) geçmiş görünümü için.
ALTER TABLE "scan_history" ADD COLUMN "resultSnapshot" JSONB;
