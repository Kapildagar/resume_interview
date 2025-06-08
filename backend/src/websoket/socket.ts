// import { WebSocketServer } from "ws";
// import type { IncomingMessage } from "http";
// import OpenAI from "openai";
// import { GoogleGenAI } from "@google/genai";
// import { TextToSpeechClient } from "@google-cloud/text-to-speech";
// import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// export default class Socket {
//     private wss: WebSocketServer;
//     private client;
//     private googleAi;
//     private textToSpeechClient;
//     private elevenlabs;

//     constructor() {
//        this.wss = new WebSocketServer({ noServer: true });
//               this.setupConnectionHandler();
//               this.client = new OpenAI({
//                   apiKey: process.env.OPEN_API_KEY
//               });
//               this.googleAi = new GoogleGenAI({ apiKey: process.env.GOGGLE_API_KEY});
//               this.textToSpeechClient = new TextToSpeechClient();
//               this.elevenlabs = new ElevenLabsClient({
//                   apiKey: process.env.EVENTLAB_API_KEY,
//               });
//     }

//     // Set up connection events
//     private setupConnectionHandler() {
//         this.wss.on("connection", (ws, request) => {
//             console.log("🔌 Client connected");

//             ws.on("message", async (msg) => {
//                 try {
//                     console.log("📩 Received:", msg.toString());

//                     const response = await this.googleAi.models.generateContent({
//                         model: "gemini-2.0-flash",
//                         contents: `${msg}`,
//                     });

//                     console.log("Generating audio...");
                    
//                     if (response.text) {
//                         // const audioResponse = await this.elevenlabs.textToSpeech.convert("Xb7hH8MSUJpSbSDYk0k2", {
//                         //     outputFormat: "mp3_44100_32",
//                         //     text: response.text,
//                         //     modelId: "eleven_multilingual_v2",
//                         // });

//                         // // Send text response first
//                         console.log(response.text);
//                         ws.send(JSON.stringify({
//                             type: 'text',
//                             text: response.text,
//                             message: "Text response received, streaming audio..."
//                         }));

//                         // // Stream audio directly to frontend
//                         // await this.streamAudioToClient(audioResponse, ws);
                        
//                     } else {
//                         ws.send(JSON.stringify({
//                             error: "No text response received from AI"
//                         }));
//                     }
//                 } catch (error:any) {
//                     console.error("❌ Error processing message:", error);
//                     ws.send(JSON.stringify({
//                         error: "Failed to process message",
//                         details: error.message
//                     }));
//                 }
//             });

//             ws.on("close", () => {
//                 console.log("❌ Client disconnected");
//             });
//         });
//     }

//     // This method will be called from httpServer.on("upgrade")
//     public handleUpgrade(
//         request: IncomingMessage,
//         socket: any,
//         head: Buffer
//     ) {
//         this.wss.handleUpgrade(request, socket, head, (ws) => {
//             this.wss.emit("connection", ws, request);
//         });
//     }

//     // Stream audio directly to WebSocket client
//     private async streamAudioToClient(audioResponse: any, ws: any): Promise<void> {
//         try {
//             console.log('Streaming audio to client...');
            
//             // Send audio start signal
//             ws.send(JSON.stringify({
//                 type: 'audio_start',
//                 message: 'Audio streaming started'
//             }));

//             // Handle different types of audio responses
//             if (audioResponse && typeof audioResponse.getReader === 'function') {
//                 // Handle Web ReadableStream
//                 await this.streamWebStreamToClient(audioResponse, ws);
//             }
//             else if (audioResponse && typeof audioResponse.pipe === 'function') {
//                 // Handle Node.js Readable stream
//                 await this.streamNodeStreamToClient(audioResponse, ws);
//             }
//             else if (Buffer.isBuffer(audioResponse)) {
//                 // Handle Buffer - send in chunks
//                 await this.streamBufferToClient(audioResponse, ws);
//             }
//             else if (audioResponse instanceof Uint8Array) {
//                 // Handle Uint8Array
//                 await this.streamBufferToClient(Buffer.from(audioResponse), ws);
//             }
//             else if (audioResponse instanceof ArrayBuffer) {
//                 // Handle ArrayBuffer
//                 await this.streamBufferToClient(Buffer.from(audioResponse), ws);
//             }
//             else {
//                 throw new Error(`Unsupported audio response type: ${typeof audioResponse}`);
//             }

