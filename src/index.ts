import type { Pipeline } from "cloudflare:pipelines";
import { decompressSync } from "fflate";
import { serializeError } from "serialize-error";

const MAX_CHUNK_SIZE = 1000 * 1000; // 1 MB
const MAX_RETRIES = 3;

type LogRecord = Record<string, unknown>;

async function parseCompressedBody(request: Request): Promise<LogRecord[]> {
	const body = await request.blob();
	const uncompressed = decompressSync(await body.bytes());
	const data = new TextDecoder().decode(uncompressed);
	return data
		.split("\n")
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line));
}

async function sendWithRetry(
	pipeline: Pipeline<LogRecord>,
	records: LogRecord[],
	retries = MAX_RETRIES,
): Promise<void> {
	try {
		await pipeline.send(records);
		console.log({ message: "Sent chunk successfully", count: records.length });
	} catch (error) {
		if (retries <= 0) {
			console.error({
				message: "Failed to send after all retries",
				error: serializeError(error),
			});
			return;
		}
		console.warn({ message: "Retry attempt", remainingRetries: retries - 1 });
		await sendWithRetry(pipeline, records, retries - 1);
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		if (!env.PIPELINE) {
			return new Response("Pipeline binding required", { status: 400 });
		}

		const records = await parseCompressedBody(request);

		// Split records into 1MB chunks
		const chunks: LogRecord[][] = [];
		let currentChunk: LogRecord[] = [];
		let currentSize = 0;

		for (const record of records) {
			const recordSize = JSON.stringify(record).length;
			if (currentSize + recordSize > MAX_CHUNK_SIZE) {
				chunks.push(currentChunk);
				currentChunk = [];
				currentSize = 0;
			}
			currentChunk.push(record);
			currentSize += recordSize;
		}
		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		// Process all chunks
		await Promise.all(
			chunks.map((chunk) => sendWithRetry(env.PIPELINE, chunk)),
		);

		return new Response(null, { status: 202 });
	},
} satisfies ExportedHandler<Env>;
