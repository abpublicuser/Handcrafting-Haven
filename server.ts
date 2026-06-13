import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Needed to parse JSON body
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/parse-draft", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY not set" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Parse this draft story or entry list into a structured list of pages or notes. Extract the page numbering/date, the main title or summary, and the note content. Here is the draft:\n\n${req.body.draft}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: {
                  type: Type.STRING,
                  description: "The name, number, or exact date of the page, e.g. 'Page 1', 'Day 2', '2023-10-01'",
                },
                location: {
                  type: Type.STRING,
                  description: "The title or subject for this page, or a short summary title if no specific location is mentioned.",
                },
                note: {
                  type: Type.STRING,
                  description: "The combined notes or stories for this page.",
                }
              },
              required: ["date", "location", "note"]
            }
          }
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("No text returned from Gemini");
      }
      res.json(JSON.parse(text));
    } catch (err: unknown) {
      console.error('Draft parse error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
