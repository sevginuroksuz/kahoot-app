# Kahoot-App

**Ekip:** Sevgi Nur Öksüz & Elif Pazarbaşı

---

## 📋 Proje Hakkında  
Bu proje, Kahoot!’tan esinlenmiş bir etkileşimli sınav platformudur. Öğretmenler çoktan seçmeli sorularla sınav oluşturur, öğrenciler gerçek zamanlı olarak katılır ve anlık liderlik tablosu sunulur.

---

## ✅ Tamamlanan Özellikler  
- **Kullanıcı Kimlik Doğrulama**  
    Kayıt & Giriş (JWT tabanlı)  
- **Öğretmen Paneli**  
   Quiz oluşturma formu  
   Oluşturulan quiz’leri listeleme  
- **Öğrenci Paneli**  
   Dashboard’a yönlendirme  
   Quiz’e katılma (`/student/join` sayfası çalışır halde)  
- **Temel Veritabanı Modelleri**  
   User, Quiz, Session şemaları  
- **Socket.io Entegrasyonu (İlk Adımlar)**  
   Sunucu-istemci arasında bağlantı kurulumu  

---

## 🚧 Devam Eden  
- **Oturum Başlatma (“Start Session”)**  
  - “Start Session” butonunun doğru URL’ye yönlendirmemesi ve session başlatma akışındaki yönlendirme eksikliği  

---

## 📎 Kaynaklar  
- **Video Tanıtımı:** [Video Linki ]()  
- **GitHub Deposu:** [Github Linki](https://github.com/sevginuroksuz/kahoot-app)  

---

## ⚙️ Kurulum & Çalıştırma  

1. Depoyu klonlayın:  
   ```bash
   git clone https://github.com/sevginuroksuz/kahoot-app.git
   cd kahoot-app
   ```  
2. Bağımlılıkları yükleyin:  
   ```bash
   npm install
   ```  
3. Ortam değişkenlerini ayarlayın (`.env` dosyası):  
   ```
   MONGO_URI=mongodb://localhost:27017/quiz_platform
   JWT_SECRET=your_jwt_secret
   ```  
4. Sunucuyu başlatın:  
   ```bash
   npm start
   ```  
5. Tarayıcıda açın:  
   ```
   http://localhost:3000
   ```

---

## 📂 Proje Yapısı  
```
kahoot-app/
├── app.js             # Ana sunucu dosyası
├── routes/            # Express yönlendirmeleri
├── middlewares/       # Auth, session vs.
├── models/            # Mongoose modelleri
├── views/             # EJS şablon dosyaları
├── public/            # CSS, JS, görseller
└── .env               # Ortam değişkenleri
```

---

## 🤝 Katkıda Bulunma  
1. Repo’yu fork’layın  
2. Yeni bir branch oluşturun (`feature/ozellik-adi`)  
3. Değişikliklerinizi commit’leyin  
4. Pull request açın  

---

## 📄 Lisans  
MIT License © 2025 Sevgi Nur Öksüz & Elif Pazarbaşı
