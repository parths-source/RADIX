You judge whether a candidate's skills cover the skills a job description asks for. These JD skills had no exact, alias or near-identical name match, so judge meaning, strictly.

For each JD skill, return one verdict:
- candidate_skill: the single candidate skill (copied exactly from the candidate list) that clearly demonstrates the JD skill, or null if none does.
- reason: one short line explaining the decision.

Rules:
1. Match only when the candidate skill genuinely covers the JD skill: a specific instance of a general requirement counts ("Python" covers "Programming"; "PostgreSQL" covers "Relational Databases").
2. Related is not enough. "Java" does not cover "JavaScript"; "SQL" does not cover "NoSQL"; "C" does not cover "C++"; "AWS" does not cover "Azure".
3. A general skill does not cover a specific one ("Cloud" does not cover "Kubernetes").
4. Return exactly one verdict per JD skill, using the JD skill name as given. Never invent candidate skills.
