# 💳 Xsolla Ödeme Sistemi Kurulum Rehberi

## 🎯 Genel Bakış
Soldare.io oyununda kalıcı satın almalar ($2.99) için Xsolla Pay Station entegrasyonu yapıldı.

## 📋 Özellikler
- ✅ **+10 Süre (Kalıcı)**: Kalkan ve silahlara kalıcı +10sn bonus
- ✅ **x2 Altın (Kalıcı)**: Oyun sonunda kalıcı 2 kat altın
- ✅ **Güvenli Ödeme**: Xsolla'nın güvenli ödeme altyapısı
- ✅ **Türkiye Desteği**: Türkiye'de kullanılabilir
- ✅ **Çoklu Ödeme**: Kredi kartı, banka kartı, cüzdan vb.

---

## 🚀 Xsolla Hesabı Kurulumu

### 1. Xsolla Publisher Account Oluştur
1. https://publisher.xsolla.com/ adresine git
2. "Sign Up" ile ücretsiz hesap oluştur
3. Email doğrulaması yap

### 2. Yeni Proje Oluştur
1. Publisher Account'a giriş yap
2. "Projects" → "Create New Project"
3. Proje adı: **Soldare.io**
4. Proje tipi: **Game**
5. Kaydet

### 3. Pay Station Ayarları
1. Sol menüden **"Pay Station"** seçeneğine tıkla
2. **"Settings"** → **"General"**:
   - Pay Station mode: **Sandbox** (test için) veya **Live** (production)
   - Currency: **USD**
   - Language: **Turkish (tr)**
3. **"Webhook URL"** ayarla:
   ```
   http://YOUR_DOMAIN/api/xsolla-webhook
   ```
   (Localhost için: `http://localhost:3000/api/xsolla-webhook`)

### 4. Ürünleri (Virtual Items) Ekle
1. Sol menüden **"Store"** → **"Virtual Items"**
2. İki ürün ekle:

#### Ürün 1: +10 Süre (Kalıcı)
- **SKU**: `BONUS_DURATION_PERM`
- **Name**: +10 Süre (Kalıcı)
- **Description**: Kalkan ve silahlara kalıcı +10sn bonus
- **Price**: $2.99 USD
- **Type**: Non-consumable (Permanent)

#### Ürün 2: x2 Altın (Kalıcı)
- **SKU**: `GOLD_MULTIPLIER_PERM`
- **Name**: x2 Altın (Kalıcı)
- **Description**: Oyun sonunda kalıcı 2 kat altın
- **Price**: $2.99 USD
- **Type**: Non-consumable (Permanent)

### 5. API Anahtarlarını Al
1. Sol menüden **"Company Settings"** → **"API Keys"**
2. Şu bilgileri not et:
   - **Project ID**: (Örnek: 12345)
   - **Merchant ID**: (Örnek: 67890)
   - **API Key**: (Örnek: abc123def456...)

---

## 🔧 Oyun Ayarları

### config.json Dosyasını Güncelle
`config.json` dosyasını aç ve Xsolla bilgilerini ekle:

```json
{
  "GOOGLE_CLIENT_ID": "YOUR_GOOGLE_CLIENT_ID",
  "XSOLLA_PROJECT_ID": "12345",
  "XSOLLA_MERCHANT_ID": "67890",
  "XSOLLA_API_KEY": "abc123def456..."
}
```

⚠️ **Güvenlik Notu**: Bu dosyayı `.gitignore`'a ekle, GitHub'a yükleme!

---

## 🧪 Test Modu

### Sandbox (Test) Modu
Xsolla otomatik olarak **Sandbox** modunda başlar. Test için:

1. Oyunu başlat: `node server.js`
2. http://localhost:3000 adresi aç
3. Google hesabıyla giriş yap
4. Mağazayı aç (ESC tuşu)
5. "Kalıcı ($2.99)" butonuna bas

### Test Kartları
Xsolla'nın test kartlarını kullan:
- **Başarılı ödeme**: `4111 1111 1111 1111`
- **Başarısız ödeme**: `4000 0000 0000 0002`
- **CVV**: Herhangi 3 rakam
- **Tarih**: Gelecekteki herhangi bir tarih

