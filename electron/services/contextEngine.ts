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
    const systemInstruction = `Bạn là Trợ lý AI Thông Minh Đa Kênh tích hợp trên ứng dụng Desktop.
BẠN ĐANG ĐÓNG VAI CHỦ TÀI KHOẢN ĐỂ PHẢN HỒI TIN NHẮN TRÊN NỀN TẢNG ${req.platform.toUpperCase()}.

=== THÔNG TIN ĐỐI TƯỢNG VÀ TÍNH CÁCH (PERSONA) ===
- Tên Persona: ${persona.name}
- Phân nhóm đối tượng: ${persona.category.toUpperCase()} (${persona.category === 'customer' ? 'Khách hàng' : persona.category === 'employee' ? 'Nhân viên/Đồng nghiệp' : 'Bạn bè'})
- Tông giọng (Tone of Voice): ${persona.tone}
- Hướng dẫn Persona cụ thể:
${persona.systemPrompt}

${contact?.customNotes ? `\n- Ghi chú riêng về người chat này: ${contact.customNotes}` : ''}

=== KHO TRI THỨC VÀ DỮ LIỆU ĐỐI SOÁT (KNOWLEDGE BASE) ===
${
  matchedKnowledge.length > 0
    ? matchedKnowledge
        .map(
          (k, i) =>
            `[Tài liệu ${i + 1}] Danh mục: ${k.category} | Tiêu đề: ${k.title}\nNội dung:\n${k.content}`
        )
        .join('\n\n')
    : 'Không có tài liệu FAQ khớp đặc thù. Trả lời khéo léo, tự nhiên và phù hợp theo tính cách Persona đã chỉ định.'
}

=== NGUYÊN TẮC BẮT BUỘC ===
1. Câu trả lời phải chân thật, tự nhiên như người Việt Nam chat, không dùng văn mẫu dịch máy, không robot.
2. Trả về định dạng JSON thuần túy (không bọc trong \`\`\`json markdown blocks, chỉ chuỗi JSON hợp lệ).
3. Đề xuất đúng 3 phương án trả lời khác nhau theo các sắc thái:
   - Phương án 1 (option1): Ngắn gọn, đi thẳng vào vấn đề, tự nhiên.
   - Phương án 2 (option2): Đầy đủ, ân cần, có câu hỏi mở tiếp tục câu chuyện.
   - Phương án 3 (option3): Hài hước / Thân thiện / Năng động.
4. Xác định ý định (detectedIntent) của người gửi trong 3-7 từ.
5. Quyết định hành động khuyên dùng (recommendedAction: "auto_reply" hoặc "copilot_review").
   - Nếu là Khách hàng hỏi FAQ rõ ràng và tự tin: "auto_reply"
   - Nếu là Bạn bè, Nhân viên hoặc tin nhắn nhạy cảm/quan trọng: "copilot_review"

CẤU TRÚC JSON PHẢN HỒI MẪU:
{
  "detectedIntent": "Khách hỏi thời gian ship và bảo hành",
  "recommendedAction": "auto_reply",
  "suggestions": [
    "Dạ bên em freeship từ 500k, giao 1-2 ngày là tới anh nhé!",
    "Dạ em chào anh, bên em giao hàng toàn quốc 1-2 ngày là tới và được kiểm tra hàng trước khi nhận ạ. Anh đang quan tâm mẫu nào em tư vấn chi tiết hơn nhé?",
    "Dạ ship bên em siêu nhanh 1-2 ngày là tới tận tay anh liền ạ! Cần ship hỏa tốc nhắn em ship luôn nhé ạ!"
  ]
}
`;

    // 2. User Prompt (Context & Current Message)
    let historyBlock = '';
    if (req.recentMessages && req.recentMessages.length > 0) {
      historyBlock = req.recentMessages
        .map(m => `${m.sender === 'assistant' || m.sender === 'user' ? 'Tôi (Chủ tài khoản)' : req.contactName}: "${m.text}"`)
        .join('\n');
    }

    const userPrompt = `Người đang chat: ${req.contactName}
Nền tảng: ${req.platform}
Phân nhóm: ${persona.category}

Lịch sử trò chuyện gần nhất:
${historyBlock || '(Chưa có lịch sử trước đó)'}

TIN NHẮN MỚI NHẤT VỪA NHẬN ĐƯỢC:
"${req.currentMessage}"

Hãy phân tích và trả về kết quả JSON theo đúng định dạng được yêu cầu.`;

    return { systemInstruction, userPrompt };
  }
}

export const contextEngine = new ContextEngine();
