// Throwaway calibration harness: OCR the sample scoresheet (full page, default config) and write
// the word geometry to a JSON fixture, so the pure parser can be unit-tested without running OCR
// in CI. The digit-refinement pass (per-row, digit-only) isn't fixtured — its merge logic is
// tested with an injected fake OCR; regenerate this fixture if the sample or OCR version changes.
import { writeFile } from 'node:fs/promises';
import { createWorker } from 'tesseract.js';

const img = 'docs/samples/scoresheet.png';
const worker = await createWorker('eng');
const { data } = await worker.recognize(img, {}, { blocks: true });
await worker.terminate();

const words = (data.blocks ?? [])
	.flatMap((b) => b.paragraphs ?? [])
	.flatMap((p) => p.lines ?? [])
	.flatMap((l) => l.words ?? [])
	.map((w) => ({
		text: w.text,
		x0: w.bbox.x0,
		y0: w.bbox.y0,
		x1: w.bbox.x1,
		y1: w.bbox.y1,
		confidence: Math.round(w.confidence)
	}));

const out = 'src/lib/server/analysis/scoresheet-fixture.json';
await writeFile(out, JSON.stringify(words, null, '\t') + '\n');
console.log(`wrote ${words.length} words to ${out}`);
