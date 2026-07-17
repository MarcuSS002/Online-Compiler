import express from "express";
import cors from "cors";
import { createClient } from "redis";
import { ensureSubmissionStatusEnum, prisma } from "../src/db.js";


function normalizeLanguage(language: string) {
    if (language === "python") {
        return "py";
    }

    if (language === "javascript") {
        return "js";
    }

    return language;
}

const client = createClient();
client.connect();

const app = express()

app.use(express.json())
app.use(cors())

await ensureSubmissionStatusEnum();

app.post("/submission", async (req, res) => {
    const code = req.body.code;
    const language = normalizeLanguage(req.body.language);
    try {
        const response = await prisma.submissions.create({
            data: {
                language,
                code,
            }
        })

        // enqueue the job for the worker
        await client.lPush("problems", JSON.stringify({ submissionId: response.id, code, language }))

        res.json({
            message: "processing",
            id: response.id
        })
    } catch (err) {
        console.error("Submission create error:", err)
        res.status(500).json({ error: "Failed to create submission", details: err instanceof Error ? err.message : String(err) })
    }
})

app.get("/submission/:submissionId", async (req, res) => {
    const response = await prisma.submissions.findFirst({
        where: {
            id: req.params.submissionId
        }
    })

    res.json({
        submission: response
    })
})


app.listen(3000);