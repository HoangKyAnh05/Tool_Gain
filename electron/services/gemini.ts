import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/database';
import { contextEngine } from './contextEngine';
import { GenerateReplyRequest, GenerateReplyResponse, Persona, AppSettings } from '../types';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentApiKey: string = '';

  private getClient(apiKey?: string): GoogleGenerativeAI | null {
    const key = apiKey || db.getSettings().geminiApiKey || process.env.GEMINI_API_KEY || '';
    if (!key) {
      return null;
    }
    if (!this.genAI || this.currentApiKey !== key) {
      this.genAI = new GoogleGenerativeAI(key);
      this.currentApiKey = key;
    }
    return this.genAI;
  }

  /**
   * Test Official Google Gemini API Key
   */
  public async testApiKey(apiKey: string, modelName: string = 'gemini-2.0-flash'): Promise<{ success: boolean; message: string }> {
    try {
      if (!apiKey || apiKey.trim() === '') {
        return { success: false, message: 'Vui lòng nhập API Key' };
      }
      const client = new GoogleGenerativeAI(apiKey.trim());
      const model = client.getGenerativeModel({ model: modelName || 'gemini-2.0-flash' });
      const result = await model.generateContent('Trả lời ngắn: "Kết nối thành công"');
      const response = await result.response;
      const text = response.text();
      return { success: true, message: `Kết nối thành công Google AI: ${text.trim()}` };
    } catch (err: any) {
      console.error('[Gemini Test Error]:', err);
      return { success: false, message: `Lỗi kết nối Gemini Official: ${err?.message || err}` };
    }
  }

  /**
   * Test Gemini-Web2API Server Endpoint (e.g. http://localhost:8081/v1)
   */
  public async testWeb2Api(baseUrl: string = 'http://localhost:8081/v1', apiKey: string = '', modelName: string = 'gemini-3.7-flash'): Promise<{ success: boolean; message: string }> {
    try {
      const cleanBaseUrl = (baseUrl || 'http://localhost:8081/v1').replace(/\/+$/, '');
      const endpoint = `${cleanBaseUrl}/chat/completions`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || 'none'}`
        },
        body: JSON.stringify({
          model: modelName || 'gemini-3.7-flash',
          messages: [{ role: 'user', content: 'Trả lời ngắn 1 từ: "OK"' }],
          temperature: 0.2
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, message: `Lỗi máy chủ Web2API (HTTP ${res.status}): ${errText.slice(0, 150)}` };
      }

      const data: any = await res.json();
      const answer = data.choices?.[0]?.message?.content || 'Thành công';
      return { success: true, message: `Kết nối thành công Web2API (${modelName}): ${answer.trim()}` };
    } catch (err: any) {
      return { success: false, message: `Không thể kết nối đến Web2API (${baseUrl}). Hãy đảm bảo server python gemini_web2api.py đang chạy!` };
    }
  }

  /**
   * Generate intelligent replies based on request and persona context
   */
  public async generateReply(req: GenerateReplyRequest): Promise<GenerateReplyResponse> {
    const settings = db.getSettings();
    const contact = db.getOrCreateContact(req.platform, req.contactName);
    const persona = contextEngine.resolvePersona(req, contact);
    const matchedKnowledge = contextEngine.findRelevantKnowledge(req.currentMessage);

    const { systemInstruction, userPrompt } = contextEngine.buildPrompt(req, persona, matchedKnowledge, contact);
    const modelName = settings.geminiModel || 'gemini-3.7-flash';

    // 1. If using Gemini-Web2API provider
    if (settings.aiProvider === 'gemini_web2api' || (!settings.geminiApiKey && settings.web2ApiBaseUrl)) {
      try {
        return await this.generateViaWeb2Api(settings, req, persona, matchedKnowledge, systemInstruction, userPrompt, modelName);
      } catch (err: any) {
        console.warn('[Gemini Web2API Generate Warning, falling back to local smart engine]:', err.message);
        const fallback = this.generateSmartFallback(req, persona, matchedKnowledge);
        fallback.error = `Web2API (${settings.web2ApiBaseUrl}) chưa phản hồi. Đã dùng bộ sinh thông minh dự phòng.`;
        return fallback;
      }
    }

    // 2. If using Official Google Gemini API
    const client = this.getClient();
    if (!client) {
      return this.generateSmartFallback(req, persona, matchedKnowledge);
    }

    try {
      const model = client.getGenerativeModel({
        model: modelName.includes('3.7') ? 'gemini-2.0-flash' : modelName,
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: persona.temperature || 0.6,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      let rawText = response.text().trim();

      return this.parseAndFormatResponse(rawText, persona, matchedKnowledge);
    } catch (err: any) {
      console.error('[Gemini Official Generate Error]:', err);
      const fallback = this.generateSmartFallback(req, persona, matchedKnowledge);
      fallback.error = `Lỗi Google API (${err?.message || 'Network error'}). Đã dùng bộ sinh thông minh dự phòng.`;
      return fallback;
    }
  }

  /**
   * Generate reply via Gemini-Web2API endpoint
   */
  private async generateViaWeb2Api(
    settings: AppSettings,
    req: GenerateReplyRequest,
    persona: Persona,
    matchedKnowledge: ReturnType<typeof contextEngine.findRelevantKnowledge>,
    systemInstruction: string,
    userPrompt: string,
    modelName: string
  ): Promise<GenerateReplyResponse> {
    const baseUrl = (settings.web2ApiBaseUrl || 'http://localhost:8081/v1').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/chat/completions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.web2ApiKey || 'none'}`
      },
      body: JSON.stringify({
        model: modelName || 'gemini-3.7-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: persona.temperature || 0.6
      })
    });

    if (!res.ok) {
      throw new Error(`Web2API returned HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    return this.parseAndFormatResponse(rawContent, persona, matchedKnowledge);
  }

  /**
   * Parse JSON output into suggestions
   */
  private parseAndFormatResponse(
    rawText: string,
    persona: Persona,
    matchedKnowledge: ReturnType<typeof contextEngine.findRelevantKnowledge>
  ): GenerateReplyResponse {
    let text = rawText.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(text);
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [parsed.option1, parsed.option2, parsed.option3].filter(Boolean);

      return {
        success: true,
        contactCategory: persona.category,
        persona,
        suggestedReplies: suggestions.length > 0 ? suggestions : [text],
        matchedKnowledge,
        detectedIntent: parsed.detectedIntent || 'Yêu cầu trò chuyện',
        recommendedAction:
          parsed.recommendedAction === 'auto_reply' && persona.replyMode === 'auto_reply'
            ? 'auto_reply'
            : 'copilot_review'
      };
    } catch {
      // If LLM returned raw text instead of JSON
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      return {
        success: true,
        contactCategory: persona.category,
        persona,
        suggestedReplies: lines.slice(0, 3).length > 0 ? lines.slice(0, 3) : [text],
        matchedKnowledge,
        detectedIntent: 'Phản hồi ngữ cảnh',
        recommendedAction: persona.replyMode === 'auto_reply' ? 'auto_reply' : 'copilot_review'
      };
    }
  }

  /**
   * Smart multi-turn context-aware fallback when offline or no API key
   */
  private generateSmartFallback(
    req: GenerateReplyRequest,
    persona: Persona,
    matchedKnowledge: ReturnType<typeof contextEngine.findRelevantKnowledge>
  ): GenerateReplyResponse {
    // Combine current message + full 10-message conversation history
    const allHistoryText = (req.recentMessages || []).map(m => m.text).join(' ').toLowerCase();
    const msg = (req.currentMessage || '').toLowerCase();
    const fullContext = (allHistoryText + ' ' + msg).toLowerCase();

    let suggestions: string[] = [];
    let detectedIntent = 'Trao đổi chung';

    // 1. Knowledge Base Matched (e.g. Price, Shipping, Warranty, Policy)
    if (matchedKnowledge.length > 0) {
      const kb = matchedKnowledge[0];
      detectedIntent = `Tư vấn ${kb.title}`;
      if (persona.category === 'customer') {
        suggestions = [
          `Dạ thông tin về ${kb.title}: ${kb.content.split('\n')[0]} ạ!`,
          `Dạ em gửi anh/chị thông tin chi tiết:\n${kb.content}\nAnh/chị cần em hỗ trợ thêm gì không ạ?`,
          `Dạ bên em luôn sẵn sàng hỗ trợ anh/chị nhé ạ! ${kb.content.split('\n')[0]}`
        ];
      } else {
        suggestions = [
          `Thông tin này nhé: ${kb.content.split('\n')[0]}`,
          `Check nhanh tài liệu: ${kb.title} -> ${kb.content.split('\n')[0]}`,
          `Ok để mình gửi chi tiết qua cho bạn nha!`
        ];
      }
    }
    // 2. Friend Persona (Category === 'friend')
    else if (persona.category === 'friend') {
      // 2.1 Gym / Training / Course / Deposit / Attendance / Schedule / Accounting
      if (/(gym|tập|buổi|khóa|cọc|nghỉ|phép|điểm danh|tính buổi|tiền|1tr|700|học phí)/i.test(fullContext)) {
        detectedIntent = 'Tính số buổi / Học phí / Điểm danh khóa';
        suggestions = [
          'Dạ chuẩn rồi a, để e đối chiếu lại số buổi rồi tính trừ tiền cọc đợt này cho a nhé!',
          'Ok a ơi, tính các buổi có phép và không phép thì chuẩn như a tính rồi ạ, để e chốt lại luôn nhé!',
          'Đúng rồi a, để e tổng kết lại lịch và gửi lại a xác nhận nha!'
        ];
      }
      // 2.2 Date / Schedule / Calendar ("đầu tuần", "tuần này", "tuần trước", ngày tháng)
      else if (/(đầu tuần|tuần này|tuần trước|hôm|ngày|tháng|\d{1,2}\/\d{1,2})/i.test(fullContext)) {
        detectedIntent = 'Xác nhận mốc thời gian / Lịch trình';
        suggestions = [
          'Chuẩn mốc thời gian đó rồi a/bro, để e check lại lịch xem nhé!',
          'Ok đúng lịch rồi, để e xem lại chi tiết rồi nhắn lại a liền nha!',
          'Nhất trí a ơi, để e rà soát lại đợt đó nha!'
        ];
      }
      // 2.3 Badminton / Sport / Morning Game
      else if (/(cầu lông|đánh cầu|tung cầu|sân cầu|vợt|chơi thể thao)/i.test(fullContext) || (/(sáng mai|6-8 sáng|dậy sớm)/i.test(fullContext) && /(cầu|sân|trận)/i.test(fullContext))) {
        detectedIntent = 'Hẹn kèo sáng mai (Cầu lông/Gặp mặt)';
        suggestions = [
          'Ok chốt vậy sáng mai 6h gặp nha e, nhớ dậy đúng giờ kkk!',
          'Chuẩn luôn, ngủ sớm đi mai đánh cầu xong ae mình đi ăn sáng luôn nhé!',
          'Oke mai gặp nhé bro, chuẩn bị tinh thần mai dứt luôn!'
        ];
      }
      // 2.4 Night Cafe / Gathering ("cafe", "chỗ cũ", "quán cafe", "tối nay")
      else if (/(cafe|cà phê|trà đá|chỗ cũ|quán cũ|tối nay)/i.test(fullContext) && !/(lẩu|nhậu)/i.test(fullContext)) {
        detectedIntent = 'Hẹn kèo Cafe / Tối nay';
        suggestions = [
          'Ok chốt 7h30 ở chỗ cũ nhé, lát tôi phi qua!',
          'Hợp lý luôn bro, để tôi sắp xếp xong qua ngồi chém gió với ae nhé!',
          'Oke tí tôi có mặt, nhớ giữ chỗ đẹp nha kkk!'
        ];
      }
      // 2.5 Eating / Hotpot / Beer / Food ("lẩu", "nhậu", "đi ăn quán", "quán lẩu")
      else if (/(đi ăn|lẩu|nhậu|quán ăn|bữa lẩu|lẩu bò)/i.test(fullContext)) {
        detectedIntent = 'Hẹn kèo ăn uống / Lẩu';
        suggestions = [
          'Hợp lý luôn, cuối tuần chốt kèo lẩu bò nhé bro!',
          'Haha kèo ngon đấy, chốt giờ đó tôi phi qua luôn!',
          'Oke dứt luôn, để rủ thêm mấy anh em nữa cho xôm!'
        ];
      }
      // 2.6 Sending Files / Documents / Help
      else if (/(file|tài liệu|drive|link|gửi lại|check giúp|xin lại)/i.test(fullContext)) {
        detectedIntent = 'Hỗ trợ gửi File / Tài liệu';
        suggestions = [
          'Ok để tôi tìm lại trong Drive rồi gửi qua link cho ông ngay nhé!',
          'Đang check đây, đợi tôi 2 phút tôi gửi file qua nha bro!',
          'Có lưu nè, để tôi share quyền truy cập Drive qua cho ông luôn!'
        ];
      }
      // 2.7 Roll call / Team attendance / List of members / Review ("vắng", "có cả", "xem lại xíu", "danh sách", "chuẩn rồi đấy để tôi xem lại")
      else if (/(vắng|có cả|danh sách|xem lại xíu|xem lại|check lại|thiếu ai)/i.test(fullContext) || /(chuẩn rồi đấy|để tôi xem lại)/i.test(msg)) {
        detectedIntent = 'Check danh sách / Chờ xem lại';
        suggestions = [
          'Ok ông cứ xem lại đi, có gì nhắn tôi chốt danh sách nhé!',
          'Chuẩn rồi đấy, check kỹ lại xem còn thiếu ai nữa không để tôi báo lại team luôn!',
          'Haha oke bro, xem xong ới tôi sớm nha!'
        ];
      }
      // 2.8 Agreement / Confirmation ("oke", "oke sếp", "dứt luôn", "chốt", "chuẩn")
      else if (msg.includes('oke') || msg.includes('sếp') || msg.includes('dứt') || msg.includes('chốt') || msg.includes('chuẩn')) {
        detectedIntent = 'Xác nhận đồng ý';
        suggestions = [
          'Ok chốt thế nhé, có gì ới tôi liền nha!',
          'Haha chuẩn rồi đấy, cứ thế mà triển thôi bro!',
          'Ok men, hẹn gặp lại sớm nha kkk!'
        ];
      }
      // 2.9 Greetings / Calling ("ê", "alo", "đâu", "hú", "hi")
      else if (msg.includes('ê') || msg.includes('alo') || msg.includes('đâu') || msg.includes('hú')) {
        detectedIntent = 'Bạn bè gọi nhau';
        suggestions = [
          'Alo nghe nè bro ơi, có gì hot không?',
          'Đây đây, vừa mới check tin nhắn xong, sao thế ông?',
          'Nghe rõ trả lời! Đang bận xíu mà có việc gì gấp không kkk?'
        ];
      }
      // 2.10 General Friendly Conversation
      else {
        detectedIntent = 'Trò chuyện ngữ cảnh';
        suggestions = [
          'Ok luôn nha bro ơi, để tôi check lại nhé!',
          'Haha chuẩn rồi đấy, để tôi xem lại xíu rồi nhắn lại nha!',
          'Ok chốt thế nhé, có gì ới tiếp nha!'
        ];
      }
    }
    // 3. Employee Persona
    else if (persona.category === 'employee') {
      if (fullContext.includes('oke sếp') || fullContext.includes('báo cáo') || fullContext.includes('tiến độ') || fullContext.includes('xong')) {
        detectedIntent = 'Xác nhận công việc';
        suggestions = [
          'Anh đã nhận thông tin, em tiếp tục triển khai các hạng mục tiếp theo nhé.',
          'Ok em, cập nhật thêm vào file theo dõi để cả team nắm được tiến độ nhé.',
          'Rất tốt, làm xong gửi link qua anh duyệt nhé.'
        ];
      } else {
        detectedIntent = 'Chỉ đạo công việc';
        suggestions = [
          'Ok em, anh nắm được rồi. Em chủ động xử lý theo quy trình nhé.',
          'Em check kỹ lại phần này rồi gửi báo cáo cho anh trước cuối giờ nhé.',
          'Đồng ý với phương án này, em tiến hành luôn đi.'
        ];
      }
    }
    // 4. Customer Persona
    else {
      detectedIntent = 'Khách hàng liên hệ';
      if (msg.includes('chào') || msg.includes('hi') || msg.includes('shop') || msg.includes('alo')) {
        suggestions = [
          'Dạ em chào anh/chị! Em có thể hỗ trợ gì cho mình hôm nay ạ?',
          'Dạ em chào anh/chị, cảm ơn anh/chị đã quan tâm đến sản phẩm bên em. Anh/chị đang tìm dòng sản phẩm nào ạ?',
          'Dạ chào anh/chị ạ! Hôm nay bên em đang có nhiều ưu đãi hấp dẫn, anh/chị cần tư vấn mã nào cứ nhắn em nhé!'
        ];
      } else if (msg.includes('oke') || msg.includes('cảm ơn') || msg.includes('thanks') || msg.includes('vâng')) {
        suggestions = [
          'Dạ không có gì ạ! Anh/chị cần thêm thông tin gì cứ nhắn em hỗ trợ bất cứ lúc nào nhé ạ.',
          'Dạ em cảm ơn anh/chị nhiều ạ! Chúc anh/chị một ngày làm việc thật vui vẻ và may mắn nhé ạ!',
          'Dạ vâng ạ, em luôn sẵn sàng hỗ trợ anh/chị 24/7 nhé ạ!'
        ];
      } else {
        suggestions = [
          'Dạ em đã nhận được tin nhắn của anh/chị, em sẽ hỗ trợ mình ngay đây ạ!',
          'Dạ anh/chị cho em xin thêm chút thông tin để em tư vấn chính xác nhất nhé ạ.',
          'Dạ vâng ạ, anh/chị đợi em một chút em kiểm tra và phản hồi ngay nhé ạ!'
        ];
      }
    }

    return {
      success: true,
      contactCategory: persona.category,
      persona,
      suggestedReplies: suggestions,
      matchedKnowledge,
      detectedIntent,
      recommendedAction: persona.replyMode === 'auto_reply' ? 'auto_reply' : 'copilot_review'
    };
  }
}

export const geminiService = new GeminiService();

