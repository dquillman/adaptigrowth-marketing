
// Mock logic of csvParser.ts

function testParser() {
    // PASTE UPDATED LOGIC HERE
    const parseExamCSV = (csvText) => {
        let lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return [];

        const firstLine = lines[0].replace(/^\uFEFF/, '');
        const delimiter = ',';

        const splitCSV = (text, delim) => {
            if (!text.includes('"')) return text.split(delim).map(c => c.trim());
            const splitRegex = new RegExp(`${delim}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
            return text.split(splitRegex).map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        };

        const headers = splitCSV(firstLine, delimiter).map(h => h.toLowerCase());
        console.log("Headers:", JSON.stringify(headers));

        const nameIdx = headers.findIndex(h => {
            if (h.includes('description') || h.includes('desc') || h.includes('summary') || h === 'code' || h === 'id' || h === 'exam id') return false;
            // Explicit exclusions for ID to avoid "Provider" match issues (fixed previously)
            if (h === 'id' || h === 'exam id') return false;

            if (h === 'name' || h === 'exam' || h === 'exam name' || h === 'provider' || h === 'exam provider') return true;
            return h.includes('exam name') || h.includes('provider') || (h.includes('exam') && !h.includes('desc'));
        });

        const domainIndices = headers.map((h, i) => {
            const isSub = h.includes('sub-domain') || h.includes('sub domain') || h.includes('topic') || h.includes('subdomains');
            const isDomain = h.includes('domain') || h.includes('knowledge area') || h.includes('category') || h.includes('key domain');
            return (isDomain && !isSub) ? i : -1;
        }).filter(i => i !== -1);

        console.log(`Indices - Name: ${nameIdx}, Domains: ${domainIndices}`);

        const examsMap = new Map();
        let lastExamName = null; // TRACKER FOR FILL DOWN

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const columns = splitCSV(line, delimiter);

            if (columns.length <= nameIdx) continue;
            let name = columns[nameIdx];

            // FILL DOWN LOGIC
            if (!name && lastExamName) {
                // Heuristic: If we have domain data but no name, assume it's the previous exam
                // Only do this if the row actually has content in domain columns?
                // For now, simple fill down is standard.
                name = lastExamName;
            }

            if (!name) {
                console.log(`Skipping Row ${i + 1}: Empty Name`);
                continue;
            }

            lastExamName = name;

            if (!examsMap.has(name)) {
                examsMap.set(name, { name, domains: [] });
            }
            const exam = examsMap.get(name);

            for (const dIdx of domainIndices) {
                const rawDomain = columns[dIdx];
                if (rawDomain) {
                    const candidates = rawDomain.includes(',')
                        ? rawDomain.split(',').map(d => d.trim()).filter(d => d.length > 0)
                        : [rawDomain.trim()];

                    for (const domain of candidates) {
                        if (!domain) continue;
                        if (!exam.domains.includes(domain)) {
                            exam.domains.push(domain);
                        }
                    }
                }
            }
        }
        return Array.from(examsMap.values());
    };

    // TEST CASE 3: Multiple Rows with Empty Name (Simulation)
    const csv3 = `#,Exam Description,Exam (Provider),Key Domains,Weight,Subdomains,New Metadata
1,Desc,PMP (PMI),People,42%,Tasks,Meta
2,Desc,,Process,50%,Tasks,Meta`;

    console.log("--- Test 3: Multiple Rows, Empty Name on Row 2 ---");
    const res3 = parseExamCSV(csv3);
    console.log(JSON.stringify(res3, null, 2));
}

testParser();
