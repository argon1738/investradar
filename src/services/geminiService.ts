import { GroundingSource } from "../types";

export async function* generateStockAnalysisStream(
    stockName: string, 
    userQuery: string
): AsyncGenerator<{ text?: string; sources?: GroundingSource[]; error?: string }> {
    
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockName, userQuery }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        yield { error: errorData.error || "Failed to start analysis stream." };
        return;
    }

    if (!response.body) {
        yield { error: "Response body is missing." };
        return;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                // If there's anything left in the buffer, try to parse it.
                // This handles the case where the stream ends without a final delimiter.
                if (buffer.trim()) {
                    try {
                        yield JSON.parse(buffer);
                    } catch (e) {
                        console.error('Error parsing final chunk from buffer:', e, buffer);
                        yield { error: 'Failed to parse final data from stream.' };
                    }
                }
                break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('__END_OF_OBJECT__');
            
            // The last part might be an incomplete object, so we keep it in the buffer.
            buffer = parts.pop() || '';

            for (const part of parts) {
                if (part.trim()) {
                    try {
                        const parsed = JSON.parse(part);
                        yield parsed;
                    } catch (e) {
                         console.error('Error parsing stream part:', e, part);
                         // It's possible to receive a malformed JSON, so we'll log and continue.
                    }
                }
            }
        }
    } catch (error) {
        console.error("Stream reading error:", error);
        yield { error: "En feil oppstod under strømming av analyse." };
    }
}
