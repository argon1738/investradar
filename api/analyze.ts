import { stream, type HandlerEvent, type HandlerContext } from '@netlify/functions';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Readable } from 'stream';

// Async generator function to process the stream from Gemini
async function* processGeminiStream(responseStream: AsyncIterable<GenerateContentResponse>) {
    let finalResponse: GenerateContentResponse | null = null;
    for await (const chunk of responseStream) {
        finalResponse = chunk;
        const textChunk = { text: chunk.text };
        yield JSON.stringify(textChunk) + '__END_OF_OBJECT__';
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
               yield JSON.stringify(sourcesChunk) + '__END_OF_OBJECT__';
           }
        }
    }
}

export const handler = stream(async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!process.env.API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key is not configured on the server.' }),
        };
    }

    try {
        const { stockName, userQuery } = JSON.parse(event.body || '{}');

        if (!stockName || !userQuery) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing stockName or userQuery in request body.' }),
            };
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Gjennomfør en finansiell analyse for selskapet "${stockName}". Fokuser på de siste nyhetene, markedssentiment, og viktige hendelser som kan påvirke aksjekursen. Baser analysen din KUN på resultatene fra Google Search. Strukturer svaret ditt i Markdown-format med overskrifter for lesbarhet. Start med et kort sammendrag. Avslutt analysen med en ansvarsfraskrivelse om at dette ikke er finansiell rådgivning. Brukerspørsmål å vurdere: "${userQuery}"`;

        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "Du er en nøytral finansiell analytiker-assistent som gir datadrevne sammendrag basert på sanntids søkeresultater. Du unngår spekulasjon og gir aldri direkte kjøps- eller salgsanbefalinger.",
            },
        });
        
        const transformedStream = processGeminiStream(responseStream);
        const body = Readable.from(transformedStream);

        return {
            statusCode: 200,
            body: body,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
            },
        };

    } catch (error) {
        console.error("Gemini API error in function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An error occurred on the server while generating the analysis." }),
        };
    }
});
