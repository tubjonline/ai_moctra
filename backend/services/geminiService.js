const { GoogleGenAI } = require('@google/genai');
const sapoService = require('./sapoService');

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Conversation history in memory
const historyMap = new Map();

const systemInstruction = `Ban la nhan vien CSKH xuat sac cua Moc Tra Silk - Thuong hieu ao dai thiet ke cao cap.
Website: moctrasilk.com
Cua hang may do: Toa nha C2, So 14 Thuy Khue, Phuong Tay Ho, Thanh pho Ha Noi, Viet Nam.
Nhiem vu cua ban la tu van tan tinh, lich su, chuyen nghiep va chot sale hieu qua. Xung ho "Moc Tra" va "Anh/Chi".
Neu khach co thai do tieu cuc, dung tu ngu tuc tiu -> Goi ham 'trigger_handoff'.

THONG TIN QUAN TRONG DE TU VAN:
1. BANG SIZE AO DAI NGUOI LON
Size XS: Chieu cao 148-155cm, Nang 38-44kg, Nguc 76-80cm, Eo 58-62cm, Hong 82-86cm.
Size S: Chieu cao 150-158cm, Nang 40-47kg, Nguc 80-84cm, Eo 62-66cm, Hong 86-90cm.
Size M: Chieu cao 155-162cm, Nang 47-53kg, Nguc 84-88cm, Eo 66-70cm, Hong 90-94cm.
Size L: Chieu cao 158-165cm, Nang 53-60kg, Nguc 88-92cm, Eo 70-74cm, Hong 94-98cm.
Size XL: Chieu cao 160-168cm, Nang 60-68kg, Nguc 92-96cm, Eo 74-78cm, Hong 98-102cm.

2. BANG SIZE TRE EM
Size 2: 2-3 tuoi, Cao 92-98cm, Nang 10-14kg.
Size 4: 3-4 tuoi, Cao 100-110cm, Nang 15-20kg.
Size 6: 5-6 tuoi, Cao 110-120cm, Nang 20-24kg.
Size 8: 7-8 tuoi, Cao 120-130cm, Nang 26-30kg.
Size 10: 9-10 tuoi, Cao 130-140cm, Nang 34-38kg.
Size 12: 11-12 tuoi, Cao 140-150cm, Nang 40-45kg.

KICH BAN TU VAN 4 BUOC (BAN PHAI TUAN THU NGHIEM NGAT THEO THU TU):

BUOC 1 - CHAO HOI: Khi khach moi vao (chao hoi chung chung hoac bat dau cuoc tro chuyen), BAN PHAI GOI HAM 'welcome_screen'. KHONG tu tra loi bang van ban. Ham nay se tu dong hien thi loi chao va 3 nut chon doi tuong.

BUOC 2 - HIEN THI SAN PHAM: Khi khach chon doi tuong (vi du "Ao dai nu", "Ao dai nam", "Ao dai tre em"), BAN PHAI GOI HAM 'search_products' voi tu khoa tuong ung. San pham se hien thi kem nut "Dat hang". Khach nhan nut "Dat hang" se gui tin nhan "Toi muon mua mau: [ten san pham]". Khi nhan duoc tin nhan nay, chuyen sang BUOC 3.

BUOC 3 - LAY SO DO VA TU VAN SIZE: Hoi khach ve chieu cao, can nang, so do 3 vong (Nguc-Eo-Mong) de tu van size.
   3.1 Neu CO size phu hop: Chuyen sang BUOC 4.
   3.2 Neu KHONG co size phu hop: Goi ham 'add_to_waitlist' de gui vao danh sach cho CMS. Tra loi Y HET cau sau: "Voi so do hien tai, san pham co the khong vua hoan toan theo size tieu chuan. De dam bao form ao dep nhat, Moc Tra khuyen khich Anh/Chi den cua hang de may do theo so do rieng tai: Toa nha C2, So 14 Thuy Khue, Phuong Tay Ho, Thanh pho Ha Noi, Viet Nam."

BUOC 4 - CHOT DON: Hoi thong tin: Ho va ten, so dien thoai, dia chi nhan hang. Sau do goi ham 'create_draft_order'. Sau khi len don xong, hoi khach co muon dat them san pham nao khong va goi ham 'show_options' voi cac lua chon ["Dat them ao dai nu", "Dat them ao dai nam", "Dat them ao dai tre em"]. Neu khach chon dat them thi quay lai BUOC 2.

LUU Y DAC BIET: 
- Khi khach nhan "Bo khoi gio" (tin nhan "Toi bo chon mau..."), ban xac nhan da huy chon va moi ho xem mau khac.
- KHONG BAO GIO tu y nhay buoc. Phai lam tuan tu 1 -> 2 -> 3 -> 4.
- Khi khach noi "Xem them" thi goi lai ham search_products voi cung tu khoa.
`;

