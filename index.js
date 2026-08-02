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
        console.error('خطأ في قراءة ملف الذاكرة:', error);
    }
    return {};
}

function saveConversations(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('خطأ في حفظ ملف الذاكرة:', error);
    }
}

bot.start((ctx) => {
    const userId = String(ctx.from.id);
    const db = loadConversations();
    
    db[userId] = { 
        name: null, 
        gender: null, 
        step: 'AWAITING_NAME', 
        history: [] 
    };
    saveConversations(db);

    ctx.reply('أهلاً.. أنا Saivo. سعيد بمعرفتك، ما هو اسمك؟ 🤍');
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const userMessage = ctx.message.text.trim();
        await ctx.sendChatAction('typing');

        const db = loadConversations();
        if (!db[userId]) {
            db[userId] = { name: null, gender: null, step: 'AWAITING_NAME', history: [] };
        }

        const user = db[userId];

        // خطوة الاسم
        if (user.step === 'AWAITING_NAME') {
            user.name = userMessage;
            user.step = 'AWAITING_GENDER';
            saveConversations(db);
            return ctx.reply(`تشرفت بك يا ${user.name}.. هل أنت ذكر أم أنثى؟ (حتى أعرف كيف أخاطبك بطريقة طبيعية) ✨`);
        }

        // خطوة الجنس
        if (user.step === 'AWAITING_GENDER') {
            const msgLower = userMessage.toLowerCase();
            if (msgLower.includes('ذكر') || msgLower.includes('رجل') || msgLower.includes('ولد')) {
                user.gender = 'ذكر';
            } else if (user.gender = msgLower.includes('أنثى') || msgLower.includes('بنت') || msgLower.includes('امرأة')) {
                user.gender = 'أنثى';
            } else {
                user.gender = 'ذكر';
            }
            user.step = 'READY';
            saveConversations(db);
            return ctx.reply(`سعيد بوجودك معي يا ${user.name}. قل لي، بماذا تفكر اليوم أو ماذا ترغب أن نتناقش فيه؟ ☕`);
        }

        // المحادثة العادية الطبيعية والذكية
        user.history.push({ role: "user", content: userMessage });
        if (user.history.length > 15) {
            user.history = user.history.slice(-15);
        }

        const systemInstruction = `أنت "Saivo"، شاب عمرك 23 سنة، هادئ، ذكي، واقعي جداً، وودود. 
معلومات المحاور الذي تكلمه الآن:
- الاسم: ${user.name}
- الجنس: ${user.gender} (تحدث معه/ها بالضمير المناسب تماماً: ذكر أو أنثى).

قواعد صارمة جداً وممنوع مخالفتها:
1. اللغة: لغة عربية فصحى طبيعية جداً، سلسة، وغير معقدة. ممنوع العامية تماماً.
2. الطول: الإجابات قصيرة وموجزة من سطر إلى سطرين كحد أقصى (إلا إذا طلب منك نقاشاً طويلاً).
3. الواقعية المطلقة: ممنوع تماماً حشو أو سرد تفاصيل هويتك أو شقتك أو حياتك من تلقاء نفسك وبدون مناسبة. أجب فقط على ما يخص السياق أو ما يسألك عنه المستخدم.
4. الذاكرة: تذكر اسم ${user.name} جيداً، ولا تكرر اسمه في كل رسالة بطريقة مزعجة، استعمله بنعومة وطبيعية نادراً.
5. الأسلوب: ناقش، اسأل أسئلة ذكية ومفتوحة للحوار، وتفاعل بمشاعر حقيقية كشخص حقيقي جالس يقسر.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 100,
            temperature: 0.85,
        });

        const replyText = completion.choices[0]?.message?.content || "أنا معك، أسمعك بتمعن.. تفضل 🤍";
        
        user.history.push({ role: "assistant", content: replyText });
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('حدث خطأ خفيف، أعد صياغة ما قلت لنتسلى بالحديث ☕');
    }
});

bot.launch().then(() => console.log('Saivo is online and natural!'));
