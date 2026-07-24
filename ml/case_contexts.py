"""English case contexts used by the LLM evaluation prompt."""


CASE_CONTEXTS = {
    1: {
        "title": "VK Messenger x Alfa-Bank",
        "context": """Case Context: VK Messenger x Alfa-Bank

Challenge: Develop a product strategy for VK Messenger solutions aimed at small and medium-sized businesses. Propose new solutions, measurable success indicators, and sustainable growth opportunities.

The solution should:
1. Research and segment the SMB audience and identify its communication needs.
2. Diagnose the strongest product and market opportunities.
3. Propose concrete product initiatives and explain their customer value.
4. Define acquisition, activation, engagement, retention, and business metrics.
5. Prioritize initiatives and describe a realistic implementation roadmap.
6. Explain how the strategy can create growth for both VK Messenger and Alfa-Bank.

Evaluation focus: quality of research, strategic logic, product relevance, growth potential, analytical depth, measurable metrics, prioritization, and feasibility.""",
    },
    2: {
        "title": "Alfa-Bank Website Personalization",
        "context": """Case Context: Alfa-Bank Website Personalization

Challenge: Develop website personalization initiatives that increase the conversion of Alfa-Bank visitors into customers. Research the market, propose hypotheses, and estimate their effectiveness.

The solution should:
1. Research user segments, needs, and key website journeys.
2. Identify high-impact personalization opportunities and touchpoints.
3. Formulate product and UX hypotheses for relevant segments.
4. Explain the data and decision logic required for personalization.
5. Define experiments, control groups, and success metrics.
6. Prioritize initiatives by expected impact, confidence, effort, and risk.

Evaluation focus: user insight, product and UX quality, analytical rigor, experiment design, measurable impact, responsible data use, and implementation feasibility.""",
    },
    3: {
        "title": "Look-alike Modeling for Family Banking",
        "context": """Case Context: Look-alike Modeling for Family Banking

Challenge: Develop a machine-learning model for finding likely relatives of existing Alfa-Bank customers. Propose a development strategy and personalized acquisition scenarios.

The solution should:
1. Define the business objective, target event, and eligible audience.
2. Propose suitable data sources and meaningful model features.
3. Describe the modeling approach, training sample, validation, and baselines.
4. Address privacy, consent, bias, leakage, and false-positive risks.
5. Define technical and business metrics for offline and online evaluation.
6. Design personalized customer scenarios and a phased product rollout.

Evaluation focus: sound AI methodology, research quality, analytical depth, validation design, ethics, useful product scenarios, measurable value, and practical feasibility.""",
    },
    4: {
        "title": "First-Click Industry Banking",
        "context": """Case Context: First-Click Industry Banking

Challenge: Develop an industry-specific solution for small and medium-sized businesses. Select a promising niche, propose an integrated product offering, and estimate the effect for Alfa-Bank.

The solution should:
1. Select and justify an attractive industry niche.
2. Research the niche, customer jobs, pain points, and competitive alternatives.
3. Design an integrated set of banking and non-banking products.
4. Explain the value proposition and customer journey.
5. Estimate market potential, economics, risks, and expected bank impact.
6. Define validation metrics, rollout stages, and growth opportunities.

Evaluation focus: strategic rationale, research depth, product coherence, analytical evidence, growth potential, measurable economics, and feasibility.""",
    },
    5: {
        "title": "Industry Solution: Go-to-Market Additional Task",
        "context": """Case Context: Industry Solution — Go-to-Market Additional Task

Challenge: Refine the industry solution using received feedback and prepare customer-facing materials. Demonstrate its value, competitive advantages, and promotion strategy.

The solution should:
1. Clearly show how earlier feedback changed the product.
2. Refine the customer value proposition and competitive positioning.
3. Define priority customer segments and acquisition channels.
4. Design clear customer-facing materials and a coherent UX journey.
5. Propose a marketing and growth strategy with testable hypotheses.
6. Define launch stages, research activities, risks, and success criteria.

Evaluation focus: product refinement, quality of customer communication, marketing strategy, growth logic, research support, UX clarity, and readiness for launch.""",
    },
    6: {
        "title": "Alfa People",
        "context": """Case Context: Alfa People

Challenge: Propose a development concept for the Alfa People candidate application. Improve user experience and engagement throughout the hiring journey.

The solution should:
1. Research candidate segments, needs, frustrations, and hiring journeys.
2. Identify the most important engagement and UX problems.
3. Propose a focused product concept and key user scenarios.
4. Define an MVP and explain its scope and prioritization.
5. Design validation research and product experiments.
6. Define acquisition, engagement, retention, and hiring-funnel metrics.

Evaluation focus: candidate insight, product clarity, UX quality, research rigor, analytical thinking, growth potential, MVP focus, and feasibility.""",
    },
    7: {
        "title": "Alfa People: MVP and User Testing Final",
        "context": """Case Context: Alfa People — MVP and User Testing Final

Challenge: Refine the Alfa People MVP and validate its effectiveness through user testing. Prepare the solution for a final defense.

The solution should:
1. State the tested problem, audience, assumptions, and MVP scope.
2. Explain what changed after earlier feedback and why.
3. Present realistic UX flows or prototype scenarios.
4. Design user testing with appropriate participants and tasks.
5. Analyze evidence, define metrics, and distinguish findings from assumptions.
6. Recommend product changes, next experiments, and an implementation plan.

Evaluation focus: MVP discipline, UX quality, research design, evidence-based decisions, analytical depth, meaningful metrics, iteration quality, and persuasiveness of the final defense.""",
    },
}


def get_case_context(case_id):
    """Return the evaluation context for a case ID."""
    case_id = int(case_id)
    if case_id not in CASE_CONTEXTS:
        return {
            "title": f"Case {case_id}",
            "context": (
                "No specific context is available for this case. "
                "Evaluate the solution for clarity, evidence, feasibility, and measurable impact."
            ),
        }
    return CASE_CONTEXTS[case_id]


def get_all_case_ids():
    """Return all configured case IDs."""
    return list(CASE_CONTEXTS.keys())


def add_case_context(case_id, title, context):
    """Add or replace a case context."""
    CASE_CONTEXTS[int(case_id)] = {"title": title, "context": context}
