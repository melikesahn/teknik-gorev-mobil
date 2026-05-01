import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { CameraView, Camera } from "expo-camera";
import Constants from "expo-constants";

const HASAR_TURLERI = ["Çizik", "Kaza", "Cam kırığı", "Diğer"];
const MIN_FOTO = 3;
const MAX_FOTO = 10;
const ONIZLEME_BOY = 96;
/** Echo sunucusu; POST + multipart destekler (httpbin bazen 405 verebiliyor). */
const MOCK_API_URL = "https://postman-echo.com/post";
const STORAGE_DRAFT = "hasar_bildirim_taslak";
const STORAGE_GECMIS = "hasar_bildirim_gecmis";
const BG = "#FF0E0E";
const TEXT = "#C20C0C";
const TEXT_POST = "#fff7ed";
const KART_BORDER = "#fed7aa";

type Marker = { x: number; y: number };
type YerelFoto = { uri: string; markers: Marker[] };
type Ekran = "form" | "basari" | "gecmis";

type GecmisKayit = {
  id: string;
  tarih: string;
  hasarTuru: string;
  aciklama: string;
  fotoSayisi?: number;
  ilkFotoUri?: string;
};

function mimeFromUri(uri: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

function dosyaAdi(i: number, uri: string): string {
  const tail = uri.split("/").pop()?.split("?")[0] ?? "";
  const ext = tail.includes(".") ? tail.split(".").pop() : "jpg";
  return `hasar_${i}.${ext ?? "jpg"}`;
}

export default function App() {
  const [ekran, setEkran] = useState<Ekran>("form");
  const [fotograflar, setFotograflar] = useState<YerelFoto[]>([]);
  const [hasarTuru, setHasarTuru] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderimDenendi, setGonderimDenendi] = useState(false);
  const [gecmis, setGecmis] = useState<GecmisKayit[]>([]);
  const [taslakVar, setTaslakVar] = useState(false);
  const [kameraModal, setKameraModal] = useState(false);
  const [kameraHazir, setKameraHazir] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  /** Başarı ekranında gösterilir (form sıfırlanmadan önce kaydedilir). */
  const [sonGonderilenFotoSayisi, setSonGonderilenFotoSayisi] = useState(0);

  const ustBosluk = (Constants.statusBarHeight ?? 0) + 8;

  const gecmisYukle = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_GECMIS);
      if (raw) setGecmis(JSON.parse(raw) as GecmisKayit[]);
    } catch {
      /* yoksay */
    }
  }, []);

  const taslakYukle = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_DRAFT);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        fotograflar?: YerelFoto[];
        hasarTuru?: string;
        aciklama?: string;
      };
      if (d.fotograflar?.length) setFotograflar(d.fotograflar);
      if (d.hasarTuru) setHasarTuru(d.hasarTuru);
      if (d.aciklama != null) setAciklama(d.aciklama);
      setTaslakVar(true);
    } catch {
      /* yoksay */
    }
  }, []);

  useEffect(() => {
    void gecmisYukle();
    void taslakYukle();
  }, [gecmisYukle, taslakYukle]);

  const taslakKaydet = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_DRAFT,
        JSON.stringify({ fotograflar, hasarTuru, aciklama })
      );
      setTaslakVar(true);
    } catch {
      /* yoksay */
    }
  };

  const taslakSil = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_DRAFT);
      setTaslakVar(false);
    } catch {
      
    }
  };

  const gecmisEkle = async (k: GecmisKayit) => {
    const yeni = [k, ...gecmis].slice(0, 50);
    setGecmis(yeni);
    try {
      await AsyncStorage.setItem(STORAGE_GECMIS, JSON.stringify(yeni));
    } catch {
      
    }
  };

  const ayarlaraGitUyari = (baslik: string, mesaj: string) => {
    Alert.alert(baslik, mesaj, [
      { text: "İptal", style: "cancel" },
      { text: "Ayarlara git", onPress: () => void Linking.openSettings() },
    ]);
  };

  const kameraModalAc = async () => {
    /** Expo Go dahil: hook yerine doğrudan istek — sistem diyalogu böyle çıkar. */
    const sonuc = await Camera.requestCameraPermissionsAsync();
    if (!sonuc.granted) {
      ayarlaraGitUyari(
        "Kamera izni",
        sonuc.canAskAgain === false
          ? "Daha önce izin reddedilmiş. Expo Go için Ayarlar’dan kamera iznini açın."
          : "Hasar fotoğrafı için kamera izni gerekli. İsterseniz Ayarlar’dan da açabilirsiniz."
      );
      return;
    }
    setKameraHazir(false);
    setKameraModal(true);
  };

  const kameraYakala = async () => {
    if (!cameraRef.current || !kameraHazir) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (pic?.uri && fotograflar.length < MAX_FOTO) {
        setFotograflar((p) => [...p, { uri: pic.uri, markers: [] }]);
      }
      setKameraModal(false);
    } catch (e) {
      Alert.alert("Kamera", "Fotoğraf alınamadı. Tekrar deneyin.");
    }
  };

  const galeriAc = async () => {
    let izinSonuc = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!izinSonuc.granted) {
      izinSonuc = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!izinSonuc.granted) {
      ayarlaraGitUyari(
        "Galeri izni",
        izinSonuc.canAskAgain === false
          ? "Foto seçmek için galeri izni gerekli. Ayarlar > Expo Go üzerinden fotoğrafları etkinleştirin."
          : "Hasar fotoğrafı seçmek için medya kitaplığı izni gerekli."
      );
      return;
    }
    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (sonuc.canceled || !sonuc.assets[0]?.uri) return;
    if (fotograflar.length >= MAX_FOTO) {
      Alert.alert("Limit", `En fazla ${MAX_FOTO} fotoğraf ekleyebilirsiniz.`);
      return;
    }
    setFotograflar((p) => [...p, { uri: sonuc.assets[0].uri, markers: [] }]);
  };

  const fotoSil = (index: number) => {
    setFotograflar((liste) => liste.filter((_, i) => i !== index));
  };

  const markerEkle = (index: number, x: number, y: number) => {
    const nx = Math.max(0, Math.min(1, x / ONIZLEME_BOY));
    const ny = Math.max(0, Math.min(1, y / ONIZLEME_BOY));
    setFotograflar((liste) =>
      liste.map((f, i) =>
        i === index ? { ...f, markers: [...f.markers, { x: nx, y: ny }] } : f
      )
    );
  };

  const markerleriTemizle = (index: number) => {
    setFotograflar((liste) =>
      liste.map((f, i) => (i === index ? { ...f, markers: [] } : f))
    );
  };

  const formGecerli =
    hasarTuru.length > 0 &&
    aciklama.trim().length > 0 &&
    fotograflar.length >= MIN_FOTO;

  const gonder = async () => {
    setGonderimDenendi(true);
    if (!formGecerli) {
      const eksik: string[] = [];
      if (!hasarTuru) eksik.push("hasar türü");
      if (!aciklama.trim()) eksik.push("açıklama");
      if (fotograflar.length < MIN_FOTO)
        eksik.push(`en az ${MIN_FOTO} yerel fotoğraf`);
      Alert.alert("Eksik bilgi", `Şunları tamamlayın: ${eksik.join(", ")}.`);
      return;
    }

    setYukleniyor(true);
    const markersJson = JSON.stringify(
      fotograflar.map((f) => ({ uri: f.uri, markers: f.markers }))
    );

    const formData = new FormData();
    formData.append("damageType", hasarTuru);
    formData.append("description", aciklama.trim());
    formData.append("markersJson", markersJson);
    formData.append("platform", Platform.OS);

    fotograflar.forEach((f, i) => {
      const type = mimeFromUri(f.uri);
      formData.append(`photo_${i}`, {
        uri: f.uri,
        name: dosyaAdi(i, f.uri),
        type,
      } as unknown as Blob);
    });

    try {
      const res = await fetch(MOCK_API_URL, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
/**
 * form data kontrolü 
      const data = await res.json();
      console.log("FILES:", data.files);
      console.log("FORM:", data.form);*/

      const gonderilenFoto = fotograflar.length;
      await taslakSil();
      await gecmisEkle({
        id: String(Date.now()),
        tarih: new Date().toISOString(),
        hasarTuru,
        aciklama: aciklama.trim(),
        fotoSayisi: gonderilenFoto,
        ilkFotoUri: fotograflar[0]?.uri,
      });
      setSonGonderilenFotoSayisi(gonderilenFoto);
      setFotograflar([]);
      setHasarTuru("");
      setAciklama("");
      setGonderimDenendi(false);
      setEkran("basari");
    } catch {
      await taslakKaydet();
      Alert.alert(
        "Gönderilemedi",
        "Ağ hatası veya sunucu yanıt vermedi. Form taslak olarak kaydedildi; interneti kontrol edip tekrar deneyebilirsiniz."
      );
    } finally {
      setYukleniyor(false);
    }
  };

  if (ekran === "basari") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          padding: 24,
          paddingTop: ustBosluk,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#fff" }}>
          Bildirim alındı
        </Text>
        <Text style={{ marginTop: 12, fontSize: 16, color: TEXT_POST }}>
          Hasar kaydınız multipart/form-data ile test sunucusuna iletildi.
          Teşekkürler.
        </Text>
        <Text
          style={{
            marginTop: 14,
            fontSize: 17,
            fontWeight: "700",
            color: "#fff",
          }}
        >
          {sonGonderilenFotoSayisi} fotoğraf gönderildi.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setSonGonderilenFotoSayisi(0);
            setEkran("form");
          }}
          style={{
            marginTop: 28,
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: "#ffedd5",
            shadowColor: "#000",
            shadowOpacity: 0.14,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          }}
        >
          <Text style={{ color: TEXT, fontWeight: "700" }}>Yeni bildirim</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            void gecmisYukle();
            setEkran("gecmis");
          }}
          style={{
            marginTop: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Geçmişe git</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (ekran === "gecmis") {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: ustBosluk }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity onPress={() => setEkran("form")}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>← Form</Text>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "700",
              color: "#fff",
            }}
          >
            Geçmiş
          </Text>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {gecmis.length === 0 ? (
            <Text style={{ color: "#6b7280" }}>Henüz kayıtlı bildirim yok.</Text>
          ) : (
            gecmis.map((k) => (
              <View
                key={k.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: KART_BORDER,
                  padding: 14,
                  marginBottom: 12,
                  elevation: 3,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <Text style={{ fontWeight: "700" }}>{k.hasarTuru}</Text>
                <Text style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>
                  {new Date(k.tarih).toLocaleString("tr-TR")}
                  {typeof k.fotoSayisi === "number"
                    ? ` · ${k.fotoSayisi} fotoğraf`
                    : ""}
                </Text>
                <Text style={{ marginTop: 8 }} numberOfLines={3}>
                  {k.aciklama}
                </Text>
                {k.ilkFotoUri ? (
                  <Image
                    source={{ uri: k.ilkFotoUri }}
                    style={{
                      width: "100%",
                      height: 140,
                      marginTop: 10,
                      borderRadius: 8,
                    }}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: ustBosluk }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#fff" }}>
            Hasar bildirimi
          </Text>
          <TouchableOpacity
            onPress={() => {
              void gecmisYukle();
              setEkran("gecmis");
            }}
            style={{
              backgroundColor: "#fff",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#ffedd5",
            }}
          >
            <Text style={{ color: TEXT, fontWeight: "700" }}>Geçmiş</Text>
          </TouchableOpacity>
        </View>

        {taslakVar ? (
          <View
            style={{
              backgroundColor: TEXT_POST,
              padding: 12,
              borderRadius: 10,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#fdba74",
            }}
          >
            <Text style={{ flex: 1, color: TEXT }}>
              Son gönderimden kalan taslak yüklü.
            </Text>
            <TouchableOpacity onPress={() => void taslakSil()}>
              <Text style={{ color: TEXT, fontWeight: "700" }}>Sil</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: KART_BORDER,
            elevation: 4,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Text style={{ marginBottom: 10, fontWeight: "600" }}>
            Hasar türü <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {HASAR_TURLERI.map((tur) => (
              <TouchableOpacity
                key={tur}
                onPress={() => setHasarTuru(tur)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: hasarTuru === tur ? BG : "#fed7aa",
                  backgroundColor: hasarTuru === tur ? BG : "#fff",
                  shadowColor: "#000",
                  shadowOpacity: hasarTuru === tur ? 0.12 : 0.04,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: hasarTuru === tur ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    color: hasarTuru === tur ? "#fff" : "#111827",
                    fontWeight: "500",
                  }}
                >
                  {tur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {gonderimDenendi && !hasarTuru ? (
            <Text style={{ color: "#dc2626", marginTop: 6, fontSize: 12 }}>
              Hasar türü seçilmeli.
            </Text>
          ) : null}

          <Text style={{ marginTop: 16, marginBottom: 6, fontWeight: "600" }}>
            Açıklama <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <TextInput
            value={aciklama}
            onChangeText={setAciklama}
            placeholder="Hasarı detaylı açıklayın..."
            multiline
            style={{
              borderWidth: 1,
              borderColor: gonderimDenendi && !aciklama.trim() ? "#f87171" : "#ddd",
              borderRadius: 10,
              padding: 12,
              minHeight: 88,
              textAlignVertical: "top",
              backgroundColor: "#fffaf5",
            }}
          />
          {gonderimDenendi && !aciklama.trim() ? (
            <Text style={{ color: "#dc2626", marginTop: 6, fontSize: 12 }}>
              Açıklama zorunludur.
            </Text>
          ) : null}

          <Text style={{ marginTop: 16, marginBottom: 6, fontWeight: "600" }}>
            Fotoğraflar (yerel, kamera veya galeri){" "}
            <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            En az {MIN_FOTO} fotoğraf; önizlemede dokunarak hasar noktası
            ekleyebilirsiniz (kırmızı nokta). En fazla {MAX_FOTO} fotoğraf.
          </Text>

          <View
            style={{
              backgroundColor:
                fotograflar.length >= MIN_FOTO ? "#fff" : TEXT_POST,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor:
                fotograflar.length >= MIN_FOTO ? "#fdba74" : "#fb923c",
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827" }}>
              Eklenen fotoğraf: {fotograflar.length} / {MAX_FOTO}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: "#374151" }}>
              {fotograflar.length >= MIN_FOTO ? (
                <>
                  Göndermek için yeterli (en az {MIN_FOTO}). İsterseniz daha
                  fazla ekleyebilirsiniz.
                </>
              ) : (
                <>
                  Göndermek için en az {MIN_FOTO} fotoğraf gerekli (
                  {MIN_FOTO - fotograflar.length} eksik).
                </>
              )}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => void kameraModalAc()}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                padding: 12,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#fdba74",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <Text style={{ color: TEXT, fontWeight: "700" }}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void galeriAc()}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                padding: 12,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#fdba74",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <Text style={{ color: TEXT, fontWeight: "700" }}>Galeri</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 14,
            }}
          >
            {fotograflar.map((f, index) => (
              <View key={`${f.uri}-${index}`} style={{ width: ONIZLEME_BOY }}>
                <Pressable
                  onPress={(e) => {
                    const { locationX, locationY } = e.nativeEvent;
                    markerEkle(index, locationX, locationY);
                  }}
                >
                  <Image
                    source={{ uri: f.uri }}
                    style={{
                      width: ONIZLEME_BOY,
                      height: ONIZLEME_BOY,
                      borderRadius: 10,
                      backgroundColor: "#e5e7eb",
                      borderWidth: 1.5,
                      borderColor: "#fdba74",
                    }}
                  />
                  {f.markers.map((m, mi) => (
                    <View
                      key={mi}
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: m.x * ONIZLEME_BOY - 6,
                        top: m.y * ONIZLEME_BOY - 6,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: "#dc2626",
                        borderWidth: 2,
                        borderColor: "#fff",
                      }}
                    />
                  ))}
                </Pressable>
                <TouchableOpacity
                  onPress={() => fotoSil(index)}
                  style={{
                    position: "absolute",
                    right: -4,
                    top: -4,
                    backgroundColor: "#dc2626",
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                    ×
                  </Text>
                </TouchableOpacity>
                {f.markers.length > 0 ? (
                  <TouchableOpacity onPress={() => markerleriTemizle(index)}>
                    <Text style={{ fontSize: 11, color: TEXT, marginTop: 4 }}>
                      İşaretleri temizle
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
          {gonderimDenendi && fotograflar.length < MIN_FOTO ? (
            <Text style={{ color: "#dc2626", marginTop: 8, fontSize: 12 }}>
              En az {MIN_FOTO} yerel fotoğraf ekleyin (URL ile değil).
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={() => void gonder()}
            disabled={yukleniyor || !formGecerli}
            style={{
              backgroundColor: "#fff",
              padding: 15,
              borderRadius: 12,
              marginTop: 22,
              alignItems: "center",
              opacity: yukleniyor || !formGecerli ? 0.7 : 1,
              borderWidth: 1.5,
              borderColor: "#fdba74",
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 3,
            }}
          >
            {yukleniyor ? (
              <ActivityIndicator color={TEXT} />
            ) : (
              <Text style={{ color: TEXT, fontWeight: "700" }}>
                Bildirimi gönder
              </Text>
            )}
          </TouchableOpacity>
          {!formGecerli && !yukleniyor ? (
            <Text style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Göndermek için tüm zorunlu alanlar ve en az {MIN_FOTO} fotoğraf
              tamamlanmalıdır.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={kameraModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
            mode="picture"
            mute
            onCameraReady={() => setKameraHazir(true)}
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: 32,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <TouchableOpacity
              onPress={() => setKameraModal(false)}
              style={{ padding: 12 }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void kameraYakala()}
              disabled={!kameraHazir || fotograflar.length >= MAX_FOTO}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor:
                  kameraHazir && fotograflar.length < MAX_FOTO
                    ? "#fff"
                    : "#6b7280",
                borderWidth: 4,
                borderColor: "#e5e7eb",
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
