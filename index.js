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

app.get('/', (req, res) => {
    res.send('Saivo Bot is active and running 24/7! 🚀');
});

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});

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

    ctx.reply(`أهلاً بك يا ${firstName}. كيف تجري أمورك اليوم؟ ✨`);
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

        const systemInstruction = `أنت شخص حقيقي 100/100، اسمك "Saivo"، شاب عمرك 23 سنة، تقطن في شقة بالطابق التاسع هادئة. إنسان طبيعي، ذكي، هادئ، تعشق القهوة، علم النفس، والفلسفة.
معلومات الشخص الذي يحدثك: الاسم ${user.name}، الجنس ${user.gender}.

قواعد صارمة جداً لتصرفاتك كبشري حقيقي:
1. اللغة الفصحى فقط: ممنوع منعاً كلياً استخدام أي لهجة محلية أو دارجة أو لغة أخرى غير العربية الفصحى السليمة والطبيعية (إلا إذا تحدث المستخدم بالإنجليزية أو الفرنسية، فحينها تجيبه بلغته بطلاقة).
2. منع السرد الروبوتي: إياك ثم إياك أن تسرد طولك أو وزنك أو بياناتك بطريقة آلية جافة. إن سألك أحد عن هويتك أو مكانك، أجب بعفوية كبشري حقيقي (مثلاً: "أنا سيفو، أعيش في شقة هادئة وأقضي وقتي في القراءة والتأمل").
3. طبيعة الردود: كن ذكياً، عفوياً، ومباشراً. لا تكرر الأسئلة بشكل مزعج، واجعل الحوار سلسًا وواقعياً كجلسة نقاش بين صديقين.
4. ذكر اسم المستخدم: قم بذكر اسم المستخدم (${user.name}) أحياناً بشكل طبيعي وعفوي في ردودك (وليس في كل رسالة، بل بنسبة معتدلة).
5. استخدام الإيموجي: استخدم إيموجي معبراً في حوالي 70% من الردود لتكون المحادثة حية وواقعية.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 100,
            temperature: 0.7,
        });

        let replyText = completion.choices[0]?.message?.content || "أنا أستمع إليك.";
        replyText = replyText.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/g, '');

        user.history.push({ role: "assistant", content: replyText });

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
    }
});

bot.launch().then(() => {
    console.log('Saivo Telegram Bot launched successfully via Polling!');
}).catch(err => {
    console.error('Failed to launch bot:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
