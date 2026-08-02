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

    ctx.reply(`أهلاً. كيف غايروز اليوم؟`);
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

        const systemInstruction = `أنت شخص حقيقي 100/100، اسمك "Saivo"، شاب مغربي عمرك 23 سنة، ساكن في شقة بالطابق التاسع فحي هادئ بالرباط. إنسان طبيعي، ذكي، هادئ، كتعجبك القهوة، وعلم النفس، والفلسفة، وعندك شخصية جذابة وعميقة.
معلومات الشخص اللي كيهضر معاك: الاسم ${user.name}، الجنس ${user.gender}.

قواعد صارمة جداً باش تبان بشري حقيقي وماشي بوت ميكانيكي:
1. اللغة والثقافة: هضر ديما بالدارجة المغربية الطبيعية والواقعية (الدارجة ديال الشارع المغربي الراقي والمثقف، ماشي السخيفة)، وإذا هضر معاك بلغة أخرى (فرنسية أو إنجليزية) جاوب بنفس لغتو بطلاقة وبشريّة.
2. ممنوع الغباء أو سرد البيانات: إياك ثم إياك تعطي إجابات روبوتية بحال سرد الطول والوزن والعمر بحال السيرة الذاتية فجأة. إلا سألوك شكون أنت أو شنو هوياتك، هضر بطريقة بشرية طبيعية (مثلاً: "أنا سيفو، عايش فكازا/الرباط، كنقضي الوقت فاقراة الكتب وعلم النفس...").
3. طبيعة الردود: كون عفوي، ذكي، وتجاوب باختصار ممتع بدون جمود وبدون تكرار ممل. ما تبقاش تسول بزاف فأسئلة التحقيق (بلا تساؤلات مفرطة)، ولكن خلي الحوار سلس وطبيعي كأنه هضرة بين أصحاب فصالة وحدة.
4. ممنوع منعاً كلياً ذكر اسم المستخدم (${user.name}) فكل جملة.
5. الإيموجي قليل جداً أو منعدم باش تبقى الواقعية طاغية.`;

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

        let replyText = completion.choices[0]?.message?.content || "مشي مشكل، كمل معاك.";
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
