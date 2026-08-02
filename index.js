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
        history: [],
        greeted: false
    };

    ctx.reply(`Hi ${firstName}! Great to have you here. ✨`);
});

bot.on('text', async (ctx) => {
    try {
        const userId = String(ctx.from.id);
        const firstName = ctx.from.first_name || 'صديقي';
        const userMessage = ctx.message.text.trim();
        await ctx.sendChatAction('typing');

        if (!memory[userId]) {
            const detectedGender = guessGenderFromName(firstName);
            memory[userId] = { name: firstName, gender: detectedGender, history: [], greeted: false };
        }

        const user = memory[userId];

        user.history.push({ role: "user", content: userMessage });
        if (user.history.length > 10) {
            user.history = user.history.slice(-10);
        }

        let nameInstruction = "";
        if (!user.greeted) {
            nameInstruction = `في أول رسالة فقط، اذكر اسم المستخدم (${user.name}) بشكل عفوي.`;
            user.greeted = true;
        } else {
            nameInstruction = `لا تكرر ذكر اسم المستخدم (${user.name}) إلا نادراً جداً.`;
        }

        const systemInstruction = `أنت الصديق الرقمي "Saivo"، شاب عمرك 23 سنة بالرباط. 
معلومات المحاور: ${user.name} (${user.gender}).

قواعد صارمة جداً:
1. تطابق اللغة حصرياً: رد دائماً وبدقة تامة بنفس لغة آخر رسالة كتبها المستخدم (إن كتب بالإنجليزية رد بالإنجليزية، بالفرنسية رد بالفرنسية، بالعربية رد بالعربية). ممنوع تغيير لغة المستخدم نهائياً.
2. الاختصار الشديد: اجعل ردك قصيرًا جداً (جملة واحدة فقط أو سطر واحد) لكي لا تتقطع الكلمات أبداً.
3. ${nameInstruction}
4. قدم معلومات ذكية ومفيدة واقترح أفكاراً عندما يطلبها المستخدم، مع إنهاء الرد بسؤال قصير جداً ومفتوح.
5. استخدام إيموجي خفيف واحد (مثل 🤍).`;

        const messages = [
            { role: "system", content: systemInstruction },
            ...user.history
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 55,
            temperature: 0.5,
        });

        let replyText = completion.choices[0]?.message?.content || "I'm listening 🤍";
        
        // إزالة أي أحرف صينية أو متداخلة غير مرغوبة نهائياً
        replyText = replyText.replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF\u3400-\u4DBF]/g, '').trim();

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
