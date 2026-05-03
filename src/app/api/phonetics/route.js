import { NextResponse } from 'next/server';
import TextToIPA from 'text-to-ipa';

export async function POST(request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Clean text: remove punctuation but keep words
    const words = text.split(/\s+/);
    
    try {
       if (Object.keys(TextToIPA._IPADict || {}).length === 0) {
         const fs = require('fs');
         const path = require('path');
         const data = fs.readFileSync(path.join(process.cwd(), 'node_modules', 'text-to-ipa', 'ipadict.txt'), 'utf8');
         TextToIPA._parseDict(data.split('\n'));
         
         // Mock loadDict so lookup() doesn't try to call it and crash
         TextToIPA.loadDict = () => {};
       }
    } catch(e) {
       console.log("Dict already loaded or error", e);
    }

    const numberToWords = require('number-to-words');

    function getWordIpa(textWord) {
      if (!textWord) return '';
      const lookupResult = TextToIPA.lookup(textWord);
      if (lookupResult.error !== 'undefined') {
        return lookupResult.text.split(' OR ')[0];
      }
      return '';
    }

    const result = words.map(word => {
      // Remove basic and smart punctuation
      let cleanWord = word.replace(/[.,!?\"\'()“”‘’\[\]]/g, '').toLowerCase();
      
      let ipa = '';
      
      if (!isNaN(cleanWord) && cleanWord !== '') {
         try {
           const wordForm = numberToWords.toWords(cleanWord);
           const parts = wordForm.split(/[-\s]+/);
           ipa = parts.map(p => getWordIpa(p)).filter(Boolean).join(' ');
         } catch(e) {}
      } else {
         ipa = getWordIpa(cleanWord);
         // Fallback for possessives/plurals if not found
         if (!ipa && cleanWord.endsWith('s')) {
            const baseIpa = getWordIpa(cleanWord.slice(0, -1));
            if (baseIpa) ipa = baseIpa + 'z';
         }
      }

      return {
        original: word,
        ipa: ipa
      };
    });

    return NextResponse.json({ words: result });
  } catch (error) {
    console.error('Error in phonetics API:', error);
    return NextResponse.json({ error: error.toString() }, { status: 500 });
  }
}
