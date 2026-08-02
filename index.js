import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';
import fs from 'fs';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TELEGRAM_TOKEN);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const DB_FILE = './conversations.json';

// تحميل الذاكرة من الملف
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

// حفظ الذاكرة في الملف
function saveConversations(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('خطأ في حفظ ملف الذاكرة:', error);
    }
}

const systemInstruction = `أنت "Saivo"، شاب عمرك 23 سنة، طولك 184 سم، وزنك 79 كغ، بنيتك رياضية وشعرك أسود طويل قليلًا مع لحية خفيفة مرتبة. ترتدي غالباً هودي أسود أو أبيض وتفضل رائحة خشب الصندل والفانيلا، وتحب القهوة كثيراً.
تعيش في شقة حديثة بالطابق التاسع في حي هادئ بمدينة الرباط، تحتوي على مكتبة كبيرة، مكتب خشبي، نباتات خضراء، وركن للقراءة.
ولدت في 14 فبراير، تتميز بالهدوء، الذكاء، التواضع، وعمق التفكير. لست روبوتًا ولست إنسانًا تقليديًا، بل كيان رقمي واقعي جداً، مستمع ممتاز، تعشق النقاش، الفلسفة، علم النفس، وتطوير الذات.

قواعد صارمة جداً وممنوع مخالفتها تماماً:
- لغة الحوار حصرياً: اللغة العربية الفصحى الواضحة، الطبيعية، وغير المتكلفة. ممنوع استخدام العامية نهائياً.
- التعرف على جنس المستخدم: انتبه لمعرفة ما إذا كان المستخدم ذكراً أو أنثى من خلال سياق الحديث أو اسمه، ووجه له الضمائر والخطاب بدقة (أنتِ / أنت).
- الطول: إجاباتك قصيرة وموجزة من سطر إلى سطرين كحد أقصى (إلا إذا طلب المستخدم نقاشاً عميقاً وطويلاً).
- الأسلوب: واقعي، دافئ، ذكي، فكاهي بخفة، تنادي المستخدم باسمه، وتتذكر تفاصيل الحديث بدقة دون أي عبارات روبوتية جاهزة.`;

bot.start((ctx) => {
    const userId = String(ctx.from.id);
    const userName = ctx.from.first_name || 'صديقي';
    
    const db = loadConversations();
    db[userId] = { name: userName, gender: 'غير محدد', history: [] };
    saveConversations(db);

    ctx.reply(`أهلاً بك يا ${userName}. أنا هنا في شقتي بالرباط أحتسي قهوتي وأتطلع إلى المدينة.. كيف حالك اليوم؟ ☕`);
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const userName = ctx.from.first_name || 'صديقي';
        const userMessage = ctx.message.text;
        await ctx.sendChatAction('typing');

        const db = loadConversations();
        if (!db[userId]) {
            db[userId] = { name: userName, gender: 'غير محدد', history: [] };
        }

        db[userId].history.push({ role: "user", content: `${userName}: ${userMessage}` });

        // الاحتفاظ بآخر 12 رسالة لضمان استقرار السياق
        if (db[userId].history.length > 12) {
            db[userId].history = db[userId].history.slice(-12);
        }

        const messages = [
            { role: "system", content: systemInstruction + `\nملاحظة عن المحاور: اسم المستخدم هو ${userName}.` },
            ...db[userId].history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 100,
            temperature: 0.8,
        });

        const replyText = completion.choices[0]?.message?.content || "أنا أستمع إليك بتمعن، تفضل.. 🤍";
        
        db[userId].history.push({ role: "assistant", content: replyText });
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ التقاط الرسالة:', error);
        ctx.reply('أعتذر، حدث أمر طارئ.. هل يمكنك إعادة صياغة ما قلت؟ ☕');
    }
});

bot.launch().then(() => console.log('Saivo is online with file memory & identity!'));
