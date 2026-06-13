const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Klasördeki site.html dosyasını ana sayfada göstermek için ayar
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "site.html"));
});

// 2. Supabase Bağlantı Ayarları (Güncellenmiş Güvenli Versiyon)
const SUPABASE_URL = 'https://obiuonwztfycpkfusuky.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gVWigEb4vhoRWtTYtFhtjA_cYY5a1yM';

// db schema ayarını manuel geçerek PGRST125 hatasını bypass ediyoruz
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'storage' } 
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'site.html'));
});
// Multer Ayarı: Dosyaları diske yazmak yerine doğrudan RAM'de (Memory) tutuyoruz
// ve bekletmeden Supabase'e gönderiyoruz. Sunucu şişmemiş oluyor.
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Maksimum dosya boyutunu 50MB yaptık (Videolar için)
});

// Dosya Yükleme (Upload) API Endpoint'i
app.post("/upload", upload.array("media", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Dosya seçilmedi." });
    }

    const uploadPromises = req.files.map(async (file) => {
      // Benzersiz dosya adı oluşturma
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = uniqueSuffix + path.extname(file.originalname);

      // Supabase Storage 'nisanmedya' bucket'ına yükleme yapıyoruz
      const { data, error } = await supabase.storage
        .from("nisanmedya")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;
      return data;
    });

    await Promise.all(uploadPromises);
    res
      .status(200)
      .json({ message: "Tüm dosyalar buluta başarıyla yüklendi!" });
  } catch (error) {
    console.error("Supabase Yükleme Hatası:", error);
    res
      .status(500)
      .json({ error: "Dosyalar buluta gönderilirken bir hata oluştu." });
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});
