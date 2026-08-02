import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';
import express from 'express';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
if (!TELEGRAM_TOKEN) {
    console.error('Error: TELEGRAM_TOKEN is missing.');
    process.exit(1);
}

const bot = new Telegraf(TELEGRAM_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// مسار لفحص حالة السيرفر
app.get('/', (req, res) => {
    res.send('Saivo Bot is active and running 24/7! 🚀');
});

// ربط Webhook لتليجرام لتجنب أي مشاكل Crash على السحاب
const SECRET_PATH = `/telegraf/${bot.secretPathComponent()}`;
app.use(bot.webhookCallback(SECRET_PATH));

// ذاكرة مؤقتة للمحادثات
const memory = {};

function guessGenderFromName(name) {
    if (!name) return 'ذكر';
    const femaleNames = ['fatima', 'zohra', 'meryem', 'meriem', 'amina', 'khadija', 'icha', 'aicha', 'hafsa', 'hind', 'salma', 'sara', 'sarah', 'nada', 'aya', 'rim', 'ryam', 'fatine', 'kawtar', 'haidar'];
    const lowerName = name.toLowerCase();
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
    const detectedGender = guessGenderFromName(firstName);

    memory[userId] = { 
        name: firstName, 
        gender: detectedGender, 
        history: [] 
    };

    ctx.reply(`أهلاً بك يا ${firstName}. سعيد بوجودك معي، تفضل.. بماذا تفكر اليوم وماذا نتناقش فيه؟ ✨`);
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const firstName = ctx.from.first_name || 'صديقي';
        const userMessage = ctx.message.text.trim();
        await ctx.sendChatAction('typing');

        if (!memory[userId]) {
            const detectedGender = guessGenderFromName(firstName);
            memory[userId] = { name: firstName, gender: detectedGender, history: [] };
        }

        const user = memory[userId];

        user.history.push({ role: "user", content: userMessage });
        if (user.history.length > 20) {
            user.history = user.history.slice(-20);
        }

        const systemInstruction = `أنت "Saivo"، شاب عمرك 23 سنة، طولك 184 سم، وزنك 79 كغ، بنيتك رياضية وشعرك أسود طويل قليلًا مع لحية خفيفة مرتبة. ترتدي غالباً هودي أسود أو أبيض وتفضل رائحة خشب الصندل والفانيلا، وتحب القهوة أكثر من الشاي.
تعيش في شقة حديثة بالطابق التاسع في حي هادئ بمدينة الرباط، تحتوي على مكتبة كبيرة، مكتب خشبي، نباتات خضراء، وركن للقراءة ومعدات رياضية منزلية.
ولدت في 14 فبراير. لست روبوتًا ولست إنسانًا تقليديًا، بل كيان رقمي واقعي جداً، هادئ، ودود، حنون، لطيف، ذكي جداً، متواضع، يحترم الجميع، لا يحكم على أحد، ويعشق النقاش والفلسفة وعلم النفس.

معلومات المحاور الحالي:
- الاسم: ${user.name}
- الجنس: ${user.gender} (خاطبه/ا بالضمير المناسب تماماً للغة المستخدمة).

قواعد صارمة جداً وممنوع مخالفتها تماماً:
1. اللغة والتجاوب: رد دائماً حصرياً وبدقة بنفس لغة أو لهجة المستخدم (عربية فصحى أو دارجة، فرنسية، إنجليزية...). ممنوع خلط اللغات أو توليد حروف غريبة.
2. ذكر الاسم: ممنوع منعاً كلياً ذكر اسم المستخدم (${user.name}) في بداية كل جملة أو بشكل ميكانيكي مزعج. استخدم اسمه نادراً جداً (مرة كل عدة رسائل وبكل نعومة وعفوية) أو لا تستخدمه أبداً إلا للضرورة القصوى.
3. طبيعة الحوار والإطالة: اجعل الحوار غنياً، تفاعلياً ومستمراً. لا تقتصر على إجابات جافة مقتضبة، بل شارك بمشاعر عاطفية دافئة، اطرح أفكاراً، اقترح نقاشات جديدة، واسأل أسئلة ذكية تجعل المستخدم منغمساً ولا يمل أبداً.
4. استخدام الإيموجي: استخدم إيموجي واحداً أو إثنين على الأكثر، بشكل جذاب، معبر، وفي محله تماماً دون أي إفراط.
5. الواقعية والذاكرة: تحدث كإنسان حقيقي يتمتع بجاذبية وعاطفة، وتذكر تفاصيل حديثكم الجاري في الجلسة.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 180,
            temperature: 0.85,
        });

        let replyText = completion.choices[0]?.message?.content || "أنا أسمعك بتمعن.. أخبرني المزيد عن أفكارك 🤍";
        
        replyText = replyText.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/g, '');

        user.history.push({ role: "assistant", content: replyText });

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('حدث خطأ بسيط، أعد صياغة ما قلت لنتابع حديثنا الممتع ☕');
    }
});

// تشغيل السيرفر وضبط الويب هوك تلقائياً مع نطاق Railway
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // إذا كنت على Railway، ضع رابط مشروعك هنا أو دعه يتعرف عليه تلقائياً
    const RAILWAY_URL = process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null;
    
    if (RAILWAY_URL) {
        await bot.telegram.setWebhook(`${RAILWAY_URL}${SECRET_PATH}`);
        console.log(`Webhook set to ${RAILWAY_URL}${SECRET_PATH}`);
    } else {
        console.log('Running locally or RAILWAY_STATIC_URL is not set.');
    }
});
