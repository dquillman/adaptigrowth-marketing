export default function QuestionProvenanceBadge() {
    const tooltipText =
        "How these questions are written\n\n" +
        "These are original, scenario-based questions written to reflect the decision-making style outlined in the PMI\u00AE PMP Exam Content Outline (ECO, 2021).\n\n" +
        "They emphasize situational judgment, leadership decisions, and real-world tradeoffs across People, Process, and Business contexts.\n\n" +
        "This product is not affiliated with or endorsed by PMI\u00AE.";

    return (
        <p
            className="text-xs text-slate-500 text-center cursor-default select-none"
            title={tooltipText}
        >
            &#10004; Scenario-based &bull; PMP-style (ECO 2021)
        </p>
    );
}
