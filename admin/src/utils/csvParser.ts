export interface ExamImportData {
    name: string;
    description: string;
    domains: string[];
    blueprint: {
        domain: string;
        subDomain: string;
        weight: string;
        difficulty?: string;
        questionType?: string;
        reference?: string;
        keywords?: string;
    }[];
}

export const parseExamCSV = (csvText: string): ExamImportData[] => {
    // 1. Split lines and remove empty leading lines
    let lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
        console.error("CSV has fewer than 2 lines.");
        return [];
    }

    // 2. Detect Delimiter (checking first valid line)
    const firstLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
    const delimiters = [',', ';', '\t', '|'];
    let delimiter = ',';
    let maxCols = 0;

    for (const d of delimiters) {
        // Simple split for detection is usually fine
        const cols = firstLine.split(d).length;
        if (cols > maxCols) {
            maxCols = cols;
            delimiter = d;
        }
    }

    console.log(`Detected delimiter: '${delimiter === '\t' ? '\\t' : delimiter}'`);

    // 3. Robust Split Function (handles quotes)
    const splitCSV = (text: string, delim: string) => {
        // If simple split works (no quotes), use it for speed/simplicity
        if (!text.includes('"')) {
            return text.split(delim).map(c => c.trim());
        }

        // Regex to split by delimiter ONLY if not inside quotes
        try {
            // This regex matches the delimiter if it's followed by an even number of quotes
            // It's a common way to split CSVs while respecting quoted fields
            const splitRegex = new RegExp(`${delim}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
            return text.split(splitRegex).map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        } catch (e) {
            console.warn("Regex split failed, falling back to simple split", e);
            return text.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
        }
    };

    // 4. Parse Headers
    const headers = splitCSV(firstLine, delimiter).map(h => h.toLowerCase());

    console.log("Parsed Headers:", JSON.stringify(headers));

    // Improve Name detection to avoid capturing "Exam Description"
    const nameIdx = headers.findIndex(h => {
        // Explicit exclusions
        if (h.includes('description') || h.includes('desc') || h.includes('summary') || h === 'code' || h === 'id' || h === 'exam id') return false;

        // Exact or strong matches
        if (h === 'name' || h === 'exam' || h === 'exam name' || h === 'provider' || h === 'exam provider') return true;

        // Soft matches
        return h.includes('exam name') || h.includes('provider') || (h.includes('exam') && !h.includes('desc'));
    });

    // Find ALL columns that look like a domain (excluding sub-domains)
    const domainIndices = headers.map((h, i) => {
        // Add check for 'subdomains' (no hyphen) match
        const isSub = h.includes('sub-domain') || h.includes('sub domain') || h.includes('topic') || h.includes('subdomains');
        const isDomain = h.includes('domain') || h.includes('knowledge area') || h.includes('category') || h.includes('key domain');
        return (isDomain && !isSub) ? i : -1;
    }).filter(i => i !== -1);

    const subDomainIdx = headers.findIndex(h => h.includes('sub-domain') || h.includes('topic') || h.includes('sub domain') || h.includes('subdomains'));
    const weightIdx = headers.findIndex(h => h.includes('weight') || h.includes('percentage') || h.includes('%'));
    const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('summary') || h.includes('overview'));

    // New Metadata
    const difficultyIdx = headers.findIndex(h => h.includes('difficulty') || h.includes('level'));
    const typeIdx = headers.findIndex(h => h.includes('question type') || h.includes('type') || h.includes('style'));
    const refIdx = headers.findIndex(h => h.includes('reference') || h.includes('source') || h.includes('citation'));
    const keywordsIdx = headers.findIndex(h => h.includes('keywords') || h.includes('tags') || h.includes('focus'));

    if (nameIdx === -1 || domainIndices.length === 0) {
        console.error("Missing required columns: Exam Name or Domain");
        console.log("Headers found:", JSON.stringify(headers));
        return [];
    }

    const examsMap = new Map<string, ExamImportData>();
    let lastExamName: string | null = null; // Track last seen exam for fill-down

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const columns = splitCSV(line, delimiter);

        if (columns.length <= nameIdx) continue;

        let name = columns[nameIdx];

        // Fill-down logic: If name is missing, use the last seen name
        // (Handles CSVs with merged cells or visual formatting)
        if (!name && lastExamName) {
            name = lastExamName;
        }

        if (!name) continue;
        lastExamName = name; // Update tracker

        if (!examsMap.has(name)) {
            examsMap.set(name, {
                name,
                description: descIdx !== -1 ? columns[descIdx] : `Imported Exam: ${name}`,
                domains: [],
                blueprint: []
            });
        }

        const exam = examsMap.get(name)!;
        const subDomain = subDomainIdx !== -1 ? columns[subDomainIdx] : '';
        const weight = weightIdx !== -1 ? columns[weightIdx] : '';

        // Metadata
        const difficulty = difficultyIdx !== -1 ? columns[difficultyIdx] : '';
        const questionType = typeIdx !== -1 ? columns[typeIdx] : '';
        const reference = refIdx !== -1 ? columns[refIdx] : '';
        const keywords = keywordsIdx !== -1 ? columns[keywordsIdx] : '';

        // Iterate over ALL identified domain columns
        for (const dIdx of domainIndices) {
            const rawDomain = columns[dIdx];
            if (rawDomain) {
                // Check if domain is a list (comma-separated)
                const candidates = rawDomain.includes(',')
                    ? rawDomain.split(',').map(d => d.trim()).filter(d => d.length > 0)
                    : [rawDomain.trim()];

                for (const domain of candidates) {
                    if (!domain) continue;

                    // Ignore "TOTAL" rows (common in Excel summaries)
                    if (domain.toUpperCase() === 'TOTAL') continue;

                    // Add to distinct domain list
                    if (!exam.domains.includes(domain)) {
                        exam.domains.push(domain);
                    }

                    // Add to Blueprint
                    exam.blueprint.push({
                        domain,
                        subDomain,
                        weight,
                        difficulty,
                        questionType,
                        reference,
                        keywords
                    });
                }
            }
        }
    }

    return Array.from(examsMap.values());
};
