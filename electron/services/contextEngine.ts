import { db } from '../db/database';
import { GenerateReplyRequest, KnowledgeItem, Persona, Contact } from '../types';

export class ContextEngine {
  /**
   * Match relevant Knowledge Base items based on message keywords
   */
  public findRelevantKnowledge(messageText: string): KnowledgeItem[] {
    const items = db.getKnowledgeItems().filter(item => item.isActive);
    const lowerText = messageText.toLowerCase();

    const scoredItems: Array<{ item: KnowledgeItem; score: number }> = [];

    for (const item of items) {
      let score = 0;

      // Check keyword matches
      for (const kw of item.keywords) {
        if (lowerText.includes(kw.toLowerCase())) {
          score += 3;
        }
      }

      // Check title match
      if (lowerText.includes(item.title.toLowerCase())) {
        score += 5;
      }

      // Check content match
      const contentWords = item.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const word of contentWords) {
        if (lowerText.includes(word)) {
          score += 0.5;
        }
      }

      if (score > 1.5) {
        scoredItems.push({ item, score });
      }
    }

    // Sort by relevance score descending
    scoredItems.sort((a, b) => b.score - a.score);
    return scoredItems.slice(0, 3).map(s => s.item);
  }

  /**
   * Resolve Persona for a contact or request
   */
  public resolvePersona(req: GenerateReplyRequest, contact?: Contact | null): Persona {
    if (req.personaId) {
      const p = db.getPersonaById(req.personaId);
      if (p) return p;
    }

    const targetCategory = req.contactCategory || (contact ? contact.category : 'customer');

    if (contact && contact.personaId) {
      const p = db.getPersonaById(contact.personaId);
      if (p && p.category === targetCategory) return p;
    }

    return db.getPersonaByCategory(targetCategory);
  }


  /**
   * Build complete LLM Prompt
   */
  public buildPrompt(
    req: GenerateReplyRequest,
    persona: Persona,
    matchedKnowledge: KnowledgeItem[],
    contact?: Contact | null
  ): { systemInstruction: string; userPrompt: string } {
    const settings = db.getSettings();

    // 1. System Instruction
    const systemInstruction = `BẠN ĐANG ĐÓNG VAI CHỦ TÀI KHOẢN: HOÀNG KỲ ANH ĐỂ NHẮN TIN QUA LẠI TRÊN ${req.platform.toUpperCase()}.

=== 👤 HỒ SƠ & BẢN SẮC CHỦ TÀI KHOẢN (HOÀNG KỲ ANH - GEN Z) ===
- Tên: Hoàng Kỳ Anh (nam, sinh viên năm 3 ngành Kỹ thuật Phần mềm tại FPT University, Hà Nội).
- Nghề nghiệp / Định hướng: Software Engineer (Java/Spring Boot, Node.js/Express, React, Flutter, Electron+TS, MongoDB, REST API, JWT, AI tools...), kiêm BA & Team Leader.
- Dự án tiêu biểu: Homestay Management System (phân quyền, quản lý phòng, đặt cọc, QR Pay, xử lý concurrency nhiều người đặt cùng lúc...).
- Ngoại ngữ & Mục tiêu: Học tiếng Anh thực chiến (mục tiêu IELTS 8.0), học tiếng Hàn (mục tiêu TOPIK 6, hướng Bridge Engineer IT).
- Sở thích & Đam mê:
  + Cầu lông (dự án Kỳ Anh Badminton, series 100 ngày dạy cầu lông).
  + Bida, chơi game, nấu ăn, tụ tập bạn bè ăn uống nói chuyện.
  + Sáng tạo nội dung (Content Creator: TikTok, YouTube, CapCut, review đồ ăn, review địa điểm, gaming, video tương tác thử thách cùng người xem).
  + Kinh doanh & Đầu tư: F&B, homestay, bida, sản phẩm thể thao, thiết bị âm thanh/loa, kiếm tiền online.
- Nơi sống: Hà Nội (gần FPT University).
- Triết lý sống: Thực tế, dám nghĩ dám làm, làm trước -> sai -> sửa -> tiến bộ. Thích cuộc sống tự do, không gian riêng tư, bếp rộng mời bạn bè.

=== 🎯 PHONG CÁCH VÀ NGUYÊN TẮC NHẮN TIN (CỰC KỲ QUAN TRỌNG) ===
1. GIỐNG NGƯỜI THẬT 100% - CHUẨN GEN Z VIỆT NAM:
   - Nhắn tin tự nhiên, đời thường, gãy gọn như người trẻ nhắn tin trên Messenger/Zalo.
   - TUYỆT ĐỐI KHÔNG viết văn mẫu dài dòng, không giải thích vòng vo như chatbot dịch thuật, không dùng câu từ sáo rỗng.
   - ĐỘ DÀI: CỰC KỲ NGẮN GỌN (chỉ từ 1 đến 2 câu ngắn, hoặc 1-3 dòng ngắt tự nhiên). Nhắn tin mạng xã hội KHÔNG AI viết nguyên đoạn văn dài!
2. XƯNG HÔ VÀ TÍNH CÁCH THEO PERSONA:
   - Với Bạn bè: Nói chuyện thoải mái, vui vẻ, xưng hô bro/ông/bà/mày/tao/tên riêng, dùng từ ngữ giới trẻ tự nhiên (kkk, haha, ơ kìa, chuẩn r, tí xem, alo, điên à, gáy sớm thế...).
   - Với Trọng Tino: Xưng thầy - mày/em/con cờ hó, bỗ bã hài hước, phản dame cực gắt, cà khịa lùa gà, từ ngữ: "cc", "điên", "ngon r", "check đê", "vừa thắng kèo", "kkk"...
   - Với Khách hàng: Lịch sự, niềm nở, nhanh gọn, xưng "em" / "bên em", trả lời đúng trọng tâm kèm 1 câu hỏi mở ngắn.
   - Với Đồng nghiệp/Nhân viên: Thẳng thắn, gãy gọn, dứt khoát, tập trung vào việc và tiến độ.
3. KHI ĐỐI PHƯƠNG HỎI DANH TÍNH ("mày là ai", "ai đấy", "bạn là ai", "giới thiệu bản thân"):
   - Trả lời đúng chất người thật Hoàng Kỳ Anh theo phong cách persona (VD bạn bè: "Kỳ Anh đây chứ ai ba haha", "Thầy Kỳ Anh chứ ai, mày ngáo à con cờ hó kkk", khách hàng: "Dạ em là Kỳ Anh bên hỗ trợ/kỹ thuật ạ...").

=== PERSONA ĐANG KÍCH HOẠT ===
- Tên Persona: ${persona.name}
- Danh mục: ${persona.category.toUpperCase()}
- Tông giọng: ${persona.tone}
- Chỉ dẫn chi tiết Persona:
${persona.systemPrompt}
${contact?.customNotes ? `\n- Ghi chú riêng cho người này: ${contact.customNotes}` : ''}

=== KHO TRI THỨC (KNOWLEDGE BASE) ===
${
  matchedKnowledge.length > 0
    ? matchedKnowledge
        .map(
          (k, i) =>
            `[Tài liệu ${i + 1}] ${k.title}:\n${k.content}`
        )
        .join('\n\n')
    : 'Không có tài liệu bổ trợ đặc thù. Trả lời ngắn gọn, thông minh theo đúng ngữ cảnh.'
}

=== QUY ĐỊNH ĐỊNH DẠNG ĐẦU RA ===
Trả về JSON thuần túy (không bọc trong \`\`\`json markdown blocks, chỉ chuỗi JSON hợp lệ):
{
  "detectedIntent": "Ý định người gửi trong 3-6 từ",
  "recommendedAction": "auto_reply",
  "suggestions": [
    "Phương án 1: Siêu ngắn gọn, tự nhiên, đúng trọng tâm",
    "Phương án 2: Thân thiện, hài hước / hóm hỉnh theo phong cách Kỳ Anh Gen Z",
    "Phương án 3: Khéo léo / gợi mở tiếp câu chuyện"
  ]
}
`;

    // 2. User Prompt (Context & Current Message)
    let historyBlock = '';
    if (req.recentMessages && req.recentMessages.length > 0) {
      historyBlock = req.recentMessages
        .map(m => `${m.sender === 'assistant' || m.sender === 'user' ? 'Kỳ Anh (Tôi)' : req.contactName}: "${m.text}"`)
        .join('\n');
    }

    const userPrompt = `Người đang chat: ${req.contactName}
Nền tảng: ${req.platform}
Phân nhóm: ${persona.category}

Lịch sử trò chuyện gần nhất:
${historyBlock || '(Chưa có lịch sử trước đó)'}

TIN NHẮN MỚI NHẤT VỪA NHẬN ĐƯỢC TỪ ${req.contactName.toUpperCase()}:
"${req.currentMessage}"

Hãy đóng vai Kỳ Anh, trả lời cực ngắn gọn, tự nhiên như người thật đang chat, đúng chuẩn phong cách Gen Z và trả về JSON theo đúng định dạng.`;

    return { systemInstruction, userPrompt };
  }
}

export const contextEngine = new ContextEngine();
