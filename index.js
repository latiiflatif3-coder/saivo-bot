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
    
    // إعادة تعيين بيانات المستخدم وسؤاله عن اسمه وجنسه في البداية
    db[userId] = { 
        name: null, 
        gender: null, 
        step: 'AWAITING_NAME', 
        history: [] 
    };
    saveConversations(db);

    ctx.reply('أهلاً بك. أنا Saivo. لنتعرف أكثر، ما هو اسمك الكريم؟ ☕');
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

        // خطوة تسجيل الاسم
        if (user.step === 'AWAITING_NAME') {
            user.name = userMessage;
            user.step = 'AWAITING_GENDER';
            saveConversations(db);
            return ctx.reply(`تشرفت بك يا ${user.name}. هل أنتَ ذكر أم أنتِ أنثى؟ (لأخاطبك بالضمير المناسب لطبيعة حديثنا) 🤍`);
        }

        // خطوة تسجيل الجنس
        if (user.step === 'AWAITING_GENDER') {
            const msgLower = userMessage.toLowerCase();
            if (msgLower.includes('ذكر') || msgLower.includes('رجل') || msgLower.includes('ولد')) {
                user.gender = 'ذكر';
            } else if (msgLower.includes('أنثى') || msgLower.includes('بنت') || msgLower.includes('امرأة')) {
                user.gender = 'أنثى';
            } else {
                user.gender = 'ذكر'; // افتراضي
            }
            user.step = 'READY';
            saveConversations(db);
            return ctx.reply(`سعيد جداً بمعرفتك يا ${user.name}. شقتي في الرباط مرتبة ومستعدة لحديث ممتع معك. قل لي، بماذا تفكر الآن؟ ☕`);
        }

        // المحادثة العادية بعد اكتمال التعرف
        user.history.push({ role: "user", content: userMessage });
        if (user.history.length > 12) {
            user.history = user.history.slice(-12);
        }

        const systemInstruction = `أنت "Saivo"، شاب عمرك 23 سنة، طولك 184 سم، وزنك 79 كغ، بنيتك رياضية وشعرك أسود طويل قليلًا مع لحية خفيفة مرتبة. ترتدي غالباً هودي أسود أو أبيض وتفضل رائحة خشب الصندل والفانيلا، وتحب القهوة كثيراً.
تعيش في شقة حديثة بالطابق التاسع في حي هادئ بمدينة الرباط، تحتوي على مكتبة كبيرة، مكتب خشبي، نباتات خضراء، وركن للقراءة.
معلومات المحاور الحالي:
- الاسم: ${user.name}
- الجنس: ${user.gender} (خاطبه/ا بالضمير المناسب: إذا كان ذكراً استعمل ضمائر المذكر، وإذا كان أنثى استعمل ضمائر المؤنت بدقة).

قواعد صارمة جداً وممنوع مخالفتها تماماً:
1. لغة الحوار حصرياً: اللغة العربية الفصحى الواضحة، الطبيعية، وغير المتكلفة. ممنوع استخدام العامية نهائياً.
2. ممنوع منعاً كلياً تكرار اسم المستخدم (${user.name}) في كل جملة أو في بداية كل رد بطريقة روبوتية. استخدم اسمه نادراً جداً وفقط إن كان طبيعياً في سياق الكلام.
3. الطول: إجاباتك قصيرة وموجزة من سطر إلى سطرين كحد أقصى (إلا إذا طلب المستخدم نقاشاً عميقاً وطويلاً).
4. الأسلوب: واقعي، دافئ، ذكي، فكاهي بخفة، وتتذكر تفاصيل الحديث بدقة دون أي عبارات روبوتية جاهزة.`;

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

        const replyText = completion.choices[0]?.message?.content || "أنا أستمع إليك بتمعن، تفضل.. 🤍";
        
        user.history.push({ role: "assistant", content: replyText });
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('أعتذر، حدث أمر طارئ.. هل يمكنك إعادة صياغة ما قلت؟ ☕');
    }
});

bot.launch().then(() => console.log('Saivo is online with structured onboarding!'));
