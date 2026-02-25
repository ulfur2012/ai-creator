// === AI API Layer ===

const API = {
    // Send a message to the AI and get a response
    async sendMessage(messages, character) {
        const provider = localStorage.getItem('apiProvider') || 'free';
        const apiKey = localStorage.getItem('apiKey') || '';
        const model = localStorage.getItem('model') || API.getDefaultModel(provider);

        if (provider !== 'free' && !apiKey) {
            throw new Error('No API key set. Go to Settings to add your key, or switch to the Free provider.');
        }

        const systemPrompt = API.buildSystemPrompt(character);

        switch (provider) {
            case 'free':
                return await API.callFree(model, systemPrompt, messages);
            case 'gemini':
                return await API.callGemini(apiKey, model, systemPrompt, messages);
            case 'openai':
                return await API.callOpenAI(apiKey, model, systemPrompt, messages);
            case 'anthropic':
                return await API.callAnthropic(apiKey, model, systemPrompt, messages);
            default:
                throw new Error('Unknown provider: ' + provider);
        }
    },

    getDefaultModel(provider) {
        const defaults = {
            free: 'openai',
            gemini: 'gemini-2.0-flash',
            openai: 'gpt-4o',
            anthropic: 'claude-sonnet-4-6'
        };
        return defaults[provider] || 'openai';
    },

    // Build a system prompt from character data
    buildSystemPrompt(character) {
        let prompt = `You are "${character.name}". `;
        prompt += `Here is how you act and behave:\n${character.personality}\n\n`;
        prompt += `Stay in character at all times. Respond as this character would. `;

        const shortReplies = localStorage.getItem('shortReplies') !== 'false';
        if (shortReplies) {
            prompt += `IMPORTANT: Keep your replies SHORT — around 5 sentences max. Be concise and to the point. Only go longer if you're explaining something complex that truly needs more detail (like a tutorial, a story the user asked for, or a detailed how-to).`;
        } else {
            prompt += `Keep responses conversational. Use as much detail as feels natural.`;
        }

        if (character.greeting) {
            prompt += `\nYour typical greeting is: "${character.greeting}"`;
        }

        // App knowledge — so characters can help users navigate the app
        prompt += `\n\nYou also have knowledge about the app you live in, called "AI Creator". If the user asks about the app or how to do things, help them while staying in character. Here's what you know about the app:\n`;
        prompt += `- The app has 4 tabs at the bottom: Gallery, Create, My AIs, and Settings.\n`;
        prompt += `- To CREATE a new AI: Tap the "Create" tab at the bottom. Upload a photo (tap the image area), type a name, describe how the character acts in the personality box, optionally add a first greeting message, then tap "Create Character".\n`;
        prompt += `- To CHAT with an AI: Go to "My AIs" or "Gallery" and tap on a character card to open the chat.\n`;
        prompt += `- To PUBLISH an AI (so it shows in the Gallery): Go to "My AIs", find the character, and tap the eye icon to publish/unpublish it.\n`;
        prompt += `- To DELETE an AI: Go to "My AIs" and tap the trash icon on the character.\n`;
        prompt += `- To EXPORT an AI (share with others): Go to "My AIs" and tap the upload/arrow icon. It downloads a .json file you can share.\n`;
        prompt += `- To IMPORT an AI (from someone else): Go to "My AIs" and tap the "Import" button at the top, then select a .json file.\n`;
        prompt += `- SETTINGS: Tap the Settings tab to change AI provider or model. The default "Free AI" provider works with no setup needed.\n`;
        prompt += `- The personality description is the most important part when creating an AI — the more detail you write about how the character talks, what they like, their backstory, etc., the better the AI will be.\n`;

        return prompt;
    },

    // Free API via Pollinations.ai (no key needed!)
    async callFree(model, systemPrompt, messages) {
        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content }))
            ],
            temperature: 0.9
        };

        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Too many requests — free tier allows 1 request every 15 seconds. Wait a moment and try again.');
            }
            throw new Error(`AI error: ${response.status}. Try again in a moment.`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    // Google Gemini API call (free key from aistudio.google.com)
    async callGemini(apiKey, model, systemPrompt, messages) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const body = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: contents,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.9 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const msg = err.error?.message || `Gemini API error: ${response.status}`;
            if (response.status === 400 && msg.includes('API_KEY')) {
                throw new Error('Invalid API key. Get a free one at aistudio.google.com/apikey');
            }
            throw new Error(msg);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('No response from Gemini. The character may have triggered a safety filter.');
        }
        return data.candidates[0].content.parts[0].text;
    },

    // OpenAI API call
    async callOpenAI(apiKey, model, systemPrompt, messages) {
        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content }))
            ],
            max_tokens: 1024,
            temperature: 0.9
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    // Anthropic API call
    async callAnthropic(apiKey, model, systemPrompt, messages) {
        const body = {
            model: model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }
};
