# teknik-gorev-mobil

React Native (Expo) ile **fotoğraflı hasar bildirim formu**. Uygulama kodu `damage-report-app` klasöründedir.

## Özellikler (teknik görev uyumu)

| Beklenti | Durum |
|----------|--------|
| Kamera (`expo-camera`) ve galeri (`expo-image-picker`), izin yönetimi | Var |
| En az 3 fotoğraf, önizleme, silme | Var |
| Hasar türü chip seçimi (zorunlu) | Var |
| Form validasyonu; eksik alanda gönderim uyarısı | Var |
| Gönderimde loading; tamamlanınca onay ekranı | Var |
| `multipart/form-data` ile mock API (`https://postman-echo.com/post`) | Var |
| Yerel dosya URI (base64 gönderim yok) | Var |
| Bonus: fotoğraf üzerinde dokunarak hasar noktası | Var |
| Bonus: gönderim hatasında taslak kaydı (AsyncStorage) | Var |
| Bonus: geçmiş ekranı | Var |

## Kurulum

```bash
cd damage-report-app
npm install
npx expo start
```

Geliştirme için [Expo Go](https://expo.dev/go) veya `npx expo run:android` / `npx expo run:ios` kullanabilirsiniz. Kamera ve galeri için **fiziksel cihaz** önerilir (iOS Simulator’da gerçek kamera yoktur). Expo Go’da izinler, **Kamera** / **Galeri** düğmesine bastığınızda sistem tarafından sorulur; daha önce reddettiyseniz **Ayarlar → Expo Go → İzinler** üzerinden açmanız gerekir.

## Yapılandırma

- **Mock API**: `App.tsx` içinde `MOCK_API_URL` sabiti. Şu an [postman-echo.com/post](https://postman-echo.com/post) kullanılıyor (multipart POST için daha sorunsuz); gerçek backend için bu adresi değiştirmeniz yeterli.
- İzin metinleri `app.json` ve Expo config plugin’leriyle tanımlıdır.

## Ekran Görüntüleri

Uygulamanın iOS ve Android üzerinde test edilmiş ekran görüntülerine aşağıdaki linkten ulaşabilirsiniz:

🔗 Google Drive:  
https://drive.google.com/drive/folders/1kekWDA82pbDQA_Np0bjchstrVA3H7XKJ?usp=sharing


## Teknoloji

- Expo SDK 54, React Native 0.81, TypeScript  
- `expo-camera`, `expo-image-picker`, `@react-native-async-storage/async-storage`, `expo-constants`


