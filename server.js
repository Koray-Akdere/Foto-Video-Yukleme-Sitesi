const express = require("express");
const multer = require("multer");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const textToImage = require("text-to-image"); // Notu görsele çeviren kütüphane

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cloudinary Yapılandırması (Kendi bilgilerini buraya gir)
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

    // İsme özel klasör yolu
    const folderName = `nisanmedya/${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const timestamp = Date.now();

    // A) Tebrik Notunu Şık Bir Görsele Dönüştürüp Resim Olarak Yüklüyoruz
    const formattedText = `GÖNDEREN:\n${name}\n\nTEBRİK NOTU:\n${note || "Not bırakılmadı."}\n\nTarih: ${new Date().toLocaleString("tr-TR")}`;

    // Fildişi rengi arka plana sahip, kahverengi yazılı şık bir dijital mektup kartı üretiyoruz
    const dataUri = await textToImage.generate(formattedText, {
      maxWidth: 600,
      fontSize: 22,
      fontFamily: "Georgia",
      lineHeight: 32,
      margin: 40,
      bgColor: "#faf6ee",
      textColor: "#634a24",
    });

    // Notu doğrudan bir "image" (görsel) olarak yüklüyoruz.
    // Başına "00_" koyduk ki alfabetik sıralamada klasörün en üstünde ilk bu not görünsün.
    await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        {
          folder: folderName,
          public_id: `00_tebrik_notu_${timestamp}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
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

    await Promise.all(uploadPromises);

    res.status(200).json({
      message: "Anılar ve tebrik notu başarıyla aynı klasörde toplandı! 💕",
    });
  } catch (error) {
    console.error("Yükleme Hatası:", error);
    res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
