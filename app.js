const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const qs = require('qs');

const app = express();
app.use(express.json());
app.use(cors());

const LANGUAGES = {
    'C#': 1,
    'F#': 3,
    'Java': 4,
    'Python': 5,
    'C': 6,
    'C++': 7,
    'Php': 8,
    'Haskell': 11,
    'Ruby': 12,
    'Perl': 13,
    'Lua': 14,
    'Nasm': 15,
    'Javascript': 17,
    'Go': 20,
    'Scala': 21,
    'D': 30,
    'Swift': 37,
    'Bash': 38,
    'Erlang': 40,
    'Elixir': 41,
    'Ocaml': 42,
    'Kotlin': 43,
    'Rust': 46,
    'Clojure': 47,
    'ATS': 48,
    'Cobol': 49,
    'Coffeescript': 50,
    'Crystal': 51,
    'Elm': 52,
    'Groovy': 53,
    'Idris': 54,
    'Julia': 55,
    'Mercury': 56,
    'Nim': 57,
    'Nix': 58,
    'Raku': 59,
    'TypeScript': 60
};

const keywordsCache = {};

function loadKeywords() {
    for (const [lang, langNumber] of Object.entries(LANGUAGES)) {
        const filePath = path.join(__dirname, `${lang}.txt`);
        if (fs.existsSync(filePath)) {
            const keywords = fs.readFileSync(filePath, 'utf-8').split('\n').map(kw => kw.trim()).filter(kw => kw);
            keywordsCache[lang] = new Set(keywords);
        }
    }
}

function detectLanguage(inputText) {
    const inputWords = new Set(inputText.match(/\b\w+\b/g));
    
    // Check for specific constructs
    if (/^#include\s+<\w+\.h>/.test(inputText) && /int\s+main\s*\(/.test(inputText)) {
        return 'C';
    }
    if (/public\s+class\s+\w+\s*{/.test(inputText) && /public\s+static\s+void\s+main\s*\(/.test(inputText)) {
        return 'Java';
    }
    if (inputText.includes('<!DOCTYPE html>') && inputText.includes('</html>')) {
        return 'HTML';
    }
    if (/body\s*{/.test(inputText) && /}/.test(inputText)) {
        return 'CSS';
    }
    if (/print\s*\(/.test(inputText)) {
        return 'Python';
    }
    
    for (const [lang, keywords] of Object.entries(keywordsCache)) {
        if ([...inputWords].some(word => keywords.has(word))) {
            return lang;
        }
    }
    
    return "Unknown language";
}

loadKeywords();

async function executeCode(language, code) {
    const languageNumber = LANGUAGES[language];
    if (!languageNumber) {
        throw new Error('Unsupported language');
    }

    const data = qs.stringify({
        LanguageChoice: languageNumber,
        Program: code,
        Input: ''
    });

    try {
        const response = await axios.post('https://code-compiler.p.rapidapi.com/v2', data, {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-rapidapi-host': 'code-compiler.p.rapidapi.com',
                'x-rapidapi-key': '4ba403db68msh487a2832a8e16ccp1b7798jsn174f464151b2'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

app.post('/execute_code', async (req, res) => {
    const { code } = req.body;
    const detectedLanguage = detectLanguage(code);
    if (detectedLanguage !== 'Unknown language') {
        const output = await executeCode(detectedLanguage, code);
        if (output) {
            res.json({ detectedLanguage, output });
        } else {
            res.status(500).json({ error: 'Execution error' });
        }
    } else {
        res.status(400).json({ error: 'Unknown language' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