async function chat(userMessage, conversationId) {
  if (!historyMap.has(conversationId)) {
    historyMap.set(conversationId, []);
  }
  
  const chatHistory = historyMap.get(conversationId);
  
  const formattedHistory = chatHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        tools: [{
          functionDeclarations: [
            {
              name: "welcome_screen",
              description: "Hien thi man hinh chao mung voi loi chao chuan va 3 nut phan loai ao dai. Goi ham nay khi khach moi bat dau chat hoac chao hoi.",
              parameters: { type: "OBJECT", properties: {} }
            },
            {
              name: "search_products",
              description: "Tim kiem san pham (vd: ao dai nu, ao dai nam, ao dai tre em) de hien thi hinh anh va the san pham cho khach.",
              parameters: {
                type: "OBJECT",
                properties: { query: { type: "STRING" } },
                required: ["query"]
              }
            },
            {
              name: "show_options",
              description: "Hien thi cac nut bam lua chon (Quick Replies) cho khach hang tren man hinh chat.",
              parameters: {
                type: "OBJECT",
                properties: {
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Mang chua cac lua chon dang text"
                  }
                },
                required: ["options"]
              }
            },
            {
              name: "trigger_handoff",
              description: "Chuyen cho nhan vien CSKH khi khach yeu cau gap nguoi that hoac phan nan.",
              parameters: {
                type: "OBJECT",
                properties: { reason: { type: "STRING" } },
                required: ["reason"]
              }
            },
            {
              name: "create_draft_order",
              description: "Tao don hang nhap gui cho nhan vien CSKH sau khi khach chot mua hang.",
              parameters: {
                type: "OBJECT",
                properties: {
                  customerName: { type: "STRING", description: "Ten khach hang" },
                  phone: { type: "STRING", description: "So dien thoai" },
                  address: { type: "STRING", description: "Dia chi nhan hang" },
                  productName: { type: "STRING", description: "Ten san pham" },
                  size: { type: "STRING", description: "Size khach dat" },
                  totalPrice: { type: "NUMBER", description: "Tong tien" }
                },
                required: ["customerName", "phone", "productName", "size"]
              }
            },
            {
              name: "add_to_waitlist",
              description: "Gui thong tin khach hang vao danh sach cho (CMS) khi khong co size phu hop.",
              parameters: {
                type: "OBJECT",
                properties: {
                  customerMessage: { type: "STRING", description: "Thong tin khach hang va san pham muon mua" },
                  measurements: { type: "STRING", description: "So do cua khach hang" }
                },
                required: ["customerMessage"]
              }
            }
          ]
        }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      if (call.name === 'trigger_handoff') {
        return { handoff: true, reason: call.args.reason };
      }

      if (call.name === 'create_draft_order') {
        const orderSummary = "DON NHAP: Khach " + call.args.customerName + " (" + call.args.phone + ") dat " + call.args.productName + " size " + call.args.size + ".";
        const botText = "Da, Moc Tra da len don nhap thanh cong cho Anh/Chi. Cam on Anh/Chi da lua chon Moc Tra Silk. Anh/Chi co muon dat them san pham nao khong a?";
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          draftOrder: true, 
          orderData: call.args,
          text: botText,
          richMedia: { type: 'options', items: ["Dat them ao dai nu", "Dat them ao dai nam", "Dat them ao dai tre em"] }
        };
      }

      if (call.name === 'add_to_waitlist') {
        const botText = "Voi so do hien tai, san pham co the khong vua hoan toan theo size tieu chuan.\n\nDe dam bao form ao dep nhat, Moc Tra khuyen khich Anh/Chi den cua hang de may do theo so do rieng tai:\n\nToa nha C2, So 14 Thuy Khue, Phuong Tay Ho, Thanh pho Ha Noi, Viet Nam.\n\nMoc Tra da ghi nhan thong tin cua Anh/Chi. Nhan vien se lien he lai trong thoi gian som nhat a.";
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          waitlist: true, 
          waitlistData: call.args,
          text: botText 
        };
      }
      
      if (call.name === 'welcome_screen') {
        const botText = "Xin chao Anh/Chi, Moc Tra rat han hanh duoc phuc vu.\nHien tai Moc Tra cung cap nhieu dong ao dai nhu:\n\u2022 Ao dai nu\n\u2022 Ao dai nam\n\u2022 Ao dai tre em\n\nAnh/Chi co the tham khao cac mau moi tai: moctrasilk.com.\nMoc Tra san sang tu van de Anh/Chi lua chon duoc thiet ke phu hop nhat.\n\nAnh/Chi dang co nhu cau tim mau cho doi tuong nao a?";
        const options = ["Ao dai nu", "Ao dai nam", "Ao dai tre em"];
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { 
          handoff: false, 
          text: botText, 
          richMedia: { type: 'options', items: options } 
        };
      }

      if (call.name === 'show_options') {
        const options = call.args.options || [];
        const botText = response.text || "Da, Anh/Chi vui long chon mot trong cac tuy chon sau a:";
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: botText });
        
        return { handoff: false, text: botText, richMedia: { type: 'options', items: options } };
      }

      if (call.name === 'search_products') {
        const products = await sapoService.searchProducts(call.args.query);
        
        let textResponse = "";
        if (products.length > 0) {
          const inStockProducts = products.filter(p => p.inStock);
          const outOfStockProducts = products.filter(p => !p.inStock);
          textResponse = "Da, Moc Tra gui Anh/Chi mot so mau phu hop. Anh/Chi co the tham khao va nhan nut 'Dat hang' de chon mau ua thich nhe.";
          if (outOfStockProducts.length > 0) {
            textResponse += " (Luu y: Mot so mau hien dang het hang.)";
          }
        } else {
          textResponse = "Da, hien tai Moc Tra khong tim thay san pham nao khop voi yeu cau cua quy khach.";
        }
        
        chatHistory.push({ role: 'user', text: userMessage });
        chatHistory.push({ role: 'model', text: textResponse });
        
        return { handoff: false, text: textResponse, richMedia: { type: 'carousel', items: products } };
      }
    }

    const botText = response.text || "Da, Moc Tra dang xu ly yeu cau cua quy khach.";
    chatHistory.push({ role: 'user', text: userMessage });
    chatHistory.push({ role: 'model', text: botText });
    
    if (chatHistory.length > 30) chatHistory.splice(0, chatHistory.length - 30);

    return { handoff: false, text: botText };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { handoff: false, text: "Da, he thong dang gap chut su co, quy khach vui long thu lai sau giay lat a." };
  }
}

module.exports = { chat };
