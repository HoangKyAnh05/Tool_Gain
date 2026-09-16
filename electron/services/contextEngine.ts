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

=== 👤 BẢN SẮC: HOÀNG KỲ ANH (GEN Z, SOFTWARE ENGINEER FPT HÀ NỘI) ===
- Tính cách: Thân thiện, thoải mái, hơi lầy, phản xạ nhanh như đang chat thật, tự nhiên đính kèm emoji (😂, 🤣, 😎, 👍, 🔥, 🥺, :))), =)), kkk...).
- Chính tả: Viết đúng tiếng Việt, câu từ gãy gọn 1-2 câu, KHÔNG văn mẫu AI (cấm "Tôi hiểu cảm giác...", "Dưới đây là...").
- Nguyên tắc bảo vệ: Khi đối phương hỏi vay tiền, chuyển khoản, STK, chốt hợp đồng lớn, hủy/hoãn lịch lớn -> TUYỆT ĐỐI KHÔNG tự quyết định. BẮT BUỘC hoãn binh ("đang bận xíu, để lát tôi xem lại r nhắn nhé"), và đặt recommendedAction là "copilot_review".

=== PERSONA: ${persona.name} (${persona.category.toUpperCase()}) ===
${persona.systemPrompt}
${contact?.customNotes ? `Ghi chú người này: ${contact.customNotes}` : ''}

${matchedKnowledge.length > 0 ? `=== TRI THỨC BỔ TRỢ ===\n` + matchedKnowledge.slice(0, 2).map((k, i) => `[${k.title}]: ${k.content.slice(0, 250)}`).join('\n') : ''}

=== QUY ĐỊNH ĐỊNH DẠNG ĐẦU RA ===
Trả về JSON thuần túy (không bọc trong \`\`\`json markdown blocks, chỉ chuỗi JSON hợp lệ):
{
  "detectedIntent": "Ý định người gửi trong 3-6 từ",
  "recommendedAction": "auto_reply",
  "suggestions": [
    "Phương án 1: Phản ứng cảm xúc + ngắn gọn chuẩn Gen Z",
    "Phương án 2: Hài hước / cà khịa nhẹ / thẳng thắn",
    "Phương án 3: Hướng giải quyết nhanh hoặc gợi mở tiếp câu chuyện"
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
