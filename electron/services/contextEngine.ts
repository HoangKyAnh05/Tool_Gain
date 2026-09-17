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
   * Helper to normalize strings for robust accent-insensitive matching
   */
  private normalizeString(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[\s\-_]+/g, '')
      .trim();
  }

  /**
   * Find a specialized custom persona tailored for a specific contact name
   */
  public findPersonaForContactName(contactName: string): Persona | null {
    if (!contactName || contactName === 'Đoạn chat hiện tại' || contactName === 'Hội thoại đang mở') {
      return null;
    }

    const normName = this.normalizeString(contactName);
    if (!normName || normName.length < 2) return null;

    const personas = db.getPersonas();

    // 1. Direct match by persona ID
    for (const p of personas) {
      const normId = this.normalizeString(p.id.replace('persona_', ''));
      if (normId === normName || (normName.length >= 4 && normId.includes(normName)) || (normId.length >= 4 && normName.includes(normId))) {
        return p;
      }
    }

    // 2. Match by persona title / name
    for (const p of personas) {
      const normPersonaName = this.normalizeString(p.name);
      if (normPersonaName.includes(normName) || (normName.length >= 4 && normName.includes(normPersonaName))) {
        return p;
      }
    }

    // 3. Match by prompt content (@ContactName mentions)
    for (const p of personas) {
      const normPrompt = this.normalizeString(p.systemPrompt || '');
      if (normPrompt.includes(`@${normName}`) || normPrompt.includes(normName)) {
        return p;
      }
    }

    return null;
  }

  /**
   * Resolve Persona for a contact or request:
   * 1. If explicit personaId is chosen (e.g. Gái Xinh, Sếp, Cầu Lông, Mua Sắm), use it.
   * 2. If NO option chosen (Default / Auto), automatically pick the custom persona for that contact (if exists).
   * 3. Fallback to category default (Friend / Customer / Employee).
   */
  public resolvePersona(req: GenerateReplyRequest, contact?: Contact | null): Persona {
    // 1. User explicitly selected a style option
    if (req.personaId && req.personaId.trim()) {
      const explicit = db.getPersonaById(req.personaId);
      if (explicit) {
        console.log(`[ContextEngine] Using explicit persona: "${explicit.name}" (${explicit.id})`);
        return explicit;
      }
    }

    // 2. Auto-detect specialized persona for this specific contact
    const contactName = req.contactName || (contact ? contact.name : '');
    const matchedPersonalPersona = this.findPersonaForContactName(contactName);
    if (matchedPersonalPersona) {
      console.log(`[ContextEngine] Auto-resolved specialized persona for "${contactName}": "${matchedPersonalPersona.name}" (${matchedPersonalPersona.id})`);
      return matchedPersonalPersona;
    }

    // 3. Check contact's saved persona in DB
    if (contact && contact.personaId) {
      const p = db.getPersonaById(contact.personaId);
      if (p) {
        console.log(`[ContextEngine] Using contact assigned persona: "${p.name}" (${p.id})`);
        return p;
      }
    }

    // 4. Fallback to category default
    const targetCategory = req.contactCategory || (contact ? contact.category : 'friend');
    const fallback = db.getPersonaByCategory(targetCategory);
    console.log(`[ContextEngine] Fallback persona for "${contactName}" (category: ${targetCategory}): "${fallback.name}"`);
    return fallback;
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
${req.contextHint ? `\nĐỊNH HƯỚNG / NGỮ CẢNH ĐẶC BIỆT CỦA CÂU TRẢ LỜI: "${req.contextHint}"\n` : ''}
Lịch sử trò chuyện gần nhất:
${historyBlock || '(Chưa có lịch sử trước đó)'}

TIN NHẮN MỚI NHẤT VỪA NHẬN ĐƯỢC TỪ ${req.contactName.toUpperCase()}:
"${req.currentMessage}"

Hãy đóng vai Kỳ Anh, trả lời cực ngắn gọn, tự nhiên như người thật đang chat, đúng chuẩn phong cách Gen Z và trả về JSON theo đúng định dạng.`;

    return { systemInstruction, userPrompt };
  }
}

export const contextEngine = new ContextEngine();