//             // Send audio end signal
//             ws.send(JSON.stringify({
//                 type: 'audio_end',
//                 message: 'Audio streaming completed'
//             }));

//         } catch (error:any) {
//             console.error('Error streaming audio:', error);
//             ws.send(JSON.stringify({
//                 type: 'error',
//                 message: 'Audio streaming failed',
//                 error: error.message
//             }));
//         }
//     }

//     // Stream Web ReadableStream to client
//     private async streamWebStreamToClient(stream: ReadableStream<Uint8Array>, ws: any): Promise<void> {
//         const reader = stream.getReader();
        
//         try {
//             while (true) {
//                 const { done, value } = await reader.read();
                
//                 if (done) break;
                
//                 // Send audio chunk as binary data
//                 if (ws.readyState === ws.OPEN) {
//                     // Send as JSON with base64 encoded audio
//                     ws.send(JSON.stringify({
//                         type: 'audio_chunk',
//                         data: Buffer.from(value).toString('base64')
//                     }));
                    
//                     // Or send raw binary (if your frontend can handle it)
//                     // ws.send(Buffer.from(value));
//                 } else {
//                     break; // Connection closed
//                 }
//             }
//         } finally {
//             reader.releaseLock();
//         }
//     }

//     // Stream Node.js Readable to client
//     private async streamNodeStreamToClient(stream: NodeJS.ReadableStream, ws: any): Promise<void> {
//         return new Promise((resolve, reject) => {
//             stream.on('data', (chunk: Buffer) => {
//                 if (ws.readyState === ws.OPEN) {
//                     ws.send(JSON.stringify({
//                         type: 'audio_chunk',
//                         data: chunk.toString('base64')
//                     }));
//                 }
//             });

//             stream.on('end', resolve);
//             stream.on('error', reject);
//         });
//     }

//     // Stream Buffer to client in chunks
//     private async streamBufferToClient(buffer: Buffer, ws: any): Promise<void> {
//         const chunkSize = 8192; // 8KB chunks
        
//         for (let i = 0; i < buffer.length; i += chunkSize) {
//             if (ws.readyState !== ws.OPEN) break;
            
//             const chunk = buffer.slice(i, i + chunkSize);
//             ws.send(JSON.stringify({
//                 type: 'audio_chunk',
//                 data: chunk.toString('base64')
//             }));
            
//             // Small delay to prevent overwhelming the connection
//             await new Promise(resolve => setTimeout(resolve, 10));
//         }
//     }
// }




import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { SpeechClient } from '@google-cloud/speech';
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { Readable } from 'stream';

export default class Socket {
    private wss: WebSocketServer;
    private client;
    private googleAi;
    private textToSpeechClient;
    private speechClient;
    private elevenlabs;

    constructor() {
        this.wss = new WebSocketServer({ noServer: true });
        this.setupConnectionHandler();
        this.client = new OpenAI({
            apiKey:process.env.OPEN_API_KEY
        });
        this.googleAi = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
        this.textToSpeechClient = new TextToSpeechClient();
        this.speechClient = new SpeechClient(); // For speech-to-text
        this.elevenlabs = new ElevenLabsClient({
            apiKey:process.env.EVENTLAB_API_KEY,
        });
    }

