import { createClient } from "redis";
import fs from "fs";
import path from "path";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import { prisma } from "./db.js";

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 1024 * 512; // 512 KB cap — prevents memory exhaustion from runaway output

type SubmissionStatus = "Success" | "Failure" | "TLE";

interface RunResult {
    status: SubmissionStatus;
    output: string;
}

function normalizeLanguage(language: string): string {
    const map: Record<string, string> = {
        python: "py",
        javascript: "js",
        cpp: "cpp",
    };
    return map[language] ?? language;
}

function getCodeDir(): string {
    const codeDir = path.join(__dirname, "code");
    fs.mkdirSync(codeDir, { recursive: true });
    return codeDir;
}

function safeWriteFile(filePath: string, content: string): void {
    const resolved = path.resolve(filePath);
    const allowedDir = path.resolve(getCodeDir());

    if (!resolved.startsWith(allowedDir)) {
        throw new Error("Path traversal detected — refusing to write outside code dir");
    }

    fs.writeFileSync(resolved, content, { encoding: "utf8", mode: 0o600 });
}

async function updateSubmission(
    submissionId: string,
    status: SubmissionStatus,
    output: string
): Promise<void> {
    await prisma.submissions.update({
        where: { id: submissionId },
        data: { status, output: output.slice(0, MAX_OUTPUT_BYTES) },
    });
}

function spawnSandboxed(
    command: string,
    args: string[],
    options: SpawnOptionsWithoutStdio = {}
) {
    return spawn(command, args, {
        ...options,
        env: {
            PATH: process.env.PATH ?? "",
        },
        shell: false, // never pass through a shell — prevents injection
    });
}

async function runAndCapture(
    command: string,
    args: string[]
): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
    return new Promise((resolve) => {
        const child = spawnSandboxed(command, args);

        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let settled = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, TIMEOUT_MS);

        child.stdout.on("data", (chunk: Buffer) => {
            if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk: Buffer) => {
            if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString();
        });

        child.on("exit", (exitCode) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ exitCode, stdout, stderr, timedOut });
        });

        child.on("error", (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ exitCode: null, stdout, stderr: err.message, timedOut });
        });
    });
}

async function runSubmission(
    code: string,
    language: string
): Promise<RunResult> {
    const codeDir = getCodeDir();

    if (language === "cpp") {
        const srcPath = path.join(codeDir, "a.cpp");
        const outPath = path.join(codeDir, "out.exe");

        safeWriteFile(srcPath, code);

        const compile = await runAndCapture("g++", [srcPath, "-o", outPath, "-std=c++17"]);

        if (compile.exitCode !== 0) {
            return {
                status: "Failure",
                output: compile.stderr || "Compilation failed",
            };
        }

        const run = await runAndCapture(outPath, []);

        if (run.timedOut) return { status: "TLE", output: "Time limit exceeded" };
        if (run.exitCode === 0) return { status: "Success", output: run.stdout };
        return { status: "Failure", output: run.stderr || "Runtime error" };
    }

    if (language === "js") {
        const filePath = path.join(codeDir, "a.js");
        safeWriteFile(filePath, code);

        const run = await runAndCapture("node", [filePath]);

        if (run.timedOut) return { status: "TLE", output: "Time limit exceeded" };
        if (run.exitCode === 0) return { status: "Success", output: run.stdout };
        return { status: "Failure", output: run.stderr || "Runtime error" };
    }

    if (language === "py") {
        const filePath = path.join(codeDir, "a.py");
        safeWriteFile(filePath, code);

        const run = await runAndCapture("python3", [filePath]);

        if (run.timedOut) return { status: "TLE", output: "Time limit exceeded" };
        if (run.exitCode === 0) return { status: "Success", output: run.stdout };
        return { status: "Failure", output: run.stderr || "Runtime error" };
    }

    return { status: "Failure", output: `Unsupported language: ${language}` };
}

async function main() {
    const client = createClient();

    client.on("error", (err) => console.error("Redis client error:", err));
    await client.connect();
    console.log("Connected to Redis");

    while (true) {
        const raw = await client.rPop("problems");

        if (!raw) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
        }

        let parsed: { code: string; language: string; submissionId: string; userId: string };

        try {
            parsed = JSON.parse(raw);
        } catch {
            console.error("Malformed job payload — skipping:", raw);
            continue;
        }

        const { code, language: rawLang, submissionId, userId } = parsed;

        if (!code || !rawLang || !submissionId ) {
            console.error("Incomplete job payload — skipping:", parsed);
            continue;
        }

        const language = normalizeLanguage(rawLang);
        console.log(`Processing submission ${submissionId} for user ${userId} in ${language}`);

        try {
            const result = await runSubmission(code, language);
            await updateSubmission(submissionId, result.status, result.output);
            console.log(`Submission ${submissionId} → ${result.status}`);
        } catch (err) {
            console.error(`Unexpected error for submission ${submissionId}:`, err);
            await updateSubmission(submissionId, "Failure", "Internal worker error").catch(() => {});
        }
    }
}

main().catch((err) => {
    console.error("Worker crashed:", err);
    process.exit(1);
});