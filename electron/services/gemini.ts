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
   * Test Groq API Key
   */
  public async testGroq(apiKey: string, modelName: string = 'openai/gpt-oss-120b'): Promise<{ success: boolean; message: string }> {
    try {
      if (!apiKey || apiKey.trim() === '') {
        return { success: false, message: 'Vui lòng nhập Groq API Key' };
      }
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          model: modelName || 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: 'Trả lời ngắn: "Kết nối thành công"' }],
          max_tokens: 30
        })
      });

      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `Lỗi Groq API: ${errMsg}` };
      }

      const data: any = await res.json();
      const answer = data.choices?.[0]?.message?.content || 'Thành công';
      return { success: true, message: `Kết nối thành công Groq (${modelName}): ${answer.trim()}` };
    } catch (err: any) {
      console.error('[Groq Test Error]:', err);
      return { success: false, message: `Không thể kết nối đến Groq API: ${err?.message || err}` };
    }
  }

  /**
   * Generate intelligent replies based on request and persona context
   * Multi-tier failover: Primary provider -> Groq -> Official Gemini -> Fail gracefully (NO fake hardcoded messages!)
   */
  public async generateReply(req: GenerateReplyRequest): Promise<GenerateReplyResponse> {
    const settings = db.getSettings();
    const contact = db.getOrCreateContact(req.platform, req.contactName);
    const persona = contextEngine.resolvePersona(req, contact);
    const matchedKnowledge = contextEngine.findRelevantKnowledge(req.currentMessage);

    const { systemInstruction, userPrompt } = contextEngine.buildPrompt(req, persona, matchedKnowledge, contact);

    // Multi-tier execution order:
    // Try primary provider first, then fallback to secondary providers before giving up
    const preferredProvider = settings.aiProvider || 'gemini_web2api';
    const providerQueue: Array<'web2api' | 'groq' | 'gemini'> = [];

    if (preferredProvider === 'groq') {
      providerQueue.push('groq', 'web2api', 'gemini');
    } else if (preferredProvider === 'gemini_official') {
      providerQueue.push('gemini', 'groq', 'web2api');
    } else {
      // Default: gemini_web2api with seamless fallback to groq, then official gemini
      providerQueue.push('web2api', 'groq', 'gemini');
    }

    let lastError = '';

    for (const p of providerQueue) {
      // 1. Try Gemini-Web2API
      if (p === 'web2api' && settings.web2ApiBaseUrl) {
        try {
          const modelName = settings.geminiModel || 'gemini-3.7-flash';
          console.log(`[AI Engine] Attempting generation via Web2API (${modelName})...`);
          return await this.generateViaWeb2Api(settings, req, persona, matchedKnowledge, systemInstruction, userPrompt, modelName);
        } catch (err: any) {
          console.warn(`[AI Engine] Web2API error: ${err.message}. Failing over to next provider...`);
          lastError = `Web2API (${err.message})`;
        }
      }

      // 2. Try Groq Cloud API
      if (p === 'groq' && settings.groqApiKey) {
        try {
          const groqModel = settings.groqModel || 'openai/gpt-oss-120b';
          console.log(`[AI Engine] Attempting generation via Groq API (${groqModel})...`);
          return await this.generateViaGroq(settings, req, persona, matchedKnowledge, systemInstruction, userPrompt, groqModel);
        } catch (err: any) {
          console.warn(`[AI Engine] Groq API error: ${err.message}. Failing over to next provider...`);
          lastError = `Groq (${err.message})`;
        }
      }

      // 3. Try Official Google Gemini API
      if (p === 'gemini' && settings.geminiApiKey) {
        const client = this.getClient(settings.geminiApiKey);
        if (client) {
          try {
            const modelName = settings.geminiModel || 'gemini-2.0-flash';
            console.log(`[AI Engine] Attempting generation via Official Gemini API (${modelName})...`);
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
            const rawText = response.text().trim();
            return this.parseAndFormatResponse(rawText, persona, matchedKnowledge);
          } catch (err: any) {
            console.warn(`[AI Engine] Official Gemini error: ${err.message}. Failing over to next provider...`);
            lastError = `Google Gemini (${err.message})`;
          }
        }
      }
    }

    // TUYỆT ĐỐI KHÔNG DÙNG TIN NHẮN MẶC ĐỊNH!
    console.error(`[AI Engine] Tất cả các nhà cung cấp AI đều không phản hồi. Last error: ${lastError}`);
    return this.generateSmartFallback(req, persona, matchedKnowledge, `AI chưa gen xong (${lastError || 'Lỗi kết nối AI'})`);
  }

  /**
   * Generate reply via Groq Cloud API
   */
  private async generateViaGroq(
    settings: AppSettings,
    req: GenerateReplyRequest,
    persona: Persona,
    matchedKnowledge: ReturnType<typeof contextEngine.findRelevantKnowledge>,
    systemInstruction: string,
    userPrompt: string,
    modelName: string
  ): Promise<GenerateReplyResponse> {
    const apiKey = (settings.groqApiKey || '').trim();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Groq API Key trong Cài đặt');
    }

    const preferredModel = (modelName && (modelName.includes('gpt-oss') || modelName.includes('qwen') || modelName.includes('groq') || modelName.includes('llama')))
      ? modelName
      : 'openai/gpt-oss-120b';

    // Model fallback chain: preferred -> qwen3.8-27b -> gpt-oss-20b -> gpt-oss-120b
    const candidateModels = Array.from(new Set([
      preferredModel,
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b'
    ]));

    let lastGroqError = '';

    for (const model of candidateModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction + '\nBẮT BUỘC: Trả về kết quả dưới định dạng JSON thuần: {"suggestions": ["câu 1", "câu 2", "câu 3"], "detectedIntent": "...", "recommendedAction": "copilot_review"}' },
              { role: 'user', content: userPrompt }
            ],
            temperature: persona.temperature || 0.6,
            response_format: { type: 'json_object' }
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          let errMsg = errText;
          try {
            const j = JSON.parse(errText);
            errMsg = j.error?.message || errText;
          } catch {}
          console.warn(`[AI Engine] Groq model ${model} HTTP ${res.status}: ${errMsg}`);
          lastGroqError = `Groq (${model} HTTP ${res.status}): ${errMsg}`;
          continue;
        }

        const data: any = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        return this.parseAndFormatResponse(rawContent, persona, matchedKnowledge);
      } catch (err: any) {
        lastGroqError = err?.message || String(err);
        console.warn(`[AI Engine] Groq model ${model} error: ${lastGroqError}`);
      }
    }

    throw new Error(lastGroqError || 'Tất cả model Groq đều thất bại');
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
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) {
      throw new Error(`Web2API returned HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    return this.parseAndFormatResponse(rawContent, persona, matchedKnowledge);
  }

  /**
   * Helper: Sanitize Vietnamese reply text, fix aberrant mid-word uppercase letters (e.g. biếT -> biết)
   */
  private sanitizeReply(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();

    // Remove surrounding quotes if model added them
    cleaned = cleaned.replace(/^["'“”«»](.*)["'“”«»]$/s, '$1').trim();

    const preservedAcronyms = new Set([
      'FPT', 'API', 'AI', 'IT', 'BA', 'QR', 'JWT', 'VIP', 'CEO', 'CTO',
      'UI', 'UX', 'SDK', 'CPU', 'RAM', 'GPU', 'URL', 'CSS', 'HTML', 'JSON',
      'OK', 'OKIE', 'VN', 'HN', 'HCM', 'SG', 'SMS', 'ZALO', 'FB', 'ID'
    ]);

    cleaned = cleaned.split(' ').map(word => {
      if (!word) return '';

      // Keep punctuation-only tokens
      if (/^[^\w\s\d]+$/.test(word)) return word;

      // Keep known acronyms or short uppercase codes
      if (preservedAcronyms.has(word.toUpperCase()) && word.length <= 4) {
        return word;
      }

      // Check if word has abnormal uppercase in the middle or end (e.g. "biếT", "Oke", "chuẩN", "đượC")
      if (word.length > 1) {
        const firstChar = word[0];
        const rest = word.slice(1);
        if (/[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴÝỶỸ]/.test(rest)) {
          // If the word isn't entirely uppercase, lowercase the mid-word letters
          if (!/^[A-Z0-9_-]+$/.test(word)) {
            return firstChar + rest.toLowerCase();
          }
        }
      }
      return word;
    }).join(' ');

    return cleaned;
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

      const cleanedSuggestions = (suggestions.length > 0 ? suggestions : [text])
        .map((s: string) => this.sanitizeReply(s));

      return {
        success: true,
        contactCategory: persona.category,
        persona,
        suggestedReplies: cleanedSuggestions,
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
      const rawList = lines.slice(0, 3).length > 0 ? lines.slice(0, 3) : [text];
      const cleanedSuggestions = rawList.map((s: string) => this.sanitizeReply(s));

      return {
        success: true,
        contactCategory: persona.category,
        persona,
        suggestedReplies: cleanedSuggestions,
        matchedKnowledge,
        detectedIntent: 'Phản hồi ngữ cảnh',
        recommendedAction: persona.replyMode === 'auto_reply' ? 'auto_reply' : 'copilot_review'
      };
    }
  }

  /**
   * Fallback when ALL AI models fail: TUYỆT ĐỐI XÓA HẾT MẪU MẶC ĐỊNH.
   * Return clear indicator that AI hasn't finished generating.
   */
  private generateSmartFallback(
    req: GenerateReplyRequest,
    persona: Persona,
    matchedKnowledge: ReturnType<typeof contextEngine.findRelevantKnowledge>,
    errorMessage?: string
  ): GenerateReplyResponse {
    return {
      success: false,
      contactCategory: persona.category,
      persona,
      suggestedReplies: [
        'AI chưa gen xong (Đang kết nối lại AI...)',
        'AI chưa gen xong (Vui lòng thử lại sau giây lát)',
        'AI chưa gen xong'
      ],
      matchedKnowledge,
      detectedIntent: 'Chưa thể tạo câu trả lời',
      recommendedAction: 'copilot_review',
      error: errorMessage || 'AI chưa gen xong'
    };
  }
}

export const geminiService = new GeminiService();
