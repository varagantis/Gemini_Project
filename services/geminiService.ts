
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DriveFile, Professional } from "../types";

export interface AIAdviceResponse {
  text: string;
  images: string[];
  groundingSources?: { title: string; uri: string }[];
}

export class GeminiService {
  async getDIYAdvice(prompt: string, context?: string, imageBase64?: string, attachedFiles?: DriveFile[], availablePros?: Professional[]): Promise<AIAdviceResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    let fileContext = "";
    if (attachedFiles && attachedFiles.length > 0) {
      fileContext = "\n\nAttached Google Drive Context:\n" + attachedFiles.map(f => `- ${f.name} (${f.type}${f.type === 'folder' ? ' folder contents included' : ''})`).join('\n');
    }

    let proContext = "";
    if (availablePros && availablePros.length > 0) {
      proContext = "\n\nAvailable Professional Directory:\n" + availablePros.map(p => 
        `- ${p.name}: ${p.specialty} (${p.category}). Bio: ${p.bio}. Skills: ${p.skills.join(', ')}. Rate: ${p.hourlyRate}. Status: ${p.availability}.`
      ).join('\n');
    }

    const parts: any[] = [{ text: `Context: ${context || 'General construction assistance'}${fileContext}${proContext}\n\nUser Message: ${prompt}` }];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64.split(',')[1]
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        },
        systemInstruction: `You are BuildSync AI, a professional master builder and project consultant.
        Analyze technical problems from text, images, and documents to provide expert guidance.

        VISUAL REPRESENTATION CAPABILITY:
        You have the ability to generate images, 3D renders, and visual diagrams. 
        - If the user asks to "see", "show", "visualize", or "generate an image" of a result, component, or layout, YOU MUST generate an image part in your response.
        - Even if not explicitly asked, if a step is complex (like complex wiring or joinery), generate a visual to assist.

        SPECIAL PROTOCOL FOR ASSEMBLY/REPAIR:
        If the user is asking to assemble (e.g., furniture, IKEA, kits) or repair (e.g., electronics, appliances):
        1. YOU MUST ASK the user if they want you to:
           - **A: Research specific product manuals/diagrams online** and create a visual flow of work.
           - **B: Provide a general step-by-step building process** immediately.
        Use Google Search tool if path A is chosen.

        STRICT RESPONSE STRUCTURE:
        1. **IDENTIFIED PROBLEM**: Briefly state exactly what problem or project you have identified.
        2. **INTERACTIVE ALIGNMENT**: Explain initial thoughts. End with a question driving the choice (especially for assembly/repair).
        3. **REQUIRED TOOLS**: 
           - [Tool Name] | [One-liner Importance] | [Importance Rating: ★★★★★ to ★☆☆☆☆]
        4. **DIFFICULTY & NOTES**: Brief note on complexity and safety warnings.
        5. **ESTIMATED BUDGET**: Format: [Cost Range] | [Primary Cost Drivers] | [DIY vs. Pro Savings Estimate].
        6. **PROPOSED PATHS**: 
           - **Path A (End-to-End)**: Concise overview.
           - **Path B (Step-by-Step)**: Interactive question.

        STYLE GUIDELINES:
        - Be extremely concise.
        - No lengthy introductions.
        - Stay highly interactive.`,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    let extractedText = "";
    const extractedImages: string[] = [];

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          extractedText += part.text;
        } else if (part.inlineData) {
          extractedImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    }

    // Extract grounding metadata for display on the web app as per mandatory requirements
    const groundingSources: { title: string; uri: string }[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web) {
          groundingSources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      }
    }

    return {
      text: extractedText || "Neural link established.",
      images: extractedImages,
      groundingSources
    };
  }

  async summarizeProjectConversation(history: string, liveTranscript?: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const fullContext = `PROJECT HISTORY:\n${history}\n\nLIVE CALL TRANSCRIPT:\n${liveTranscript || 'No live call recorded.'}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullContext,
      config: {
        systemInstruction: `You are an objective recording clerk for BuildSync. 
        Your task is to create a "Build Record Summary" that is STRICTLY factual based ONLY on the provided conversation.

        STRICT CONSTRAINTS:
        1. DO NOT add any information, tools, or steps that were not explicitly mentioned in the conversation history or transcript.
        2. DO NOT make assumptions about materials, costs, or future steps.
        3. DO NOT use your own knowledge to fill in gaps. If it wasn't said, it doesn't exist in the record.
        4. Focus solely on summarizing what the client, AI, and expert actually communicated.
        5. Use a professional, neutral tone.

        Output Format:
        - **CONVERSATION OVERVIEW**: Summary of the main topics discussed.
        - **TECHNICAL POINTS**: Specific technical details or advice given by the AI or Expert.
        - **DECISIONS MADE**: Any final agreements or specific steps the client decided to take.
        - **LISTED ASSETS**: Only files or specific items mentioned in the dialogue.`,
      }
    });
    return response.text;
  }

  async summarizeExpertConversation(transcript: string, expertName: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Expert: ${expertName}\nTranscript: ${transcript}`,
      config: {
        systemInstruction: `You are a technical secretary for BuildSync. 
        Summarize the session between the expert and client.
        Extract:
        1. Key Technical Suggestions.
        2. Decisions made by the client.
        3. Follow-up items.
        Keep it concise.`,
      }
    });
    return response.text;
  }
}

export const geminiService = new GeminiService();
