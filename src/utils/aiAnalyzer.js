import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: {
            type: SchemaType.STRING,
            description: "Maddenin normalize edilmiş, küçük harfli ve boşluk yerine alt tire (_) kullanan benzersiz kimliği. Örn: glikoz_surubu"
          },
          name: {
            type: SchemaType.STRING,
            description: "Kullanıcıya gösterilecek düzgün formatlı ve Türkçe isim. Örn: Glikoz Şurubu"
          },
          score: {
            type: SchemaType.NUMBER,
            description: "Sağlık risk skoru. 0 (Tamamen sağlıklı/doğal) ile 100 (Çok tehlikeli/kanserojen) arasında bir değer."
          },
          description: {
            type: SchemaType.STRING,
            description: "Bu maddenin sağlığa etkisi hakkında kısa, anlaşılır ve bilimsel bir açıklama (1-2 cümle)."
          }
        },
        required: ["id", "name", "score", "description"]
      }
    }
  }
});

// Ağırlık Dağılımı (İlk 3 madde daha fazla etkiler)
const weights = [45, 25, 15];

// Metin Normalizasyonu
const normalizeText = (text) => {
  return text.toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/[\?]/g, '')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export const analyzeIngredientsAsync = async (ingredientsText) => {
  if (!ingredientsText || ingredientsText.trim() === '') return null;

  let textForProcessing = ingredientsText;
  let allergens = [];

  // 1. Alerjen ve gereksiz bilgileri ayıklama
  const allergenPatterns = [
    /(?:eser miktarda|alerjen uyarısı|alerjen|dikkat).*?(?:\.|$)/gi,
    /[^.]*içerebilir(?:\.|$)/gi
  ];

  allergenPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(textForProcessing)) !== null) {
      const matchedText = match[0].trim();
      if (matchedText.length > 0) {
         if (!allergens.includes(matchedText)) {
           allergens.push(matchedText);
         }
         textForProcessing = textForProcessing.replace(match[0], ' ');
      }
    }
  });

  // Kuru madde vb. gereksiz kısımları sil
  textForProcessing = textForProcessing.replace(/[^.]*kuru maddesi.*?(?:\.|$)/gi, ' ');

  // 2. Metni virgül ve noktalara göre bölme
  const rawList = textForProcessing
    .replace(/[()]/g, ',') // Parantez içlerini de ayrı madde gibi değerlendir
    .split(/[,;\n.]/)
    .map(t => t.trim())
    .filter((item) => item.length > 2);

  if (rawList.length === 0) return null;

  // 3. Veritabanından (Firestore) maddeleri sorgulama
  const dbResults = [];
  const unknownIngredients = [];
  const normalizedKeys = [];

  // Ağırlık hesabı için indexleri korumamız lazım, o yüzden sırayla işliyoruz
  for (let i = 0; i < rawList.length; i++) {
    const rawItem = rawList[i];
    const normKey = normalizeText(rawItem).replace(/\s+/g, '_');
    
    // Aynı maddeyi iki kere eklememek için kontrol
    if (normalizedKeys.includes(normKey)) continue;
    normalizedKeys.push(normKey);

    try {
      const docRef = doc(db, 'ingredients', normKey);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Veritabanında var
        dbResults.push({
          rawName: rawItem,
          index: i, // Ağırlık için orijinal sırasını tutuyoruz
          data: docSnap.data()
        });
      } else {
        // Veritabanında yok, yapay zekaya sorulacak
        unknownIngredients.push({
          rawName: rawItem,
          normKey: normKey,
          index: i
        });
      }
    } catch (error) {
      console.error("Firestore okuma hatası:", error);
      // Hata olursa yapay zekaya devret
      unknownIngredients.push({
        rawName: rawItem,
        normKey: normKey,
        index: i
      });
    }
  }

  // 4. Bilinmeyen maddeler varsa Yapay Zekaya sor
  if (unknownIngredients.length > 0) {
    const aiPromptList = unknownIngredients.map(item => item.rawName).join(", ");
    const prompt = `Sen uzman bir gıda mühendisi ve diyetisyensin. Aşağıdaki gıda katkı maddelerinin veya bileşenlerinin sağlığa etkilerini analiz et. 
Sıradan besinler (su, tuz, un, doğal meyve vs) için düşük skor (0-30), kimyasal katkılar için zararına göre yüksek skor (30-100) ver.
Analiz edilecek maddeler: ${aiPromptList}`;

    try {
      const result = await model.generateContent(prompt);
      const jsonResponse = JSON.parse(result.response.text());
      
      // Gelen cevapları veritabanına kaydet ve dbResults'a ekle
      for (let i = 0; i < jsonResponse.length; i++) {
        const aiData = jsonResponse[i];
        // Unknown listeden orijinal veriyi bulalım
        const unknownMatch = unknownIngredients.find(u => 
          normalizeText(u.rawName).includes(normalizeText(aiData.name)) || 
          normalizeText(aiData.name).includes(normalizeText(u.rawName)) ||
          normalizeText(aiData.id).includes(u.normKey)
        ) || unknownIngredients[i]; // Eşleşme bulamazsak sıradakini al

        const finalData = {
          name: aiData.name,
          score: aiData.score,
          description: aiData.description
        };

        // Firestore'a kaydet (Gelecek sorgularda AI kullanılmayacak!)
        try {
          await setDoc(doc(db, 'ingredients', unknownMatch.normKey), finalData);
        } catch (e) {
          console.error("Firestore yazma hatası:", e);
        }

        dbResults.push({
          rawName: unknownMatch.rawName,
          index: unknownMatch.index,
          data: finalData
        });
      }
    } catch (error) {
      console.error("Gemini API Hatası:", error);
      // AI çökse bile uygulamanın çalışması için varsayılan bir veri üret
      unknownIngredients.forEach(item => {
        dbResults.push({
          rawName: item.rawName,
          index: item.index,
          data: {
            name: item.rawName.toUpperCase(),
            score: 30, // Bilinmeyen madde
            description: "Analiz edilemedi veya veritabanında bulunamadı."
          }
        });
      });
    }
  }

  // 5. Sonuçları orijinal sıraya göre diz
  dbResults.sort((a, b) => a.index - b.index);

  // 6. Ağırlık ve Toplam Skor Hesaplama
  const analyzedItems = [];
  let totalScore = 0;
  
  const itemWeights = [];
  if (dbResults.length === 1) {
    itemWeights.push(100);
  } else if (dbResults.length === 2) {
    itemWeights.push(65, 35);
  } else if (dbResults.length === 3) {
    itemWeights.push(50, 30, 20);
  } else {
    itemWeights.push(...weights);
    const remainingWeight = 15;
    const remainingCount = dbResults.length - 3;
    for (let i = 0; i < remainingCount; i++) {
      itemWeights.push(remainingWeight / remainingCount);
    }
  }

  dbResults.forEach((resultItem, idx) => {
    const weight = itemWeights[idx] || 1;
    const itemScoreContribution = (weight / 100) * resultItem.data.score;
    totalScore += itemScoreContribution;

    // YENİ: Katkı Maddesi Ceza Sistemi
    // Miktarı (ağırlığı) ne kadar az olursa olsun, zararlı bir madde varsa ekstra risk ekliyoruz.
    if (resultItem.data.score >= 75) {
      totalScore += 8; // Çok zararlı/kanserojen maddelere sert ceza
    } else if (resultItem.data.score >= 55) {
      totalScore += 4; // Orta zararlı katkılara hafif ceza
    }

    analyzedItems.push({
      name: resultItem.data.name,
      weight: weight.toFixed(1),
      score: resultItem.data.score,
      description: resultItem.data.description
    });
  });

  // Toplam Risk Skorunu 100 üzerinden sınırla
  totalScore = Math.min(100, Math.max(0, totalScore));
  
  // KULLANICIYA GÖSTERİLECEK TEMİZLİK SKORU
  let cleanScore = Math.round(100 - totalScore);

  // YENİ: Zehir (Tavan) Sınırlandırması
  // Eğer ürünün içinde 85 ve üzeri riskli çok tehlikeli bir madde varsa, 
  // ürünün temizlik skoru ASLA %40'ı geçemez (Ne kadar doğal fıstık içerdiği önemsizdir).
  const highestRisk = Math.max(...dbResults.map(r => r.data.score));
  if (highestRisk >= 85 && cleanScore > 35) {
    cleanScore = 35; 
  } else if (highestRisk >= 70 && cleanScore > 49) {
    cleanScore = 49; 
  }

  // Temizlik Sınıfı Belirleme
  let riskLevel = "Tamamen Doğal İçerikli Ürün";
  let color = "text-emerald-500";
  let barColor = "bg-emerald-500";
  
  if (cleanScore === 100) {
    riskLevel = "Tamamen Doğal İçerikli Ürün";
    color = "text-emerald-500";
    barColor = "bg-emerald-500";
  } else if (cleanScore >= 80) {
    riskLevel = "Temiz İçerik";
    color = "text-green-500";
    barColor = "bg-green-500";
  } else if (cleanScore >= 50) {
    riskLevel = "Orta Düzey Temiz İçerik";
    color = "text-yellow-500";
    barColor = "bg-yellow-500";
  } else if (cleanScore >= 25) {
    riskLevel = "Ultra İşlenmiş İçerik";
    color = "text-orange-500";
    barColor = "bg-orange-500";
  } else {
    riskLevel = "Zararlı / Yüksek Katkılı İçerik";
    color = "text-red-600";
    barColor = "bg-red-600";
  }

  return {
    score: cleanScore,
    riskLevel,
    color,
    barColor,
    allergens,
    items: analyzedItems
  };
};
