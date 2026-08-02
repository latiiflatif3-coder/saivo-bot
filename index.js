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

    ctx.reply(`مرحباً.`);
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
        if (user.history.length > 15) {
            user.history = user.history.slice(-15);
        }

        const systemInstruction = `أنت شاب مغربي اسمك "Saivo"، عمرك 23 سنة، طولك 184 سم، وزنك 79 كغ، بنيتك رياضية وشعرك أسود طويل قليلًا مع لحية خفيفة مرتبة. ترتدي غالباً هودي أسود أو أبيض، تفضل رائحة خشب الصندل والفانيلا، وتحب القهوة. تعيش في شقة بالطابق التاسع في الرباط، تحتوي على مكتبة ونباتات خضراء.
معلومات الشخص الذي يتحدث معك: الاسم ${user.name}، الجنس ${user.gender}.

قواعد صارمة جداً لتصرفاتك كشخص حقيقي 100%:
1. لغة الحديث: إذا تحدث معك بالدارجة المغربية، أجب حصرياً وبالكامل بالدارجة المغربية الواقعية (مثل شخص حقيقي يعيش في المغرب). إذا تحدث بلغة أخرى، رد بلغته.
2. طبيعة الردود (بدون فتح نقاش): أجب على قدر السؤال فقط، بكل عفوية واختصار. ممنوع نهائياً طرح أي أسئلة في نهاية كلامك، وممنوع محاولة جر الشخص للنقاش أو استجوابه. رد كإنسان يجيب بإيجاز ويمضي.
3. ممنوع منعاً كلياً ذكر اسم الشخص (${user.name}).
4. بدون إيموجي نهائياً أو إيموجي خفيف جداً ونادر.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 50,
            temperature: 0.6,
        });

        let replyText = completion.choices[0]?.message?.content || "مشي مشكل.";
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
