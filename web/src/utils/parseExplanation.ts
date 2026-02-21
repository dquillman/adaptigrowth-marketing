export type ExplanationBlock =
    | { type: 'lens'; text: string }
    | { type: 'conflict'; paragraphs: string[] }
    | { type: 'pattern'; text: string }
    | { type: 'note'; text: string }
    | { type: 'text'; text: string };

const SECTION_PREFIXES = ['PMI Decision Lens:', 'Why this conflicts:', 'Pattern:', 'Note:'] as const;

export function parseExplanation(raw: string): ExplanationBlock[] {
    const paragraphs = raw.split('\n\n').filter(p => p.trim().length > 0);
    const blocks: ExplanationBlock[] = [];

    for (const p of paragraphs) {
        if (p.startsWith('Why this conflicts:')) {
            blocks.push({ type: 'conflict', paragraphs: [p.replace('Why this conflicts:', '').trim()] });
        } else if (
            blocks.length > 0 &&
            blocks.at(-1)?.type === 'conflict' &&
            !SECTION_PREFIXES.some(pfx => p.startsWith(pfx))
        ) {
            // Continuation paragraph for the current conflict block
            (blocks.at(-1) as { type: 'conflict'; paragraphs: string[] }).paragraphs.push(p);
        } else if (p.startsWith('PMI Decision Lens:')) {
            blocks.push({ type: 'lens', text: p });
        } else if (p.startsWith('Pattern:')) {
            blocks.push({ type: 'pattern', text: p.replace('Pattern:', '').trim() });
        } else if (p.startsWith('Note:')) {
            blocks.push({ type: 'note', text: p.replace('Note:', '').trim() });
        } else {
            blocks.push({ type: 'text', text: p });
        }
    }

    return blocks;
}
