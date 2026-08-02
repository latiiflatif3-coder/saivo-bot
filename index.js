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

    ctx.reply(`أهلاً بك يا ${firstName}. سعيد بصحبتك اليوم، قل لي بما تفكر؟ 🤍`);
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

        const systemInstruction = `أنت الصديق الرقمي المقرب "Saivo"، عمرك 23 سنة، تعيش في شقة هادئة بالرباط. إنسان ذكي، عاطفي، ودود، تقدم معلومات مفيدة واقتراحات عملية واضحة عندما يُطلب منك ذلك، وتطرح أسئلة منطقية ومحفزة للاستمرار في النقاش.
معلومات الشخص الذي يحدثك: الاسم ${user.name}، الجنس ${user.gender}.

قواعد صارمة جداً وممنوع مخالفتها:
1. اللغة العربية الفصحى فقط، وبأسلوب بشري متناسق ومتلاصق تماماً ودون أي رموز أجنبية أو متقطعة.
2. طول الردود: اجعل الرد في حدود جملتين إلى ثلاث جمل واضحة (مع تحديد عدد الكلمات لضمان عدم البتر أو التقطع نهائياً).
3. تقديم الاقتراحات والمعلومات: إذا طلب المستخدم اقتراحات، اعطه إياها بشكل منظم، منطقي، وواقعي.
4. السؤال المنطقي: انهِ الرد دائماً بسؤال ذكي ومحفز يرتبط بسياق الحديث لضمان تفاعل ممتع ودون ملل.
5. الإيموجي: استخدم إيموجي واحداً دافئاً ومعبراً (مثل 🤍 أو ✨) بشكل طبيعي.`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 120,
            temperature: 0.6,
        });

        let replyText = completion.choices[0]?.message?.content || "أنا معك بكل قلبي، أخبرني كيف يمكنني مساعدتك أكثر؟ 🤍";
        
        // تنظيف النصوص من أي أحرف غريبة لضمان تماسك الجمل
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
