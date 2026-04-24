import ingredientsDb from '../data/ingredients.json';

const weights = [45, 25, 15]; // İlk 3 maddenin ağırlığı. Kalan %15 diğerlerine paylaştırılır.

export const analyzeIngredients = (ingredientsText) => {
  if (!ingredientsText || ingredientsText.trim() === '') return null;

  let textForProcessing = ingredientsText;
  let allergens = [];

  // Alerjen uyarılarını ve gereksiz bilgilendirmeleri çıkar
  const allergenPatterns = [
    /(?:eser miktarda|alerjen uyarısı).*?(?:\.|$)/gi,
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

  // Kuru madde vs. çıkar
  textForProcessing = textForProcessing.replace(/[^.]*kuru maddesi.*?(?:\.|$)/gi, ' ');

  // Normalizasyon fonksiyonu (Türkçe karakterleri ve aksanları kaldırır)
  const normalizeText = (text) => {
    return text.toLocaleLowerCase('tr-TR')
      .replace(/i̇/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/[\?]/g, '')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const rawList = textForProcessing
    .replace(/[()]/g, ',') // Parantez içindekileri de ayrı madde gibi değerlendir
    .split(/[,;\n.]/)
    .map(normalizeText)
    .filter((item) => item.length > 2);

  if (rawList.length === 0) return null;

  const analyzedItems = [];
  const seenIds = new Set();
  let totalScore = 0;

  // Ağırlık hesaplama
  const itemWeights = [];
  if (rawList.length === 1) {
    itemWeights.push(100);
  } else if (rawList.length === 2) {
    itemWeights.push(65, 35);
  } else if (rawList.length === 3) {
    itemWeights.push(50, 30, 20);
  } else {
    itemWeights.push(...weights);
    const remainingWeight = 15;
    const remainingCount = rawList.length - 3;
    for (let i = 0; i < remainingCount; i++) {
      itemWeights.push(remainingWeight / remainingCount);
    }
  }

  rawList.forEach((rawName, index) => {
    let matchedDbItem = null;

    // E-kodları ve isimlerde tam eşleşme arama
    for (const dbItem of ingredientsDb) {
      if (dbItem.names.some(n => {
        const nNorm = normalizeText(n);
        if (rawName === nNorm) return true;
        
        // Yanlış eşleşmeleri (surubu içinde su) önlemek için kelime sınırları (\b) kullanıyoruz.
        try {
          const regex = new RegExp(`\\b${nNorm}\\b`);
          return regex.test(rawName);
        } catch (e) {
          return rawName.includes(nNorm); // Fallback
        }
      })) {
        matchedDbItem = dbItem;
        break;
      }
    }

    const weight = itemWeights[index] || 1; 
    
    if (matchedDbItem) {
      if (seenIds.has(matchedDbItem.id)) {
        return; // Tekrar eden içeriği atla
      }
      seenIds.add(matchedDbItem.id);
      const itemScoreContribution = (weight / 100) * matchedDbItem.score;
      totalScore += itemScoreContribution;
      
      analyzedItems.push({
        rawName,
        matched: true,
        name: matchedDbItem.names[0].toUpperCase('tr-TR'),
        weight: weight.toFixed(1),
        score: matchedDbItem.score, // Bu maddenin bireysel risk skoru (0-100)
        contribution: itemScoreContribution.toFixed(1),
        description: matchedDbItem.description
      });
    } else {
      const unknownScore = 30; // Bilinmeyen madde ortalama risk
      const itemScoreContribution = (weight / 100) * unknownScore;
      totalScore += itemScoreContribution;

      analyzedItems.push({
        rawName,
        matched: false,
        name: rawName.toUpperCase('tr-TR'),
        weight: weight.toFixed(1),
        score: unknownScore,
        description: "Bu bileşen veritabanımızda henüz detaylandırılmamıştır. Eğer 'Su' veya 'Meyve' gibi doğal bir besinse endişe etmenize gerek yoktur; kimyasal bir katkı maddesi ise dikkatli tüketilmesi önerilir."
      });
    }
  });

  // Toplam Risk Skorunu 100 üzerinden sınırla
  totalScore = Math.min(100, Math.max(0, totalScore));
  
  // KULLANICIYA GÖSTERİLECEK TEMİZLİK SKORU (Cleanliness Score)
  const cleanScore = Math.round(100 - totalScore);

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
