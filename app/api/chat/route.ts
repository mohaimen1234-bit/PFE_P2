import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, model = "qwen2.5:0.5b" } = body;
    
    const ragUrl = process.env.RAG_SERVICE_URL || 'http://localhost:8000';
    const ragResponse = await fetch(`${ragUrl}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, model }),
    });
    
    if (!ragResponse.ok) {
      throw new Error(`RAG API error: ${ragResponse.statusText}`);
    }
    
    const data = await ragResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat proxy error:", error);
    return NextResponse.json(
      { answer: "I'm having trouble connecting to the RAG service right now." },
      { status: 500 }
    );
  }
}