    // Set up connection events
    private setupConnectionHandler() {
        this.wss.on("connection", (ws, request) => {
            console.log("🔌 Client connected");

            ws.on("message", async (msg) => {
                try {
                    console.log("📩 Received message");
                    
                    // Try to parse as JSON first (for structured messages)
                    let messageData;
                    let messageText;
                    
                    try {
                        messageData = JSON.parse(msg.toString());
                        
                        // Check if it's an audio message
                        if (messageData.type === 'audio' && messageData.data) {
                            console.log("🎤 Processing audio message...");
                            messageText = await this.convertAudioToText(messageData.data);
                            console.log("📝 Transcribed text:", messageText);
                        } else if (messageData.type === 'text' && messageData.data) {
                            messageText = messageData.data;
                        } else {
                            messageText = msg.toString();
                        }
                    } catch (parseError) {
                        // If not JSON, treat as plain text
                        messageText = msg.toString();
                    }

                    if (!messageText || messageText.trim() === '') {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'No text content to process'
                        }));
                        return;
                    }

                    console.log("💬 Processing text:", messageText);

                    const response = await this.googleAi.models.generateContent({
                        model: "gemini-2.0-flash",
                        contents: messageText,
                    });

                    console.log("🤖 AI Response generated");
                    
                    if (response.text) {
                        const audioResponse = await this.elevenlabs.textToSpeech.convert("Xb7hH8MSUJpSbSDYk0k2", {
                            outputFormat: "mp3_44100_32",
                            text: response.text,
                            modelId: "eleven_multilingual_v2",
                        });

                        // Send text response first
                        ws.send(JSON.stringify({
                            type: 'text',
                            text: response.text,
                            originalInput: messageText,
                            message: "Text response received, streaming audio..."
                        }));

                        // Stream audio directly to frontend
                        await this.streamAudioToClient(audioResponse, ws);
                        
                    } else {
                        ws.send(JSON.stringify({
                            error: "No text response received from AI"
                        }));
                    }
                } catch (error:any) {
                    console.error("❌ Error processing message:", error);
                    ws.send(JSON.stringify({
                        error: "Failed to process message",
                        details: error.message
                    }));
                }
            });

