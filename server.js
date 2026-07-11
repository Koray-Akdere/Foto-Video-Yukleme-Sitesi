const express = require("express");
const multer = require("multer");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cloudinary Yapılandırması
// Dashboard sayfasındaki bilgileri buraya tırnak işaretleri içine yapıştır:
cloudinary.config({
  cloud_name: "xomwomfk",
  api_key: "837141234163841",
  api_secret: "_SaOgqeGi0NpWh6glkwMRsTt9uQ",
});

// Multer ile gelen dosyaları doğrudan bellek üzerinde tutuyoruz
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Dosya başına maks 100MB (Videolar için ideal)
});

// 2. Yükleme Endpoint'i
app.post("/upload", upload.array("media"), async (req, res) => {
  try {
    const { name, note } = req.body;
    const files = req.files;

    if (!name || !files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "Eksik bilgi veya dosya gönderilmedi." });
    }

    // Klasör ismini temiz karakterlerle ve benzersiz bir ID ile kurguluyoruz
    const folderName = `nisanmedya/${name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    // A) Misafirin Mesajını TXT Dosyası Olarak Raw Formatında Cloudinary'ye Yüklüyoruz
    const txtContent = `Gönderen: ${name}\nTebrik Notu: ${note || "Not bırakılmadı."}\Tarih: ${new Date().toLocaleString("tr-TR")}`;

    await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            public_id: `${folderName}/mesaj_ve_tebrik.txt`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(Buffer.from(txtContent, "utf-8"));
    });

    // B) Tüm Fotoğraf ve Videoları Cloudinary'ye Akıtıyoruz
    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        // Dosya türünü (Mimetype) kontrol ederek resource_type belirliyoruz
        const isVideo = file.mimetype.startsWith("video");
        const originalNameWithoutExt = file.originalname
          .split(".")
          .slice(0, -1)
          .join(".");

        cloudinary.uploader
          .upload_stream(
            {
              resource_type: isVideo ? "video" : "image",
              folder: folderName,
              public_id: `${Date.now()}_${originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_")}`,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(file.buffer);
      });
    });

    // Tüm dosyaların yüklenmesini bekle
    await Promise.all(uploadPromises);

    res
      .status(200)
      .json({ message: "Anılar başarıyla Cloudinary albümüne yüklendi! 💕" });
  } catch (error) {
    console.error("Cloudinary Yükleme Hatası:", error);
    res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
