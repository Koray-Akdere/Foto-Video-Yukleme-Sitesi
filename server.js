const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// 1. EKSİK OLAN ADMİN TANIMI EKLENDİ
const admin = require("firebase-admin");

// 2. KLASÖR YAPINA GÖRE ÜST DİZİNDEKİ GİZLİ ANAHTARI ÇAĞIRIYORUZ (Sadece 1 kez tanımlandı)
// Eski hali: const serviceAccount = require("../firebase-key.json");
// Yeni hali: Render'ın gizli dosyayı koyduğu ana kök dizine göre ayarlıyoruz
const serviceAccount = require("./firebase-key.json");
const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin SDK Başlatma
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Firebase Storage ekranında üstte yazan bucket adı (gs:// olmadan yazılması daha sağlıklıdır)
  storageBucket: "ebru-berkay-nisan.appspot.com",
});

const bucket = admin.storage().bucket();

// Multer Ayarları
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Maks 100MB
});

// Yükleme Endpoint'i
app.post("/upload", upload.array("media"), async (req, res) => {
  try {
    const { name, note } = req.body;
    const files = req.files;

    if (!name || !files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "Eksik bilgi veya dosya gönderilmedi." });
    }

    const folderName = `${name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    // A) Mesajı TXT olarak kaydetme
    const txtFileName = `nisanmedya/${folderName}/mesaj_ve_tebrik.txt`;
    const txtFile = bucket.file(txtFileName);
    const txtContent = `Gönderen: ${name}\nTebrik Notu: ${note || "Not bırakılmadı."}\nTarih: ${new Date().toLocaleString("tr-TR")}`;

    await txtFile.save(txtContent, {
      metadata: { contentType: "text/plain; charset=utf-8" },
    });

    // B) Medyaları yükleme
    const uploadPromises = files.map((file) => {
      const blob = bucket.file(
        `nisanmedya/${folderName}/${Date.now()}_${file.originalname}`,
      );

      return new Promise((resolve, reject) => {
        const blobStream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
        });

        blobStream.on("error", (err) => reject(err));
        blobStream.on("finish", () => resolve(blob.name));

        blobStream.end(file.buffer);
      });
    });

    await Promise.all(uploadPromises);

    res
      .status(200)
      .json({ message: "Anılar başarıyla Firebase albümüne yüklendi! 💕" });
  } catch (error) {
    console.error("Yükleme Hatası:", error);
    res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
