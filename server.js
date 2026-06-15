const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kesi̇n Çözüm: Ana dizindeki resim, logo gibi statik dosyaların tarayıcı tarafından okunabilmesini sağlar
app.use(express.static(path.join(__dirname)));

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

    const rawName = req.body.name || "Anonim";
    const folderName = rawName
      .trim()
      .replace(/\s+/g, "_")
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");

    const note = req.body.note || "";
    const timestamp = Date.now();
    const uploadPromises = [];

    // Not varsa .txt yapıp yükleme
    if (note.trim() !== "") {
      const txtContent = `Gönderen: ${rawName}\nTarih: ${new Date().toLocaleString("tr-TR")}\n\nNot:\n${note}`;
      const txtBuffer = Buffer.from(txtContent, "utf-8");
      const txtFileName = `${folderName}/not_${timestamp}.txt`;

      const txtUpload = supabase.storage
        .from("nisanmedya")
        .upload(txtFileName, txtBuffer, {
          contentType: "text/plain; charset=utf-8",
          upsert: false,
        });

      uploadPromises.push(txtUpload);
    }

    // Fotoğraf ve Videoları yükleme
    req.files.forEach((file, index) => {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${folderName}/medya_${timestamp}_${index}${fileExtension}`;

      const fileUpload = supabase.storage
        .from("nisanmedya")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      uploadPromises.push(fileUpload);
    });

    const results = await Promise.all(uploadPromises);
    const hasError = results.some((res) => res.error);
    if (hasError) {
      const firstError = results.find((res) => res.error).error;
      throw firstError;
    }

    res
      .status(200)
      .json({ message: "Tüm anılarınız klasörünüze başarıyla yüklendi!" });
  } catch (error) {
    console.error("Supabase Klasörleme ve Yükleme Hatası:", error);
    res
      .status(500)
      .json({ error: "Dosyalar buluta gönderilirken bir hata oluştu." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});
