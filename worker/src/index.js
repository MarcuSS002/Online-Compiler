"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process"); //child_process is a Node.js module that lets your program start another program.
//spawn() starts another program.
const db_1 = require("./db");
function normalizeLanguage(language) {
    if (language === "python") {
        return "py";
    }
    if (language === "javascript") {
        return "js";
    }
    return language;
}
const client = (0, redis_1.createClient)();
client.connect().then(async () => {
    console.log("Connected to Redis");
    while (1) { //makes the loop infinite, so the worker will keep running until it is stopped manually.
        const response = await client.rPop("problems"); //Removes and returns the last item from the Redis list named "problems".
        if (!response) { //!response means "no job was found."
            await new Promise((r) => setTimeout(r, 1000));
            continue;
        }
        const parsedResponse = JSON.parse(response);
        const code = parsedResponse.code;
        const language = normalizeLanguage(parsedResponse.language);
        const submissionId = parsedResponse.submissionId;
        const userId = parsedResponse.userId;
        console.log("Processing Question for user " +
            userId +
            " with code: " +
            code +
            " in language: " +
            language);
        let finalOutput = "";
        //ADDING TIMEOUT if the code runs for more than 5 seconds, it will be terminated.
        if (language === "cpp") {
            console.log("Compiling C++ code:", code);
            const filePath = __dirname + "/code/a.cpp";
            fs_1.default.writeFileSync(filePath, code);
            const responseCompiler = (0, child_process_1.spawn)("g++", [
                filePath,
                "-o",
                "./code/out.exe",
            ]);
            let exitCodeCompiler = null;
            await new Promise((resolve) => {
                responseCompiler.on("exit", async (exitCode) => {
                    exitCodeCompiler = exitCode;
                    if (exitCode !== 0) {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Failure",
                            },
                        });
                    }
                    resolve();
                });
            });
            if (exitCodeCompiler !== 0) { //MTLB ho gaya hai tumhara aage kuch nhi ho skta...
                continue;
            }
            const response = (0, child_process_1.spawn)("./code/out.exe");
            response.stdout.on("data", (chunk) => {
                finalOutput += chunk.toString();
            });
            await new Promise((resolve) => {
                response.on("exit", async (exitCode) => {
                    if (exitCode === 0) {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Success",
                                output: finalOutput,
                            },
                        });
                    }
                    else {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Failure",
                            },
                        });
                    }
                    resolve();
                });
            });
        }
        if (language === "js") {
            console.log("Running JavaScript code:", code);
            const filePath = __dirname + "/code/a.js";
            fs_1.default.writeFileSync(filePath, code);
            const response = (0, child_process_1.spawn)("node", [filePath]);
            response.stdout.on("data", (chunk) => {
                finalOutput += chunk.toString();
            });
            await new Promise((resolve) => {
                response.on("exit", async (exitCode) => {
                    if (exitCode === 0) {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Success",
                                output: finalOutput,
                            },
                        });
                    }
                    else {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Failure",
                            },
                        });
                    }
                    resolve();
                });
            });
        }
        if (language === "py") {
            console.log("Running Python code:", code);
            const filePath = __dirname + "/code/a.py";
            fs_1.default.writeFileSync(filePath, code);
            const response = (0, child_process_1.spawn)("python", [filePath]);
            // On Linux/macOS, use: spawn("python3", [filePath]);
            response.stdout.on("data", (chunk) => {
                finalOutput += chunk.toString();
            });
            await new Promise((resolve) => {
                response.on("exit", async (exitCode) => {
                    if (exitCode === 0) {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Success",
                                output: finalOutput,
                            },
                        });
                    }
                    else {
                        await db_1.prisma.submissions.update({
                            where: {
                                id: submissionId,
                            },
                            data: {
                                status: "Failure",
                            },
                        });
                    }
                    resolve();
                });
            });
        }
    }
}).catch((err) => {
    console.error("Error connecting to Redis:", err);
});
//# sourceMappingURL=index.js.map