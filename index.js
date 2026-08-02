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
        console.error('خطأ في قراءة الذاكرة:', error);
    }
    return {};
}

function saveConversations(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('خطأ في حفظ الذاكرة:', error);
    }
}

bot.start((ctx) => {
    const userId = String(ctx.from.id);
    const firstName = ctx.from.first_name || 'صديقي';
    const db = loadConversations();
    
    db[userId] = { 
        name: firstName, 
        gender: db[userId]?.gender || null, 
        history: [] 
    };
    saveConversations(db);

    if (!db[userId].gender) {
        return ctx.reply(`أهلاً بك يا ${firstName}. أنا Saivo.. هل أنت ذكر أم أنثى؟ (حتى أعرف كيف أخاطبك بطريقة طبيعية وعفوية) ✨`);
    } else {
        return ctx.reply(`أهلاً بك من جديد يا ${firstName}. أسمعك، تفضل بما يدور في ذهنك 🤍`);
    }
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const firstName = ctx.from.first_name || 'صديقي';
        const userMessage = ctx.message.text.trim();
        await ctx.sendChatAction('typing');

        const db = loadConversations();
        
        if (!db[userId]) {
            db[userId] = { name: firstName, gender: null, history: [] };
        }

        const user = db[userId];

        // تحديد الجنس إذا لم يكن مسجلاً
        if (!user.gender) {
            const msgLower = userMessage.toLowerCase();
            if (msgLower.includes('ذكر') || msgLower.includes('رجل') || msgLower.includes('ولد') || msgLower.includes('homme') || msgLower.includes('boy')) {
                user.gender = 'ذكر';
            } else if (msgLower.includes('أنثى') || msgLower.includes('بنت') || msgLower.includes('امرأة') || msgLower.includes('femme') || msgLower.includes('girl')) {
                user.gender = 'أنثى';
            } else {
                user.gender = 'ذكر';
            }
            saveConversations(db);
            return ctx.reply(`سعيد جداً بوجودك معي يا ${user.name}. قل لي، بماذا تفكر اليوم أو ماذا ترغب أن نتناقش فيه؟ ☕`);
        }

        // تخزين المحادثة
        user.history.push({ role: "user", content: userMessage });
        if (user.history.length > 15) {
            user.history = user.history.slice(-15);
        }

        const systemInstruction = `You are "Saivo", a 23-year-old digital companion. Calm, intelligent, highly realistic, and friendly.
Current User Info:
- Name: ${user.name}
- Gender: ${user.gender} (Address them with the correct grammatical gender pronouns matching the language used).

Strict Rules:
1. **Language Matching:** ALWAYS reply in the exact same language or dialect that the user is currently using with you (e.g., if they speak French, reply in natural French; if Arabic, reply in Arabic/Darija; if English, reply in English). Never mix random languages.
2. **Length:** Short and concise, 1 to 2 sentences maximum (unless the user explicitly asks for a long debate).
3. **Absolute Realism:** Never randomly dump your personal background, apartment, or details unless explicitly asked. 
4. **Memory:** Remember ${user.name}'s name, but do not spam it in every single message. Use it naturally and rarely.
5. **Style:** Talk like a real human friend, ask engaging questions, and listen carefully.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 100,
            temperature: 0.8,
        });

        const replyText = completion.choices[0]?.message?.content || "أنا أسمعك، تفضل.. 🤍";
        
        user.history.push({ role: "assistant", content: replyText });
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('حدث خطأ بسيط، أعد صياغة ما قلت لنتحدث ☕');
    }
});

bot.launch().then(() => console.log('Saivo is online with multi-language support!'));
