import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: `Analyze this PUBG Mobile match result screenshot. Extract the following information:

1. Team placement (rank like #1, #2, etc - the number shown at top like "#13/82")
2. Total team kills (sum of all player eliminations)
3. Player stats - for each player in the team, extract:
   - Player name (shown in "Name" column, e.g., "NfB | THOR", "NfB | MURIKHA", "SHAHAZZ", "NfB | RaheBEATS")
   - Individual kills (shown in "Eliminations" column)
   - Individual damage (shown in "Damage" column, numeric value like 79, 487, 19, 434)

Return JSON in this exact format:
{
  "placement": number,
  "kills": number,
  "players": [
    { "name": "player name", "kills": number, "damage": number },
    { "name": "player name", "kills": number, "damage": number }
  ]
}

If you cannot find these values, return null for those fields. Make sure to extract all 4 players if visible.`
          }, {
            type: 'image_url',
            image_url: { url: imageUrl }
          }]
        }],
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data));
    
    let content = data.choices[0]?.message?.content || '{}';
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('Parsed content:', content);
    
    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
