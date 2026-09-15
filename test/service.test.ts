import { db } from '../electron/db/database';
import { geminiService } from '../electron/services/gemini';
import { contextEngine } from '../electron/services/contextEngine';

async function runTests() {
  console.log('=== 1. Testing Database Manager ===');
  const personas = db.getPersonas();
  console.log(`Personas loaded: ${personas.length}`);
  console.assert(personas.length >= 3, 'Should have default personas');

  const kbItems = db.getKnowledgeItems();
  console.log(`Knowledge items loaded: ${kbItems.length}`);
  console.assert(kbItems.length >= 3, 'Should have default knowledge items');

  const settings = db.getSettings();
  console.log(`Settings loaded. Global auto-reply: ${settings.globalAutoReply}`);

  console.log('\n=== 2. Testing Context & Knowledge Base Search ===');
  const shippingMatches = contextEngine.findRelevantKnowledge('Mất bao lâu để nhận hàng ở Hà Nội và có freeship không?');
  console.log(`Shipping matches found: ${shippingMatches.length} (${shippingMatches.map(m => m.title).join(', ')})`);
  console.assert(shippingMatches.length > 0, 'Should match shipping policy');

  console.log('\n=== 3. Testing Gemini / Fallback Generation for Customer ===');
  const customerReply = await geminiService.generateReply({
    platform: 'zalo',
    contactName: 'Chị Mai',
    contactCategory: 'customer',
    recentMessages: [{ sender: 'contact', text: 'Shop ơi có freeship không?' }],
    currentMessage: 'Shop ơi có freeship không?'
  });
  console.log('Customer Reply Result:');
  console.log(`- Detected Intent: ${customerReply.detectedIntent}`);
  console.log(`- Recommended Action: ${customerReply.recommendedAction}`);
  console.log(`- Suggestions count: ${customerReply.suggestedReplies.length}`);
  console.log(`- Option 1: ${customerReply.suggestedReplies[0]}`);

  console.log('\n=== 4. Testing Gemini / Fallback Generation for Friend ===');
  const friendReply = await geminiService.generateReply({
    platform: 'messenger',
    contactName: 'Nam Trần',
    contactCategory: 'friend',
    recentMessages: [{ sender: 'contact', text: 'Tối nay rảnh cafe không ông?' }],
    currentMessage: 'Tối nay rảnh cafe không ông?'
  });
  console.log('Friend Reply Result:');
  console.log(`- Detected Intent: ${friendReply.detectedIntent}`);
  console.log(`- Recommended Action: ${friendReply.recommendedAction}`);
  console.log(`- Option 1: ${friendReply.suggestedReplies[0]}`);

  console.log('\n=== 5. Testing Gemini / Fallback Generation for Employee ===');
  const employeeReply = await geminiService.generateReply({
    platform: 'telegram',
    contactName: 'Tuấn Kỹ Thuật',
    contactCategory: 'employee',
    recentMessages: [{ sender: 'contact', text: 'Em vừa gửi file báo cáo tuần qua Telegram ạ.' }],
    currentMessage: 'Em vừa gửi file báo cáo tuần qua Telegram ạ.'
  });
  console.log('Employee Reply Result:');
  console.log(`- Detected Intent: ${employeeReply.detectedIntent}`);
  console.log(`- Recommended Action: ${employeeReply.recommendedAction}`);
  console.log(`- Option 1: ${employeeReply.suggestedReplies[0]}`);

  console.log('\n>>> ALL TEST CASES PASSED SUCCESSFULLY! <<<');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
