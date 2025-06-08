import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import fs from "fs";
import { ElevenLabsClient, play } from "@elevenlabs/elevenlabs-js";
import { pipeline } from 'stream/promises';
import path from 'path';

export default class Socket {
    private wss: WebSocketServer;
    private client;
    private googleAi;
    private textToSpeechClient;
    private elevenlabs;

    constructor() {
        this.wss = new WebSocketServer({ noServer: true });
        this.setupConnectionHandler();
        this.client = new OpenAI({
            apiKey: process.env.OPEN_API_KEY
        });
        this.googleAi = new GoogleGenAI({ apiKey: process.env.GOGGLE_API_KEY});
        this.textToSpeechClient = new TextToSpeechClient();
        this.elevenlabs = new ElevenLabsClient({
            apiKey: process.env.EVENTLAB_API_KEY,
        });
    }

    // Set up connection events
    private setupConnectionHandler() {
        this.wss.on("connection", (ws, request) => {
            console.log("🔌 Client connected");

            ws.on("message", async (msg) => {
                try {
                    console.log("📩 Received:", msg.toString());

                    const response = await this.googleAi.models.generateContent({
                        model: "gemini-2.0-flash",
                        contents: `${msg}`,
                    });

                    console.log("Generating audio...");
                    
                    if (response.text) {
                        const audioResponse = await this.elevenlabs.textToSpeech.convert("Xb7hH8MSUJpSbSDYk0k2", {
                            outputFormat: "mp3_44100_32",
                            text: response.text,
                            modelId: "eleven_multilingual_v2",
                        });

                        // Generate unique filename with timestamp
                        const timestamp = Date.now();
                        const filename = `audio_${timestamp}.mp3`;
                        const filePath = path.join(process.cwd(), 'audio', filename);

                        // Ensure audio directory exists
                        const audioDir = path.dirname(filePath);
                        if (!fs.existsSync(audioDir)) {
                            fs.mkdirSync(audioDir, { recursive: true });
                        }

                
                        // Save the audio file - handle different response types
                        await this.handleAudioResponse(audioResponse, filePath);
                        
                        console.log(`✅ Audio saved to: ${filePath}`);

                        // Send response back to client
                        ws.send(JSON.stringify({
                            text: response.text,
                            audioFile: filename,
                            message: "Audio generated and saved successfully"
                        }));
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

    // Handle different types of audio responses from ElevenLabs
    private async handleAudioResponse(audioResponse: any, filePath: string): Promise<void> {
        console.log('Audio response type:', typeof audioResponse);
        console.log('Audio response constructor:', audioResponse?.constructor?.name);
        
        // Check if it's a ReadableStream (Web API)
        if (audioResponse && typeof audioResponse.getReader === 'function') {
            await this.saveWebStreamToFile(audioResponse, filePath);
        }
        // Check if it's a Node.js Readable stream
        else if (audioResponse && typeof audioResponse.pipe === 'function') {
            await this.saveNodeStreamToFile(audioResponse, filePath);
        }
        // Check if it's a Buffer
        else if (Buffer.isBuffer(audioResponse)) {
            await fs.promises.writeFile(filePath, audioResponse);
        }
        // Check if it's a Uint8Array
        else if (audioResponse instanceof Uint8Array) {
            await fs.promises.writeFile(filePath, Buffer.from(audioResponse));
        }
        // Check if it's an ArrayBuffer
        else if (audioResponse instanceof ArrayBuffer) {
            await fs.promises.writeFile(filePath, Buffer.from(audioResponse));
        }
        // If it's an async iterator (some APIs return this)
        else if (audioResponse && typeof audioResponse[Symbol.asyncIterator] === 'function') {
            await this.saveAsyncIteratorToFile(audioResponse, filePath);
        }
        else {
            throw new Error(`Unsupported audio response type: ${typeof audioResponse}`);
        }
    }

    // Save Web ReadableStream to file
    private async saveWebStreamToFile(stream: ReadableStream<Uint8Array>, filePath: string): Promise<void> {
        const reader = stream.getReader();
        const writeStream = fs.createWriteStream(filePath);

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                writeStream.write(Buffer.from(value));
            }
            
            writeStream.end();
            
            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            
        } catch (error) {
            writeStream.destroy();
            throw error;
        } finally {
            reader.releaseLock();
        }
    }

    // Save Node.js Readable stream to file
    private async saveNodeStreamToFile(stream: NodeJS.ReadableStream, filePath: string): Promise<void> {
        const writeStream = fs.createWriteStream(filePath);
        await pipeline(stream, writeStream);
    }

    // Save async iterator to file
    private async saveAsyncIteratorToFile(iterator: AsyncIterable<any>, filePath: string): Promise<void> {
        const writeStream = fs.createWriteStream(filePath);
        
        try {
            for await (const chunk of iterator) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                writeStream.write(buffer);
            }
            
            writeStream.end();
            
            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
        } catch (error) {
            writeStream.destroy();
            throw error;
        }
    }
}