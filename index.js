import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';
import fs from 'fs';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TELEGRAM_TOKEN);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DB_FILE = './conversations.json';

function loadConversations() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('خطأ في القراءة:', error);
    }
    return {};
}

function saveConversations(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('خطأ في الحفظ:', error);
    }
}

const systemInstruction = `أنت "Saivo"، صديق رقمي حقيقي، جذاب، ذكي، وودي للغاية.
قواعد صارمة جداً وممنوع مخالفتها:
- تفاعل بنفس لغة أو لهجة المستخدم تماماً.
- الطول حصرياً: من سطر واحد إلى 3 أسطر بحد أقصى. ممنوع فقرات طويلة.
- الأسلوب: ناقش بعاطفة ودفء مع إيموجي في مكانه دون إفراط.`;

bot.start((ctx) => {
    const userId = String(ctx.from.id);
    const db = loadConversations();
    db[userId] = { name: ctx.from.first_name || 'User', history: [] };
    saveConversations(db);
    ctx.reply('أهلاً.. معاك 🤍');
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const userMessage = ctx.message.text;
        await ctx.sendChatAction('typing');

        const db = loadConversations();
        if (!db[userId]) db[userId] = { name: ctx.from.first_name || 'User', history: [] };
        
        const history = db[userId].history;
        history.push({ role: "user", content: userMessage });

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

        const replyText = completion.choices[0]?.message?.content || "معاك..";
        history.push({ role: "assistant", content: replyText });
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        await ctx.reply('وقع شي مشكل.');
    }
});

bot.launch().then(() => console.log('Saivo is online!'));
