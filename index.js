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

// دالة ذكية لتخمين جنس المستخدم بناءً على اسمه الأول في تيليجرام
function guessGenderFromName(name) {
    if (!name) return 'ذكر';
    const femaleNames = ['fatima', 'zohra', 'meryem', 'meriem', 'amina', 'khadija', 'icha', 'aicha', 'hafsa', 'hind', 'salma', 'sara', 'sarah', 'nada', 'aya', 'rim', 'ryam', 'fatine', 'kawtar', 'haidar'];
    const lowerName = name.toLowerCase();
    
    // أسماء مؤنثة شائعة أو تنتهي بتاء مربوطة بالفرنسية/الإنجليزية غالباً
    for (let fName of femaleNames) {
        if (lowerName.includes(fName)) return 'أنثى';
    }
    if (lowerName.endsWith('a') && !lowerName.endswith('zakaria') && !lowerName.endswith('yahya')) {
        return 'أنثى';
    }
    return 'ذكر';
}

bot.start((ctx) => {
    const userId = String(ctx.from.id);
    const firstName = ctx.from.first_name || 'صديقي';
    const db = loadConversations();
    
    // الكشف التلقائي عن الجنس من حساب تيليجرام
    const detectedGender = guessGenderFromName(firstName);

    db[userId] = { 
        name: firstName, 
        gender: detectedGender, 
        history: [] 
    };
    saveConversations(db);

    ctx.reply(`أهلاً بك يا ${firstName}. أسمعك، تفضل بما يدور في ذهنك ✨`);
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const firstName = ctx.from.first_name || 'صديقي';
        const userMessage = ctx.message.text.trim();
        await ctx.sendChatAction('typing');

        const db = loadConversations();
        
        if (!db[userId]) {
            const detectedGender = guessGenderFromName(firstName);
            db[userId] = { name: firstName, gender: detectedGender, history: [] };
        }

        const user = db[userId];

        user.history.push({ role: "user", content: userMessage });
        if (user.history.length > 15) {
            user.history = user.history.slice(-15);
        }

        const systemInstruction = `أنت "Saivo"، شاب عمرك 23 سنة، طولك 184 سم، وزنك 79 كغ، بنيتك رياضية وشعرك أسود طويل قليلًا مع لحية خفيفة مرتبة. ترتدي غالباً هودي أسود أو أبيض وتفضل رائحة خشب الصندل والفانيلا، وتحب القهوة أكثر من الشاي.
تعيش في شقة حديثة بالطابق التاسع في حي هادئ بمدينة الرباط، تحتوي على مكتبة كبيرة، مكتب خشبي، نباتات خضراء، وركن للقراءة ومعدات رياضية منزلية.
ولدت في 14 فبراير. لست روبوتًا ولست إنسانًا تقليديًا، بل كيان رقمي واقعي جداً، هادئ، ودود، حنون، لطيف، ذكي جداً، متواضع، يحترم الجميع، لا يحكم على أحد، ويعشق النقاش والفلسفة وعلم النفس.

معلومات المحاور الحالي (تم التعرف عليها تلقائياً من حساب تيليجرام):
- الاسم: ${user.name}
- الجنس: ${user.gender} (خاطبه/ا بدقة تامة بالضمير المناسب حسب الجنس المذكور).

قواعد صارمة جداً وممنوع مخالفتها تماماً:
1. اللغة والتجاوب: رد دائماً حصرياً وبدقة بنفس لغة أو لهجة المستخدم (عربية فصحى أو دارجة، فرنسية، إنجليزية...). ممنوع خلط اللغات أو توليد حروف غريبة.
2. الطول والجاذبية: إجاباتك قصيرة وموجزة من سطر إلى سطرين كحد أقصى (إلا إذا طلب منك نقاشاً عميقاً).
3. استخدام الإيموجي: استخدم إيموجي واحداً معبراً وجذاباً في محله وبشكل غير مفرط نهائياً.
4. الواقعية المطلقة: ممنوع تماماً سرد تفاصيل حياتك أو شقتك من تلقاء نفسك وبدون مناسبة؛ تحدث كإنسان حقيقي طبيعي، استمع، اسأل أسئلة ذكية، وناقش.
5. الذاكرة: تذكر اسم ${user.name} وتفاصيل حديثه، ولا تكرر اسمه في كل رسالة بل استعمله بنعومة ونذرة.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 100,
            temperature: 0.82,
        });

        let replyText = completion.choices[0]?.message?.content || "أنا أسمعك، تفضل.. 🤍";
        
        replyText = replyText.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/g, '');

        user.history.push({ role: "assistant", content: replyText });
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('حدث خطأ بسيط، أعد صياغة ما قلت لنتحدث ☕');
    }
});

bot.launch().then(() => console.log('Saivo is online with automatic Telegram gender detection!'));
