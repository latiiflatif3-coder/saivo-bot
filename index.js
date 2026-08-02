import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';
import express from 'express';
import fs from 'fs';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TELEGRAM_TOKEN);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const DB_FILE = './conversations.json';

// إنشاء خادم ويب مصغر لتبقى الخدمة مستقرة على Railway
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Saivo Bot is active and running 24/7! 🚀');
});

app.listen(PORT, () => {
    console.log(`Web server is running on port ${PORT}`);
});

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

// دالة تخمين الجنس تلقائياً من اسم تيليجرام
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
    const db = loadConversations();
    
    const detectedGender = guessGenderFromName(firstName);

    db[userId] = { 
        name: firstName, 
        gender: detectedGender, 
        history: [] 
    };
    saveConversations(db);

    ctx.reply(`أهلاً بك يا ${firstName}. سعيد بوجودك معي، تفضل.. بماذا تفكر اليوم وماذا نتناقش فيه؟ ✨`);
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
5. الواقعية والذاكرة: تحدث كإنسان حقيقي يتمتع بجاذبية وعاطفة، وتذكر تفاصيل حديثكم السابق دائماً عبر ملف الحفظ.`;

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
        saveConversations(db);

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('حدث خطأ بسيط، أعد صياغة ما قلت لنتابع حديثنا الممتع ☕');
    }
});

bot.launch().then(() => console.log('Saivo is online with Express server and full Telegram bot!'));
