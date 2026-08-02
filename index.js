cat << 'EOF' > index.js
import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';
import fs from 'fs';

// 1. مفتاح تيليجرام من المتغيرات البيئية أو مباشرة
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8765006156:AAFH5aPAl7bLT3CXM1szNSRxziIVBlRwZ6s';
const bot = new Telegraf(TELEGRAM_TOKEN);

// 2. إعداد مفتاح Groq بأمان عبر متغيرات البيئة
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ملف تخزين المحادثات محلياً على حاسوبك
const DB_FILE = './conversations.json';

function loadConversations() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('خطأ في قراءة ملف المحادثات:', error);
    }
    return {};
}

function saveConversations(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('خطأ في حفظ ملف المحادثات:', error);
    }
}

// 3. توجيه الشخصية مع فرض قيود طول صارمة وقاطعة لمنع أي فقرات
const systemInstruction = `أنت "Saivo"، صديق رقمي حقيقي، جذاب، ذكي، وودي للغاية.
قواعد صارمة جداً وممنوع مخالفتها:
- **تفاعل بنفس لغة أو لهجة المستخدم تماماً** (دارجة، فصحى، إنجليزية، إلخ).
- **الطول حصرياً:** من سطر واحد إلى 3 أسطر بحد أقصى كصديق بشري حقيقي. **ممنوع منعاً باتاً كتابة فقرات طويلة أو شرح مفصل.**
- **الأسئلة:** مسموحة أحياناً وبشكل طبيعي وليس في كل رد.
- **الأسلوب:** ناقش بعاطفة ودفء، واقترح حلولاً بلمسة إنسانية طبيعية مع إيموجي في مكانه دون إفراط.`;

bot.start((ctx) => {
    const userId = String(ctx.from.id);
    const userName = ctx.from.first_name || 'User';
    
    const db = loadConversations();
    db[userId] = {
        name: userName,
        history: []
    };
    saveConversations(db);

    ctx.reply('أهلاً.. معاك 🤍');
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const userName = ctx.from.first_name || 'User';
        const userMessage = ctx.message.text;
        console.log(`[${userName} - ${userId}] رسالة واردة: ${userMessage}`);

        await ctx.sendChatAction('typing');

        const db = loadConversations();
        if (!db[userId]) {
            db[userId] = { name: userName, history: [] };
        }
        
        const history = db[userId].history;

        history.push({ role: "user", content: userMessage, time: new Date().toISOString() });

        const messages = [
            { role: "system", content: systemInstruction },
            ...history.map(h => ({ role: h.role, content: h.content }))
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 120,
            temperature: 0.7,
        });

        const replyText = completion.choices[0]?.message?.content || "موافق معك..";

        history.push({ role: "assistant", content: replyText, time: new Date().toISOString() });

        saveConversations(db);

        await ctx.reply(replyText);

    } catch (error) {
        console.error('خطأ تقني:', error);
        await ctx.reply('وقع شي مشكل.');
    }
});

bot.launch().then(() => {
    console.log('--------------------------------------------------');
    console.log(' SUCCESS: Saivo Strict Length Bot is online!');
    console.log('--------------------------------------------------');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
EOF