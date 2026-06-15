const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Form verilerini yakalamak için eklendi

// 1. Ana sayfada site.html dosyasını gösterme
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "site.html"));
});

// 2. Supabase Bağlantı Ayarları
const SUPABASE_URL = "https://obiuonwztfycpkfusuky.supabase.co";
const SUPABASE_KEY = "sb_publishable_gVWigEb4vhoRWtTYtFhtjA_cYY5a1yM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  db: { schema: "storage" },
});

// Multer Ayarı: RAM üzerinde tutma
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Sınırı
});

// Dosya Yükleme (Upload) API Endpoint'i
app.post("/upload", upload.array("media", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Dosya seçilmedi." });
    }

    // Frontend'den gelen İsim ve Not bilgilerini alıyoruz
    // İsimdeki boşlukları dosya adında sorun yaratmaması için alt çizgiye (_) çeviriyoruz
    const rawName = req.body.name || "Anonim";
    const cleanName = rawName.trim().replace(/\s+/g, "_");
    const note = req.body.note || "";

    const uploadPromises = req.files.map(async (file, index) => {
      // Benzersiz zaman damgası ekleyerek çakışmayı önlüyoruz
      const timestamp = Date.now() + index;
      const fileExtension = path.extname(file.originalname);

      // Dosya adını gönderen kişinin ismi yapıyoruz
      const fileName = `${cleanName}_${timestamp}${fileExtension}`;

      // Supabase Storage 'nisanmedya' bucket'ına yükleme
      const { data, error } = await supabase.storage
        .from("nisanmedya")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
          // Opsiyonel: Kişinin notunu ve orijinal adını dosyanın metadata kısmına gömüyoruz
          metadata: {
            gonderen: rawName,
            mesaj: note,
          },
        });

      if (error) throw error;
      return data;
    });

    await Promise.all(uploadPromises);
    res.status(200).json({ message: "Tüm anılarınız başarıyla yüklendi!" });
  } catch (error) {
    console.error("Supabase Yükleme Hatası:", error);
    res
      .status(500)
      .json({ error: "Dosyalar buluta gönderilirken bir hata oluştu." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});
