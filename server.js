const express = require("express");
const multer = require("multer");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cloudinary Yapılandırması
cloudinary.config({
  cloud_name: "xomwomfk",
  api_key: "837141234163841",
  api_secret: "_SaOgqeGi0NpWh6glkwMRsTt9uQ",
});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
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

    // Klasör isminden zaman damgasını KALDIRDIK. Artık sadece isme özel sabit bir klasör olacak.
    const folderName = `nisanmedya/${name.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // A) Tebrik Notunu TXT olarak benzersiz bir isimle yüklüyoruz (Üzerine yazmasın diye sonuna timestamp ekledik)
    const txtContent = `Gönderen: ${name}\nTebrik Notu: ${note || "Not bırakılmadı."}\nTarih: ${new Date().toLocaleString("tr-TR")}`;
    const timestamp = Date.now();

    await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            public_id: `${folderName}/mesaj_ve_tebrik_${timestamp}.txt`, // Her gönderimde ayrı txt dosyası oluşturur
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(Buffer.from(txtContent, "utf-8"));
    });

    // B) Tüm Fotoğraf ve Videoları Aynı Klasöre Akıtıyoruz
    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const isVideo = file.mimetype.startsWith("video");
        const originalNameWithoutExt = file.originalname
          .split(".")
          .slice(0, -1)
          .join(".");

        cloudinary.uploader
          .upload_stream(
            {
              resource_type: isVideo ? "video" : "image",
              folder: folderName, // Aynı isimli klasörün içine yazar
              public_id: `${Date.now()}_${originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_")}`, // Dosya adı benzersiz kalır
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(file.buffer);
      });
    });

    await Promise.all(uploadPromises);

    res
      .status(200)
      .json({ message: "Anılar başarıyla tek bir klasörde toplandı! 💕" });
  } catch (error) {
    console.error("Cloudinary Yükleme Hatası:", error);
    res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
