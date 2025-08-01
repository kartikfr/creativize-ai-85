import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardName, bankName, platform, audience, language, tone, customPrompt } = await req.json();
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Construct the prompt
    const prompt = `Create 4 variations of content to promote the "${cardName}" credit card from ${bankName}.
Platform: ${platform}
Audience: ${audience}
Language: ${language}
Tone: ${tone}

${customPrompt ? `Additional instruction: ${customPrompt}` : ''}

The content should be platform-appropriate, concise, and persuasive. Return exactly 4 different variations, each on a new line, numbered 1-4.`;

    console.log('Sending prompt to Gemini:', prompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Split the response into 4 variations
    const variations = generatedText
      .split(/\d+\./)
      .filter(text => text.trim())
      .map(text => text.trim())
      .slice(0, 4);

    // Ensure we have exactly 4 variations
    while (variations.length < 4) {
      variations.push(`${cardName} from ${bankName} - Great choice for ${audience.toLowerCase()}!`);
    }

    console.log('Generated variations:', variations);

    return new Response(JSON.stringify({ variations: variations.slice(0, 4) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});