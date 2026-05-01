import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const hasarTurleri = ["Çizik", "Kaza", "Cam Kırığı", "Diğer"];

export default function App() {
  const [fotograflar, setFotograflar] = useState<string[]>([]);
  const [hasarTuru, setHasarTuru] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  //  Kamera aç
  const kameraAc = async () => {
    const izin = await ImagePicker.requestCameraPermissionsAsync();

    if (!izin.granted) {
      Alert.alert("İzin Gerekli", "Kamera izni gerekli");
      return;
    }

    const sonuc = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!sonuc.canceled) {
      setFotograflar([...fotograflar, sonuc.assets[0].uri]);
    }
  };

  //  Galeri aç
  const galeriAc = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!izin.granted) {
      Alert.alert("İzin Gerekli", "Galeri izni gerekli");
      return;
    }

    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!sonuc.canceled) {
      setFotograflar([...fotograflar, sonuc.assets[0].uri]);
    }
  };

  //  foto sil
  const fotoSil = (index: number) => {
    setFotograflar(fotograflar.filter((_, i) => i !== index));
  };

  //  validation
  const dogrula = () => {
    if (!hasarTuru) {
      Alert.alert("Hata", "Lütfen hasar türü seçiniz");
      return false;
    }
    if (!aciklama.trim()) {
      Alert.alert("Hata", "Açıklama zorunludur");
      return false;
    }
    if (fotograflar.length === 0) {
      Alert.alert("Hata", "En az 1 fotoğraf eklemelisiniz");
      return false;
    }
    return true;
  };

  //  gönder
  const gonder = async () => {
    if (!dogrula()) return;

    setYukleniyor(true);

    setTimeout(() => {
      setYukleniyor(false);

      Alert.alert("Başarılı", "Hasar bildirimi gönderildi");

      setFotograflar([]);
      setHasarTuru("");
      setAciklama("");
    }, 1500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5", padding: 20 }}>
      {/* BAŞLIK */}
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 15 }}>
        Hasar Bildirimi
      </Text>

      {/* FORM CARD */}
      <View
        style={{
          backgroundColor: "white",
          padding: 15,
          borderRadius: 12,
          elevation: 3,
        }}
      >
        {/* HASAR TÜRÜ */}
        <Text style={{ marginBottom: 10, fontWeight: "600" }}>
          Hasar Türü
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {hasarTurleri.map((tur) => (
            <TouchableOpacity
              key={tur}
              onPress={() => setHasarTuru(tur)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 20,
                borderWidth: 1,
                margin: 5,
                backgroundColor:
                  hasarTuru === tur ? "#2563eb" : "white",
              }}
            >
              <Text
                style={{
                  color: hasarTuru === tur ? "white" : "black",
                }}
              >
                {tur}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AÇIKLAMA */}
        <Text style={{ marginTop: 15, marginBottom: 5, fontWeight: "600" }}>
          Açıklama
        </Text>

        <TextInput
          value={aciklama}
          onChangeText={setAciklama}
          placeholder="Hasarı detaylı açıklayın..."
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
            padding: 10,
            height: 80,
          }}
        />

        {/* FOTO BUTONLARI */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 15,
          }}
        >
          <TouchableOpacity
            onPress={kameraAc}
            style={{
              flex: 1,
              backgroundColor: "#1f2937",
              padding: 12,
              borderRadius: 10,
              marginRight: 5,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white" }}>📷 Kamera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={galeriAc}
            style={{
              flex: 1,
              backgroundColor: "#111827",
              padding: 12,
              borderRadius: 10,
              marginLeft: 5,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white" }}>🖼️ Galeri</Text>
          </TouchableOpacity>
        </View>

        {/* FOTOĞRAFLAR */}
        <ScrollView horizontal style={{ marginTop: 10 }}>
          {fotograflar.map((uri, index) => (
            <View key={index} style={{ marginRight: 10 }}>
              <Image
                source={{ uri }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 10,
                }}
              />

              <TouchableOpacity
                onPress={() => fotoSil(index)}
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  backgroundColor: "red",
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 12 }}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* GÖNDER */}
        <TouchableOpacity
          onPress={gonder}
          disabled={yukleniyor}
          style={{
            backgroundColor: yukleniyor ? "gray" : "#16a34a",
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
            alignItems: "center",
          }}
        >
          {yukleniyor ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Bildirimi Gönder
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}