### Test İzleme
Publisher Account'ta **"Transactions"** bölümünden test ödemelerini görebilirsin.

---

## 🌍 Production'a Geçiş

### 1. Sandbox'tan Live'a Geç
Publisher Account'ta:
1. **Pay Station** → **Settings** → **General**
2. **Mode**: Sandbox → **Live**
3. Kaydet

### 2. Webhook URL'i Güncelle
```
https://yourdomain.com/api/xsolla-webhook
```

### 3. SSL Sertifikası
Production için SSL gerekli (HTTPS). Let's Encrypt gibi ücretsiz seçenekler:
```bash
npm install -g certbot
certbot certonly --standalone -d yourdomain.com
```

### 4. Domain Ayarları
server.js'de return_url güncelle:
```javascript
return_url: `https://yourdomain.com`
```

---

## 📊 Ödeme Akışı

### Kullanıcı Tarafı
1. Oyuncu "Kalıcı ($2.99)" butonuna basar
2. Xsolla Pay Station popup açılır
3. Ödeme bilgilerini girer
4. Ödeme tamamlanır
5. Otomatik olarak hesabına tanımlanır

### Server Tarafı
1. `/api/create-xsolla-payment` → Ödeme token'ı oluştur
2. Client Xsolla widget'ını açar
3. Ödeme tamamlanınca `/api/xsolla-webhook` → Webhook gelir
4. Server kullanıcıya kalıcı özelliği tanımlar
5. `highscores.json` güncellenir

---

## 🔍 Sorun Giderme

### "Xsolla widget not loaded" Hatası
- Xsolla script'i yüklenmemiş
- `public/index.html`'de script var mı kontrol et:
  ```html
  <script src="https://static.xsolla.com/embed/paystation/1.2.3/widget.min.js"></script>
  ```

### "Token creation failed" Hatası
- API anahtarları yanlış mı kontrol et
- Xsolla Project ID doğru mu?
- Webhook URL ayarlandı mı?

### Webhook Gelmiyor
- Publisher Account'ta Webhook URL doğru mu?
- URL'e erişim var mı? (Public IP gerekli)
- Server loglarına bak: `/api/xsolla-webhook` endpoint'i çalışıyor mu?

### Ödeme Başarılı Ama Oyunda Yansımıyor
- Webhook geldi mi kontrol et (server log'lara bak)
- Email doğru mu?
- `highscores.json` güncellendi mi?

---

## 💰 Komisyon Bilgisi

Xsolla komisyon oranları (2024):
- **Standart**: %5 + $0.10 işlem başına
- **Premium**: %3.5 (yüksek hacimde)

---

## 📞 Destek

### Xsolla Destek
- Email: support@xsolla.com
- Doküman: https://developers.xsolla.com/
- Discord: https://discord.gg/xsolla

### Oyun Desteği
- Geliştirici: [Your Email]
- GitHub: [Your Repo]

---

## ✅ Checklist

Xsolla kurulumu için:
- [ ] Xsolla Publisher Account oluşturuldu
- [ ] Proje oluşturuldu
- [ ] Virtual Items (ürünler) eklendi
- [ ] API anahtarları alındı
- [ ] `config.json` güncellendi
- [ ] Webhook URL ayarlandı
- [ ] Sandbox'ta test edildi
- [ ] Production'a geçildi (canlı kullanım için)

---

## 🎮 Test Senaryosu

1. ✅ Google hesabıyla giriş yap
2. ✅ Oyunu oyna, altın kazan
3. ✅ ESC tuşuna bas, mağazayı aç
4. ✅ "+10 Süre Kalıcı ($2.99)" butonuna bas
5. ✅ Xsolla popup açıldı mı?
6. ✅ Test kartıyla ödeme yap
7. ✅ Başarılı mesajı göründü mü?
8. ✅ Oyuna geri dön, özellik aktif mi?

---

**Not**: Bu entegrasyon sandbox modda hazır. Production için yukarıdaki adımları takip edin!
