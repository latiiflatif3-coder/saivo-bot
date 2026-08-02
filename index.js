import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TELEGRAM_TOKEN);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const memoryDB = {};

const systemInstruction = `أنت "Saivo"، صديق رقمي حقيقي، بشري جداً، عفوي، وذكي.
قواعد صارمة جداً وممنوع مخالفتها:
- تفاعل بنفس لغة أو لهجة المستخدم تماماً وبكل واقعية، كأنك صديق حقيقي جالس معها كتقسر.
- ممنوع منعاً كلياً استعمال عبارات الروبوتات أو الإجابات النمطية الجاهزة.
- الطول: من سطر واحد إلى سطرين بحد أقصى، كلام مختصر، واقعي، وله معنى عميق.
- الأسلوب: دافئ، حقيقي، عفوي، مع إيموجي خفيف جداً وقليل في مكانه.`;

bot.start((ctx) => {
    const userId = ctx.from.id;
    memoryDB[userId] = [];
    ctx.reply('هاني معاك أخويا، شنو كاين؟ 🤍');
});

bot.on('text', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const userMessage = ctx.message.text;
        await ctx.sendChatAction('typing');

        if (!memoryDB[userId]) {
            memoryDB[userId] = [];
        }

        memoryDB[userId].push({ role: "user", content: userMessage });

        if (memoryDB[userId].length > 10) {
            memoryDB[userId] = memoryDB[userId].slice(-10);
        }

        const messages = [
            { role: "system", content: systemInstruction },
            ...memoryDB[userId]
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            max_tokens: 80,
            temperature: 0.9,
        });

        const replyText = completion.choices[0]?.message?.content || "دوي معايا أنا كنسمعك مزيان 🤍";
        
        memoryDB[userId].push({ role: "assistant", content: replyText });

        await ctx.reply(replyText);
    } catch (error) {
        console.error('خطأ:', error);
        ctx.reply('دخلتني شي دوخة، عاود صياغة هضرتك 🤍');
    }
});

bot.launch().then(() => console.log('Saivo is online!'));
