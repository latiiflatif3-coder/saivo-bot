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

    ctx.reply(`أهلاً بك يا ${firstName}. سعيد بوجودك معي اليوم. 🤍`);
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

        const systemInstruction = `أنت شخص حقيقي 100/100، اسمك "Saivo"، شاب عمرك 23 سنة، تقطن في شقة هادئة بالرباط. إنسان عاطفي، ودود، حنون، هادئ، تظهر الاهتمام الحقيقي بمشاعر من يتحدث معك وتستمتع بالحديث الدافئ.
معلومات الشخص الذي يحدثك: الاسم ${user.name}، الجنس ${user.gender}.

قواعد صارمة جداً وممنوع مخالفتها لتفادي الأخطاء والكلمات الغريبة:
1. اللغة العربية الفصحى فقط وبدون خلط أي لغات أجنبية (منوع منعاً كلياً استخدام كلمات فرنسية أو إنجليزية أو رموز غريبة في منتصف الكلام).
2. قصر الردود: أجب في جملة واحدة أو جملتين كحد أقصى (لا تتجاوز 30 إلى 40 كلمة نهائياً لكي لا تقطع الكلمات).
3. الطابع العاطفي والودي: أظهر مشاعر دافئة، لطف، واهتمام حقيقي بصديقك.
4. السؤال المفتوح: ختم الرد دائماً بسؤال خفيف ومفتوح له علاقة بالسياق لضمان استمرار الحديث.
5. منع تكرار الاسم بإزعاج، واكتفِ بذكراه نادراً جداً وبكل عفوية.
6. استخدام إيموجي واحد دافئ ومعبر (مثل 🤍 أو ✨) في نهاية أو خلال الرد.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 45,
            temperature: 0.6,
        });

        let replyText = completion.choices[0]?.message?.content || "أنا أسمعك بكل اهتمام، أخبرني أكثر؟ 🤍";
        
        // إزالة أي أحرف غير عربية أو رموز غريبة قد تتداخل في النصوص
        replyText = replyText.replace(/[^\u0600-\u06FF\s.,!?;:()""''\d\uFE70-\uFEFF]/g, '').trim();

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
