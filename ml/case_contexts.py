# Контексты кейсов для оценки LLM
# Каждый кейс имеет уникальный контекст с описанием требований

CASE_CONTEXTS = {
    1: {
        "title": "VK Messenger x Alfa: SMB Products",
        "context": """Case Context (Project "VK Messenger x Alfa: Products for SMB"):

Product: VK Messenger B2B products for small and medium-sized businesses.

Focus Area: Development of growth strategy for VK Messenger B2B products in the SMB segment.

Main Project Goal: Increase product adoption and revenue from the SMB segment through VK Messenger.

Business Objectives: Analyze SMB segments, identify product growth points, propose metrics, create a roadmap, and define launch format.

Target Audience (TA): Small and medium-sized businesses across various industries seeking business communication solutions.

Required Solution Components:
The participant should have proposed a comprehensive growth strategy by completing the following tasks:

1. Analyze SMB segments and their specific needs in business communication.
2. Identify key growth points and opportunities for VK Messenger products.
3. Develop a clear value proposition for different SMB segments.
4. Propose measurable metrics to track product adoption and success.
5. Create a roadmap with priorities and implementation timeline.
6. Describe a go-to-market strategy and launch format.

Evaluation Criteria: Depth of SMB analysis, clarity of value proposition, feasibility of proposed solutions, measurability of success metrics, and practical implementation approach."""
    },
    
    2: {
        "title": "CL Cup IT: Personalization of Alfa-Bank Website",
        "context": """Case Context (Project "CL Cup IT: Website Personalization"):

Product: Alfa-Bank's main website serving millions of users daily.

Focus Area: Development of personalization hypotheses to improve conversion and user experience.

Main Project Goal: Increase website conversion and improve user journey quality through personalization.

Business Objectives: Study user scenarios, select personalization touchpoints, and propose experiment mechanics with measurable effects.

Target Audience (TA): Current and potential Alfa-Bank clients visiting the website with different needs and contexts.

Required Solution Components:
The participant should have proposed personalization strategy by completing the following tasks:

1. Analyze user journeys and identify key decision-making moments.
2. Select optimal personalization touchpoints based on user behavior data.
3. Develop specific personalization hypotheses with clear expected outcomes.
4. Propose A/B testing mechanics to validate hypotheses.
5. Define success metrics (conversion rate, bounce rate, engagement, etc.).
6. Prioritize hypotheses based on potential impact and implementation effort.

Evaluation Criteria: Understanding of user behavior, quality of personalization hypotheses, feasibility of implementation, clarity of measurement approach, and data-driven decision making."""
    },
    
    3: {
        "title": "CL Cup Data Science: Expanding the Circle",
        "context": """Case Context (Project "CL Cup Data Science: Expanding the Circle"):

Product: Alfa-Bank's customer relationship management and acquisition system.

Focus Area: Development of ML approach to find relatives of current Alfa-Bank clients for customer acquisition.

Main Project Goal: Create a data science solution to identify and acquire relatives of existing clients.

Business Objectives: Build logic for data science solution, define features, create validation plan, and propose model development roadmap.

Target Audience (TA): Relatives and family members of existing Alfa-Bank clients who may become new customers.

Required Solution Components:
The participant should have proposed ML solution by completing the following tasks:

1. Develop the overall logic and architecture of the data science solution.
2. Identify relevant features and data sources for relative identification.
3. Propose ML algorithms and model selection approach.
4. Create a validation plan to ensure model quality and ethics.
5. Define success metrics (precision, recall, business KPIs).
6. Propose a one-year development roadmap with enhancements.

Evaluation Criteria: Technical soundness of ML approach, feature engineering quality, validation methodology, ethical considerations, scalability, and practical business value."""
    },
    
    4: {
        "title": "Gum Cup: Industry Bank of First Click",
        "context": """Case Context (Project "Gum Cup: Industry Bank of First Click"):

Product: Alfa-Bank's industry-specific banking solutions for small and micro businesses.

Focus Area: Development of industry-specific offering for small and micro businesses with clear value proposition.

Main Project Goal: Create an industry-specific solution with competitive positioning and growth channels.

Business Objectives: Propose industry solution, competitive positioning, service package, and launch economics.

Target Audience (TA): Small and micro businesses in specific industries seeking specialized banking solutions.

Required Solution Components:
The participant should have proposed industry solution by completing the following tasks:

1. Select a specific industry and analyze its banking needs.
2. Develop a clear value proposition tailored to the industry.
3. Create competitive positioning against other banks and fintech solutions.
4. Design a comprehensive service package for the target industry.
5. Calculate launch economics and ROI projections.
6. Propose customer acquisition channels and growth strategy.

Evaluation Criteria: Industry knowledge depth, clarity of value proposition, competitive differentiation, financial feasibility, and practical implementation roadmap."""
    },
    
    5: {
        "title": "Gum Cup: Final Additional Task",
        "context": """Case Context (Project "Gum Cup: Final Additional Task"):

Product: Enhancement and packaging of the main Gum Cup solution for final presentation.

Focus Area: Refining the solution based on feedback and presenting it in a compelling format.

Main Project Goal: Transform the solution into a convincing, structured, and visually strong final deliverable.

Business Objectives: Incorporate feedback, polish the solution, and present it effectively to business stakeholders and jury.

Target Audience (TA): Business decision-makers, investors, and competition jury evaluating the solution.

Required Solution Components:
The participant should have refined and presented the solution by completing the following tasks:

1. Incorporate feedback from previous rounds into the solution.
2. Structure the presentation logically with clear flow.
3. Create compelling visual materials to support key points.
4. Articulate business value and expected outcomes clearly.
5. Address potential objections and risks proactively.
6. Demonstrate readiness for implementation.

Evaluation Criteria: Quality of presentation, clarity of communication, incorporation of feedback, visual design, and overall persuasiveness of the solution."""
    },
    
    6: {
        "title": "Alfa People: Qualification Stage",
        "context": """Case Context (Project "Alfa People: Qualification Stage"):

Product: Alfa People — Alfa-Bank's digital platform for employees and candidates.

Focus Area: Development of the "pre-login zone" of the app (an isolated area for candidates during the hiring stage).

Main Project Goal: Increase the engagement of potential employees using the Alfa People application.

Business Objectives of the Pre-login Zone: Expand the user funnel, free recruiters from routine tasks, retain candidates during the hiring process, and automate processes.

Target Audience (TA): Senior students and graduates, "middle+" level specialists (IT/digital crowd), and candidates who previously failed to pass the company's selection process.

Required Solution Components:
The participant should have proposed the structure and content of the pre-login zone by completing the following tasks:

1. Analyze trends in the HR-Tech industry and the recruiting of young professionals.
2. Analyze the preferences of the target audience.
3. Develop unique ideas to attract and retain the TA, and describe user action scenarios.
4. Justify the effectiveness of the solutions and propose ways to evaluate user engagement using activity metrics (e.g., DAU, WAU, MAU).

Evaluation Criteria: Understanding of HR-Tech trends, depth of target audience analysis, creativity of proposed features, feasibility of implementation, and clarity of success metrics."""
    },
    
    7: {
        "title": "Alfa People: Final",
        "context": """Case Context (Project "Alfa People: Final Stage"):

Product: Alfa People — Alfa-Bank's digital platform for employees and candidates.

Focus Area: Strengthening the product concept for Alfa People and defending it before the jury.

Main Project Goal: Bring the solution to final level with detailed hypotheses, UX, launch plan, metrics, and implementation logic.

Business Objectives: Enhance the product concept with comprehensive details, defend it convincingly, and demonstrate readiness for launch.

Target Audience (TA): Senior students and graduates, "middle+" level specialists (IT/digital crowd), and candidates who previously failed to pass the company's selection process.

Required Solution Components:
The participant should have developed a complete product concept by completing the following tasks:

1. Refine and detail product hypotheses based on qualification feedback.
2. Design comprehensive UX flows and interface mockups for key features.
3. Create a detailed launch plan with phases and milestones.
4. Define comprehensive metrics framework (DAU, WAU, MAU, retention, etc.).
5. Develop implementation logic with technical and organizational considerations.
6. Prepare a convincing defense addressing potential concerns and alternatives.

Evaluation Criteria: Completeness of solution, UX design quality, feasibility of launch plan, comprehensiveness of metrics, clarity of implementation approach, and persuasiveness of defense."""
    }
}


def get_case_context(case_id):
    """Получить контекст для конкретного кейса по ID"""
    case_id = int(case_id)
    if case_id not in CASE_CONTEXTS:
        return {
            "title": f"Case {case_id}",
            "context": "No specific context available for this case. Please provide a comprehensive and well-structured solution."
        }
    return CASE_CONTEXTS[case_id]


def get_all_case_ids():
    """Получить список всех доступных ID кейсов"""
    return list(CASE_CONTEXTS.keys())


def add_case_context(case_id, title, context):
    """Добавить новый контекст кейса (для легкой расширяемости)"""
    CASE_CONTEXTS[int(case_id)] = {
        "title": title,
        "context": context
    }
