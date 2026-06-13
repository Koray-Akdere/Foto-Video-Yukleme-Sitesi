const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Farklı portlardan (örn: frontend'den) gelen istekleri kabul etmek için CORS
app.use(cors());

// Yüklenen dosyaların kaydedileceği klasörün varlığını kontrol et, yoksa oluştur
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Ayarları: Dosya adı çakışmasını önlemek ve güvenliği sağlamak
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Dosyalar 'uploads' klasörüne gidecek
  },
  filename: function (req, file, cb) {
    // Dosya adının başına benzersiz olması için timestamp ekliyoruz
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Dosya Yükleme (Upload) API Endpoint'i
// 'media' ismi frontend'deki formData.append('media', ...) ile aynı olmalıdır
app.post("/upload", upload.array("media", 20), (req, res) => {
  try {
    console.log(
      `${req.files.length} adet dosya başarıyla sunucuya kaydedildi.`,
    );
    res.status(200).json({ message: "Yükleme başarılı!" });
  } catch (error) {
    res.status(500).json({ error: "Dosya yüklenirken bir hata oluştu." });
  }
});

// GÜVENLİK ADIMI: '/uploads' klasörünü express.static() ile dışarıya AÇMIYORUZ.
// Böylece URL tahmin edilse bile admin dışındaki kimse fotoğrafları göremez.

// Sadece Admin (Nişan Sahipleri) için Basit Listeleme / İndirme Altyapısı
// Gerçek projede buraya bir şifre kontrolü (Middleware) eklemek gerekir.
app.get("/secret-admin-panel", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).send("Klasör okunamadı.");

    // Basitçe yüklenen dosyaların isimlerini listeler
    // İstersen bir zip kütüphanesi kullanarak tüm klasörü tek tıkla indirecek kod yazabilirsin
    res.send(`
            <h1>Nişan Fotoğrafları Yönetim Paneli</h1>
            <p>Toplam Yüklenen Dosya: ${files.length}</p>
            <ul>
                ${files.map((file) => `<li>${file}</li>`).join("")}
            </ul>
        `);
  });
});

app.listen(PORT, () => {
  console.log(
    `Nişan backend sunucusu http://localhost:${PORT} portunda çalışıyor.`,
  );
});
