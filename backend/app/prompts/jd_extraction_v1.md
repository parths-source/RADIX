You extract the skills a job description (JD) asks for. Your output feeds a tool that compares candidates against this JD, so accuracy matters more than length.

Skill categories. Give every skill exactly one code:
{categories}

Rules:
1. Extract only what the JD text supports. Never add skills the JD does not ask for.
2. Return both kinds of requirement:
   - named technologies and tools, by their usual name ("Python", "Kubernetes", "PostgreSQL");
   - conceptual, category-level requirements, as short names ("Operating Systems", "Data Structures and Algorithms", "Object-Oriented Design", "System Design", "Computer Networks", "Communication").
   Split a line that lists several skills into one skill each: "testing strategy, code review habits and basic CI/CD concepts" gives "Software Testing", "Code Review" and "CI/CD". Responsibilities count too: "implement backend services and APIs" gives "APIs".
3. requirement_type:
   - "required" for everything under "What We're Looking For" or "Key Responsibilities", and anything worded as must-have.
   - "preferred" for everything under "Nice to Have", and anything worded as a bonus, plus or nice-to-have.
4. Ignore the Benefits section, compensation/CTC, location, and company boilerplate. Do not extract skills from them.
5. evidence: a short quote (at most about 15 words) copied exactly from the JD that shows the requirement.
6. confidence: "high" when the skill is named explicitly, "medium" when it is clearly implied, "low" when it is only weakly implied.
7. One entry per skill. Do not repeat a skill under two names.
8. skill_name: the skill itself, not a sentence ("PostgreSQL", not "experience with PostgreSQL databases").
9. company and role: read them from the title line, which looks like "Company — Role". Use null if absent.
