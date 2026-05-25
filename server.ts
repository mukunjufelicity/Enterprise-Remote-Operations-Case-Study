import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Ensure environment variables are loaded
dotenv.config();

const PORT = 3000;

// Lazy initialization of GenAI SDK to prevent app crash on boot if API key is unconfigured
let ai: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        console.log("Gemini API initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize Gemini Client:", err);
      }
    } else {
      console.warn("GEMINI_API_KEY is missing or carries placeholder values. Advisor chatbot will use high-fidelity operational response simulations.");
    }
  }
  return ai;
}

// Read and collect all markdown case study files from server disk
function getCaseStudyContext(): string {
  try {
    const files = [
      "README.md",
      "PROBLEM_STATEMENT.md",
      "APPROACH.md",
      "EXECUTION.md",
      "RESULTS.md",
      "LESSONS_LEARNED.md",
    ];
    let combinedContent = "";
    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        combinedContent += `=== FILE: ${file} ===\n${fs.readFileSync(filePath, "utf-8")}\n\n`;
      }
    }
    return combinedContent;
  } catch (err) {
    console.error("Error reading case study files:", err);
    return "Error loading case study files.";
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API 1: Fetch raw case study files for real-time fidelity rendering on frontend
  app.get("/api/case-study/files", (req, res) => {
    try {
      const filesList = [
        "README.md",
        "PROBLEM_STATEMENT.md",
        "APPROACH.md",
        "EXECUTION.md",
        "RESULTS.md",
        "LESSONS_LEARNED.md",
      ];
      const responseData: Record<string, string> = {};
      
      for (const fileName of filesList) {
        const filePath = path.join(process.cwd(), fileName);
        if (fs.existsSync(filePath)) {
          responseData[fileName] = fs.readFileSync(filePath, "utf-8");
        } else {
          responseData[fileName] = `# ${fileName}\nContent could not be found.`;
        }
      }
      res.json(responseData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to read files." });
    }
  });

  // API 2: AI Operations Advisor Chatbot proxy
  app.post("/api/advisor/chat", async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message parameters. 'messages' array is required." });
    }

    const lastUserMessage = messages[messages.length - 1]?.content;
    if (!lastUserMessage) {
      return res.status(400).json({ error: "Last message content is empty." });
    }

    const geminiClient = getGenAI();
    const caseStudyContext = getCaseStudyContext();

    // High quality response helper for simulated mode if API key is not present
    const isSimulated = !geminiClient;

    if (isSimulated) {
      // Direct high-fidelity simulated advisor context answering standard executive questions
      const promptLower = lastUserMessage.toLowerCase();
      let answer = "";

      if (promptLower.includes("roi") || promptLower.includes("saving") || promptLower.includes("cost") || promptLower.includes("financial")) {
        answer = `As the Operations Manager, I tracked these figures very closely. The program delivered **$1.2 Million in validated annualized savings**. The largest clawback was **$620,000 in idle supplier labor capacity** because our APAC partners were no longer billing us for standby waiting hours once we resolved EMEA documentation lags. We also saved **$300,000 on air-freight premium custom shipping** because we finally hit our launch schedules and moved 85% of distributions to standard ocean cargo logistics.`;
      } else if (promptLower.includes("approach") || promptLower.includes("audit") || promptLower.includes("process") || promptLower.includes("mapping")) {
        answer = `Our approach centered on objective diagnostics rather than personal opinions. We initiated a detailed **Value-Stream Audit** spanning 6 months of shipping history. It revealed that although physical design engineering took just **4.6 days**, the files sat idle inside unmonitored compliance and verification folders for **17.8 days**! This confirmed that our problem wasn't developer speed, but the structural administrative delays between our regional handoffs.`;
      } else if (promptLower.includes("timezone") || promptLower.includes("time zone") || promptLower.includes("overlap") || promptLower.includes("relay") || promptLower.includes("hours")) {
        answer = `To solve our **24-hour asynchronous dead-zones**, we structured the **'Relay-Run' handoff standard operating procedure**. The APAC team conducts morning intake logs and flags blocker alerts by 08:00 UTC. The EMEA team reviews audits, processes compliance clearances, and passes files to NA by 15:30 UTC. NA completes revisions and places designs in the APAC manufacturing queue by 23:00 UTC. This maintains a continuous 24-hour development cycle without interrupting employee sleep schedules.`;
      } else if (promptLower.includes("tool") || promptLower.includes("software") || promptLower.includes("jira") || promptLower.includes("smartsheet")) {
        answer = `We retired our disjointed regional silos: EMEA's detached Trello boards, and localized tracking spreadsheets inside Singapore. We aligned all operations into a **consolidated Jira & Smartsheet Cloud Core**. This unified database acts as the single source of truth, featuring dependency-mapped columns where engineering alterations immediately freeze downstream operations until compliance checks are marked off.`;
      } else if (promptLower.includes("lessons") || promptLower.includes("framework") || promptLower.includes("scalable")) {
        answer = `We synthesized our success into the scalable **'3-C' Remote Operations Framework**: \n1. **Centralize Data**: Establish your digital ground-truth database to eradicate siloes.\n2. **Coordinate Flow**: Implement binary 'Definitions of Done' at regional boundaries to drop rework rates.\n3. **Calibrate Behavior**: Create a strict messaging-based Communication Charter with explicit SLAs, rather than holding disruptive midnight catch-up video calls.`;
      } else {
        answer = `Thank you for your inquiry regarding our Global Remote Operations Case Study. As the Operations Manager behind this initiative, I can confirm that standardizing async handoff structures, establishing the **'Relay-Run' system**, and formalizing strict **overlap response SLAs** allowed us to cut cycle timelines by **40% (from 22.4 days to 13.4 days)** and save **$1.2M annually**. Let me know if you would like me to detail our auditing methods, stakeholder alignment loops, or the technical tooling setup!`;
      }

      // Return simulated chat message response
      return res.json({
        content: answer,
        model: "gemini-3.5-flash (Simulated Sandbox Advisor)",
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Call modern server-side Gemini API with actual disk context
      const chatHistory = messages.slice(0, -1).map((msg) => ({
        role: msg.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: msg.content }],
      }));

      const systemInstruction = `You are a professional, strategic-minded Project and Operations Manager (the author of this specific case study). Your goal is to represent the documented Remote Operations Case Study project to corporate executives, directors, and recruiters.

You must answer strictly adhering to the facts, framework titles, numbers, and operational structures documented within the provided files shown below:
${caseStudyContext}

Guidelines for your persona:
1. Speak with professional composure, clarity, and authority. Avoid slang or overly casual greetings.
2. Rely 100% on the figures documented (e.g., $1.2M saved, timeline cut from 22.4 to 13.4 days, OTD rate increased from 68% to 94.2%, 4-hour SLA overlap window, Relay-Run schedules, 3-C Remote Operations Framework).
3. Do not make up facts outside the provided operational domain. If asked about unrelated personal subjects, gently steer the conversation back to engineering logistics and global remote project management.`;

      const contents = [
        ...chatHistory.map((h) => ({
          role: h.role,
          parts: h.parts
        })),
        {
          role: "user" as const,
          parts: [{ text: lastUserMessage }]
        }
      ];

      const response = await geminiClient!.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        content: response.text || "I apologize, but I received an empty response. Let me re-analyze the operational parameters.",
        model: "gemini-3.5-flash",
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Gemini runtime error:", err);
      res.status(500).json({ error: "Gemini server failed to compile output: " + err.message });
    }
  });

  // Vite middleware integration for asset serving & hot reloading
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static dist files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise Operations web server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
