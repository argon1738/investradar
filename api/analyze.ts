import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: status,
    });
};

export default async (request: Request) => {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const API_KEY = process.env.API_KEY; 
    if (!API_KEY) {
        return jsonResponse({ error: 'API key is not configured on the server.' }, 500);
    }

    try {
        const { stockName, userQuery } = await request.json();

        if (!stockName || !userQuery) {
            return jsonResponse({ error: 'Missing stockName or userQuery in request body.' }, 400);
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const prompt = `Gjennomfør en finansiell analyse for selskapet "${stockName}". Fokuser på de siste nyhetene, markedssentiment, og viktige hendelser som kan påvirke aksjekursen. Baser analysen din KUN på resultatene fra Google Search. Strukturer svaret ditt i Markdown-format med overskrifter for lesbarhet. Start med et kort sammendrag. Avslutt analysen med en ansvarsfraskrivelse om at dette ikke er finansiell rådgivning. Brukerspørsmål å vurdere: "${userQuery}"`;

        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "Du er en nøytral finansiell analytiker-assistent som gir datadrevne sammendrag basert på sanntids søkeresultater. Du unngår spekulasjon og gir aldri direkte kjøps- eller salgsanbefalinger.",
            },
        });
        
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                let finalResponse: GenerateContentResponse | null = null;
                for await (const chunk of responseStream) {
                    finalResponse = chunk;
                    const textChunk = { text: chunk.text };
                    controller.enqueue(encoder.encode(JSON.stringify(textChunk) + '__END_OF_OBJECT__'));
                }

                if (finalResponse) {
                    const groundingMetadata = finalResponse.candidates?.[0]?.groundingMetadata;
                    if(groundingMetadata?.groundingChunks) {
                       const sources = groundingMetadata.groundingChunks
                           .map(chunk => chunk.web)
                           .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title)
                           .map(source => ({ uri: source.uri, title: source.title || "Ukjent tittel" }))
                           .filter((value, index, self) => self.findIndex(s => s.uri === value.uri) === index);
                       
                       if (sources.length > 0) {
                           const sourcesChunk = { sources };
                           controller.enqueue(encoder.encode(JSON.stringify(sourcesChunk) + '__END_OF_OBJECT__'));
                       }
                    }
                }
                controller.close();
            },
        });

        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
        };

        return new Response(readableStream, { status: 200, headers });

    } catch (error) {
        console.error("Gemini API error in function:", error);
        return jsonResponse({ error: "An error occurred on the server while generating the analysis." }, 500);
    }
};