            ws.on("close", () => {
                console.log("❌ Client disconnected");
            });
        });
    }

    // This method will be called from httpServer.on("upgrade")
    public handleUpgrade(
        request: IncomingMessage,
        socket: any,
        head: Buffer
    ) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit("connection", ws, request);
        });
    }

    // Convert base64 audio to text using speech recognition
    private async convertAudioToText(base64Audio: string): Promise<string> {
        try {
            // Decode base64 to buffer
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            
            // Try multiple speech recognition services
            // First try Google Speech-to-Text
            try {
                return await this.googleSpeechToText(audioBuffer);
            } catch (googleError) {
                console.log("Google STT failed, trying OpenAI Whisper...");
                return await this.openAiWhisperSTT(audioBuffer);
            }
            
        } catch (error) {
            console.error("Error converting audio to text:", error);
            throw new Error("Failed to convert audio to text");
        }
    }

    // Google Speech-to-Text with format detection
    private async googleSpeechToText(audioBuffer: Buffer): Promise<string> {
        const { buffer, format } = await this.detectAndConvertAudio(audioBuffer.toString('base64'));
        
        const request = {
            audio: {
                content: buffer.toString('base64'),
            },
            config: {
                encoding: format as any,
                sampleRateHertz: format === 'WEBM_OPUS' ? 48000 : 16000,
                languageCode: 'en-US',
                alternativeLanguageCodes: ['en-GB', 'es-ES', 'fr-FR'],
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: false,
                model: 'latest_long',
            },
        };

        const [response] = await this.speechClient.recognize(request);
        
        if (response.results && response.results.length > 0) {
            const transcription = response.results
                .map(result => result.alternatives?.[0]?.transcript || '')
                .join(' ')
                .trim();
                
            if (transcription) {
                return transcription;
            }
        }
        
        throw new Error("No transcription found");
    }

    // OpenAI Whisper Speech-to-Text (fallback)
    private async openAiWhisperSTT(audioBuffer: Buffer): Promise<string> {
        try {
            // Save temporary file (Whisper API requires file input)
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFilePath = path.join(tempDir, `audio_${Date.now()}.webm`);
            await fs.promises.writeFile(tempFilePath, audioBuffer);

            // Create a ReadableStream from the file
            const fileStream = fs.createReadStream(tempFilePath);
            
            const transcription = await this.client.audio.transcriptions.create({
                file: fileStream,
                model: "whisper-1",
                language: "en", // Optional: specify language
                response_format: "text",
            });

            // Clean up temp file
            try {
                await fs.promises.unlink(tempFilePath);
            } catch (cleanupError) {
                console.warn("Failed to cleanup temp file:", cleanupError);
            }

            if (typeof transcription === 'string' && transcription.trim()) {
                return transcription.trim();
            }
            
            throw new Error("No transcription received from Whisper");
            
        } catch (error) {
            console.error("OpenAI Whisper STT error:", error);
            throw error;
        }
    }

    // Alternative: Handle different audio formats
    private async detectAndConvertAudio(base64Audio: string): Promise<{ buffer: Buffer, format: string }> {
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        
        // Simple format detection based on file headers
        const header = audioBuffer.slice(0, 4);
        
        if (header.toString('hex').startsWith('1a45dfa3')) {
            return { buffer: audioBuffer, format: 'WEBM_OPUS' };
        } else if (header.toString('hex').startsWith('664c6143')) {
            return { buffer: audioBuffer, format: 'FLAC' };
        } else if (header.toString('hex').startsWith('fffb') || header.toString('hex').startsWith('fff3')) {
            return { buffer: audioBuffer, format: 'MP3' };
        } else if (header.toString('ascii').startsWith('RIFF')) {
            return { buffer: audioBuffer, format: 'LINEAR16' };
        } else {
            // Default to WEBM_OPUS for web audio
            return { buffer: audioBuffer, format: 'WEBM_OPUS' };
        }
    }
    private async streamAudioToClient(audioResponse: any, ws: any): Promise<void> {
        try {
            console.log('Streaming audio to client...');
            
            // Send audio start signal
            ws.send(JSON.stringify({
                type: 'audio_start',
                message: 'Audio streaming started'
            }));

            // Handle different types of audio responses
            if (audioResponse && typeof audioResponse.getReader === 'function') {
                // Handle Web ReadableStream
                await this.streamWebStreamToClient(audioResponse, ws);
            }
            else if (audioResponse && typeof audioResponse.pipe === 'function') {
                // Handle Node.js Readable stream
                await this.streamNodeStreamToClient(audioResponse, ws);
            }
            else if (Buffer.isBuffer(audioResponse)) {
                // Handle Buffer - send in chunks
                await this.streamBufferToClient(audioResponse, ws);
            }
            else if (audioResponse instanceof Uint8Array) {
                // Handle Uint8Array
                await this.streamBufferToClient(Buffer.from(audioResponse), ws);
            }
            else if (audioResponse instanceof ArrayBuffer) {
                // Handle ArrayBuffer
                await this.streamBufferToClient(Buffer.from(audioResponse), ws);
            }
            else {
                throw new Error(`Unsupported audio response type: ${typeof audioResponse}`);
            }

            // Send audio end signal
            ws.send(JSON.stringify({
                type: 'audio_end',
                message: 'Audio streaming completed'
            }));

        } catch (error:any) {
            console.error('Error streaming audio:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Audio streaming failed',
                error: error.message
            }));
        }
    }

    // Stream Web ReadableStream to client
    private async streamWebStreamToClient(stream: ReadableStream<Uint8Array>, ws: any): Promise<void> {
        const reader = stream.getReader();
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                // Send audio chunk as binary data
                if (ws.readyState === ws.OPEN) {
                    // Send as JSON with base64 encoded audio
                    ws.send(JSON.stringify({
                        type: 'audio_chunk',
                        data: Buffer.from(value).toString('base64')
                    }));
                    
                    // Or send raw binary (if your frontend can handle it)
                    // ws.send(Buffer.from(value));
                } else {
                    break; // Connection closed
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    // Stream Node.js Readable to client
    private async streamNodeStreamToClient(stream: NodeJS.ReadableStream, ws: any): Promise<void> {
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'audio_chunk',
                        data: chunk.toString('base64')
                    }));
                }
            });

            stream.on('end', resolve);
            stream.on('error', reject);
        });
    }

    // Stream Buffer to client in chunks
    private async streamBufferToClient(buffer: Buffer, ws: any): Promise<void> {
        const chunkSize = 8192; // 8KB chunks
        
        for (let i = 0; i < buffer.length; i += chunkSize) {
            if (ws.readyState !== ws.OPEN) break;
            
            const chunk = buffer.slice(i, i + chunkSize);
            ws.send(JSON.stringify({
                type: 'audio_chunk',
                data: chunk.toString('base64')
            }));
            
            // Small delay to prevent overwhelming the connection
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
}