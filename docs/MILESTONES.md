# Organizers' milestone checklist (reference)

Source: RADIX_Talent_Match_Milestone_Checklist.xlsx (the organizers' own plan for a team of five). Phases: 1 setup, 2 build per module, 3 integration, 4 presentation. Owners are modules; 'All' is everyone.

| # | Phase | Owner | Milestone | Definition of Done | Est. |
|---|---|---|---|---|---|
| 1 | Pre-work | All | Read the guide | Every team member has read the Candidate Guide and the JD/Resume pack before 9:30 | Before day starts |
| 2 | 1 | All | Understand your role | Each person can explain what they're building and exactly what they're handing off / receiving | 15 min |
| 3 | 1 | All | Data contract locked | Shared JSON schema for skills/profile/match agreed and written down somewhere everyone can see | 30 min |
| 4 | 1 | All | Environment ready | Python env, React scaffold, and sample JD/resume files accessible to everyone; each person can run a hello-world for their piece | 15 min |
| 5 | 2 | JD Analytics | JD text extraction | Can load a PDF or DOCX JD and extract raw text | 30 min |
| 6 | 2 | JD Analytics | JD skill extraction | Produces a structured skill list in the agreed format for at least 3 of the 6 sample JDs | 60 min |
| 7 | 2 | Resume Parsing | Resume text extraction | Can load a PDF or DOCX resume and extract raw text | 30 min |
| 8 | 2 | Resume Parsing | Resume skill extraction | Produces a structured skill list in the agreed format for at least 2 of the 4 sample resumes | 60 min |
| 9 | 2 | Profile Builder | Profile form complete | Captures basic details, skills, hackathons/internships, certifications, preferred roles, and CV upload | 60 min |
| 10 | 2 | Profile Builder | Profile save/load + merge | A saved profile can be reloaded, and skills from Resume Parsing's output can be merged in | 45 min |
| 11 | 2 | Talent Check | Company skillset data loads | Can load a company's 12-skillset requirement snapshot | 30 min |
| 12 | 2 | Talent Check | Talent Check scoring | Comparing a saved profile to a selected company produces a readiness score and a per-skillset gap list | 60 min |
| 13 | 2 | Skill Matching | JD skill list loads | Can load one extracted JD skill list from JD Analytics' output | 20 min |
| 14 | 2 | Skill Matching | Skill match scoring | Computes and displays a match score with matched and missing skills for a profile against that JD | 70 min |
| 15 | 3 | All | Modules talk to each other | All 5 modules can read/write the shared JSON contract without errors when run back to back | 20 min |
| 16 | 3 | All | One shared screen | End-to-end flow works inside one shared app: pick a JD -> parse a resume -> build/update profile -> Talent Check -> Skill Match | 40 min |
| 17 | 3 | All | Two combos demoed | At least 2 of the 6 JD/role combinations run successfully end-to-end | 20 min |
| 18 | 3 | All | Bugs triaged | Known bugs/edge cases logged with a fix-if-time priority | 10 min |
| 19 | 4 | All | Walkthrough ready | 5-8 minute script or slides ready: problem, architecture, live demo, one challenge faced | 30 min |
| 20 | 4 | All | Demo rehearsed | Live demo rehearsed at least once, end to end, without a mentor's help | 15 min |

Note: milestone 17 asks for at least 2 of the 6 JD/role combinations end to end; milestone 19 mentions a 5-8 minute walkthrough (see PLAN.md section 1 for the other timings).
