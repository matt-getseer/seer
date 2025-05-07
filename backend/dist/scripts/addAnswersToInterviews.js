"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env node */
/* global console, process */
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Interview IDs to add answers to - from the previous script
const interviewIds = [134, 135, 136, 137, 138, 139, 140, 141, 142, 143];
// Array of technical answers for different role types
const technicalAnswers = [
    // Engineering
    `I've been working with React and TypeScript for the past 5 years, focusing on building scalable frontend architectures. My approach to component design emphasizes reusability, performance, and maintainability.

For state management, I prefer using a combination of React Context for global state and local component state for UI-specific concerns. I'm also experienced with Redux when projects require more complex state handling.

In my current role, I implemented a component library that reduced development time by 30% across our organization. The library includes a comprehensive set of UI components with consistent styling, behavior, and accessibility features.

I also have experience with performance optimization, including code splitting, memoization, and virtual list implementations for handling large datasets. In one project, I reduced initial load time by 40% by implementing proper code splitting and lazy loading strategies.

For testing, I use Jest and React Testing Library for unit and integration tests, and Cypress for end-to-end testing. I believe in maintaining a test coverage of at least 80% for critical business logic.`,
    // Design
    `My design process typically starts with understanding the problem space through user research and stakeholder interviews. I create journey maps and user personas to identify pain points and opportunities.

For wireframing, I use Figma to quickly explore different solutions and get early feedback. I then develop high-fidelity prototypes that can be tested with users before implementation.

I've recently led the redesign of our customer dashboard, which increased user engagement by 25%. The key to this success was simplifying the information architecture and providing personalized insights based on user behavior.

I follow atomic design principles, creating a design system with reusable components that can be assembled into different patterns and pages. This approach ensures consistency across the product while allowing for flexibility.

For user testing, I conduct both moderated and unmoderated sessions, using tools like UserTesting.com and Hotjar to gather qualitative and quantitative feedback.`,
    // Product Management
    `My product management approach is data-informed but customer-obsessed. I start by understanding customer problems through user research, data analysis, and market trends.

For prioritization, I use a framework that considers business value, user value, and technical feasibility. This helps ensure we're building features that matter most to both users and the business.

I've recently led the development of our subscription model, which increased recurring revenue by 40%. This involved working closely with engineering, design, marketing, and sales teams to ensure a seamless user experience.

For roadmap planning, I prefer outcome-based roadmaps that focus on the problems we're solving rather than specific features. This gives teams more autonomy in how they address user needs.

I track product success through a combination of business metrics (revenue, conversion rates), user metrics (engagement, retention), and operational metrics (performance, reliability).`,
    // Marketing
    `My marketing strategy is centered on creating value-driven content that resonates with our target audience. I focus on understanding the customer journey and identifying touchpoints where content can address specific pain points.

For digital campaigns, I use a data-driven approach to optimize channel performance. In my current role, I increased organic traffic by 50% by implementing a comprehensive SEO strategy and content calendar.

I'm experienced with marketing automation tools like HubSpot and Marketo, using them to nurture leads through personalized email sequences. This has resulted in a 35% increase in qualified leads for our sales team.

For analytics, I use a combination of Google Analytics, Mixpanel, and custom dashboards to track campaign performance and ROI. I'm comfortable working with data to extract insights and make informed decisions.

I also have experience with A/B testing marketing messaging and landing pages, which has led to conversion rate improvements of 20-30% across various campaigns.`,
    // Sales
    `My sales approach is consultative, focusing on understanding the customer's business challenges before proposing solutions. I believe building trust is essential for long-term customer relationships.

In my current role, I've consistently exceeded quota by 120% by focusing on high-value enterprise accounts and developing a systematic approach to account penetration.

For prospecting, I use a combination of social selling on LinkedIn, targeted email campaigns, and strategic networking at industry events. This multi-channel approach has increased my pipeline by 40%.

I'm experienced with solution selling methodologies, including SPIN and Challenger. I find that asking insightful questions helps uncover underlying needs that customers might not explicitly state.

For CRM management, I maintain detailed records of all customer interactions and use sales intelligence tools to identify opportunities for expansion and cross-selling. This systematic approach has helped me increase average deal size by 30%.`,
    // Data Science
    `My approach to data science projects follows a structured methodology: first understanding the business problem, then exploring and preparing the data, followed by model development, validation, and deployment.

I'm proficient in Python, SQL, and various data science libraries including pandas, scikit-learn, and TensorFlow. I've developed predictive models using techniques ranging from regression and random forests to neural networks.

In my current role, I developed a churn prediction model that identifies at-risk customers with 85% accuracy. This has enabled our customer success team to proactively engage with these customers and reduce churn by 20%.

For data processing, I've worked with both batch and streaming data using technologies like Apache Spark and Kafka. I'm comfortable working with large datasets and optimizing pipelines for performance.

I believe in making models interpretable whenever possible, using techniques like SHAP values and partial dependence plots to explain model predictions to stakeholders.`,
    // Operations
    `My approach to operations management focuses on creating efficient, scalable processes that balance quality, cost, and speed. I use lean principles to identify and eliminate waste in business processes.

In my current role, I led a process improvement initiative that reduced order fulfillment time by 40% while improving accuracy rates. This involved mapping the current process, identifying bottlenecks, and implementing targeted improvements.

For inventory management, I implemented a just-in-time system that reduced carrying costs by 25% while maintaining service levels. This required close coordination with suppliers and implementing better forecasting methods.

I'm experienced with process automation using tools like Zapier and custom workflows in our ERP system. These automations have reduced manual work by 30% and improved data accuracy across departments.

For performance monitoring, I develop KPI dashboards that provide real-time visibility into operational metrics. This enables quick identification of issues and data-driven decision making.`,
    // Customer Success
    `My approach to customer success is proactive and data-driven. I believe in understanding customer goals and helping them achieve measurable value from our product.

For onboarding, I've developed a structured process that reduces time-to-value by helping customers implement best practices from day one. This has increased product adoption rates by 30%.

I use health scores to monitor customer accounts, combining product usage data, support interactions, and business outcomes to identify at-risk customers early. This proactive approach has reduced churn by 15%.

For account expansion, I work closely with customers to identify additional use cases and value opportunities. This approach has increased average account value by 25% year-over-year.

I believe in building strong relationships at multiple levels within customer organizations. This helps create champions who advocate for our product internally and provide valuable feedback for product development.`,
    // HR
    `My approach to HR combines strategic people management with operational excellence. I believe HR should be a true business partner that helps drive organizational performance.

In talent acquisition, I've implemented structured interview processes and assessment methods that have improved quality of hire by 25%. This includes competency-based interviews, work sample tests, and culture fit assessments.

For employee development, I created a comprehensive training program that increased internal promotions by 30%. The program includes both technical skills and leadership development tracks.

I've led diversity and inclusion initiatives that increased diversity in leadership positions by 20% over two years. This involved implementing unbiased hiring practices, creating mentorship programs, and developing inclusive leadership training.

In performance management, I redesigned our review process to focus on ongoing feedback and development rather than annual evaluations. This has increased employee satisfaction with the process by 40%.`,
    // Generic
    `I approach problem-solving methodically, starting with a clear definition of the problem, gathering relevant data, and analyzing root causes before developing solutions.

In my current role, I led a cross-functional team that improved our core business process efficiency by 35%. This involved documenting the current process, identifying bottlenecks, and implementing targeted improvements.

I'm skilled at analyzing data to identify trends and insights that drive business decisions. In one project, my analysis revealed customer segments that were underserved, leading to a new product line that generated $2M in revenue.

For project management, I use Agile methodologies to ensure flexibility while maintaining focus on key deliverables. This approach has helped me consistently deliver projects on time and within budget.

I believe in continuous improvement and regularly seek feedback from colleagues, managers, and clients to refine my approach and develop new skills.`
];
// Array of cultural fit answers
const culturalAnswers = [
    // Teamwork oriented
    `I thrive in collaborative environments where ideas flow freely between team members. In my current role, I established bi-weekly knowledge sharing sessions where team members could present on topics they're passionate about. This not only improved our collective skills but also strengthened team bonds.

I believe diverse perspectives lead to better solutions. I make a conscious effort to seek input from quieter team members and ensure everyone's voice is heard in discussions.

When conflicts arise, I address them directly but respectfully. I focus on understanding different viewpoints and finding common ground. In a recent disagreement about technical approach, I facilitated a structured discussion that helped us reach a consensus that incorporated the best elements of different proposals.

I value transparency and open communication. I prefer working in organizations where information flows freely and people feel comfortable sharing both successes and failures.

I'm looking for a team culture that balances innovation with execution, where people take pride in their work while maintaining a healthy work-life balance.`,
    // Growth mindset
    `I'm passionate about continuous learning and professional growth. I dedicate at least 5 hours weekly to learning new skills through online courses, books, and community events.

I view challenges as growth opportunities rather than obstacles. When faced with unfamiliar problems, I break them down into smaller components and systematically work through them, seeking help when needed.

I actively seek feedback from peers and managers to improve my performance. I recently asked my team for anonymous feedback, which highlighted areas where I could communicate more effectively. I've since implemented changes that have improved our team dynamics.

I'm not afraid to step outside my comfort zone. In my previous role, I volunteered to lead a high-visibility project despite having limited experience in that area. This stretched my abilities and significantly accelerated my professional development.

I believe in taking calculated risks and learning from failures. I encourage teams to conduct blameless postmortems after setbacks to identify lessons and improve our processes going forward.`,
    // Customer focus
    `I'm deeply committed to understanding customer needs and delivering exceptional value. In every role, I seek to build empathy for our users through direct interaction and data analysis.

I regularly participate in customer calls and user testing sessions to gain firsthand insights into pain points and usage patterns. These insights have directly influenced product improvements that increased customer satisfaction scores by 20%.

I believe in making decisions based on customer impact. When evaluating features or changes, I always ask "How does this benefit our users?" and prioritize accordingly.

I've championed the voice of the customer within our organization by creating dashboards that highlight key customer metrics and sharing customer stories in team meetings.

I find satisfaction in solving real customer problems. My most fulfilling professional moments have been when customers share how our product has positively impacted their business or workflow.`,
    // Innovation oriented
    `I'm passionate about innovation and creative problem-solving. I regularly explore emerging technologies and industry trends to identify opportunities for improvement.

In my current role, I established an innovation lab where team members could experiment with new technologies and approaches. This resulted in three features that were eventually incorporated into our main product.

I believe in balancing innovation with practicality. While I enjoy exploring creative solutions, I always consider implementation feasibility, maintenance costs, and alignment with business goals.

I encourage calculated risk-taking and create safe spaces for experimentation. I believe the best innovations often come from trying new approaches, failing fast, and iterating based on learnings.

I've found that innovation thrives in diverse teams where different perspectives and backgrounds contribute to a broader range of ideas. I actively seek out and value input from team members with different expertise.`,
    // Leadership focused
    `My leadership philosophy centers on empowering team members to do their best work. I believe in setting clear expectations and outcomes, then giving people the autonomy to determine how to achieve them.

I focus on removing obstacles for my team rather than micromanaging. In my current role, I identified process bottlenecks that were frustrating the team and worked with stakeholders to streamline approvals and decision-making.

I believe in leading by example and maintaining high standards. I'm willing to roll up my sleeves and help the team when needed, while also holding myself accountable to the same standards I expect from others.

I invest time in developing team members through regular one-on-ones, constructive feedback, and creating growth opportunities. I'm proud that several of my direct reports have been promoted into leadership roles.

I value transparency in decision-making and communicate the "why" behind directions. This builds trust and helps team members align their work with broader organizational goals.`,
    // Adaptability focused
    `I thrive in dynamic environments and adapt quickly to changing priorities. In my current role, our business direction shifted significantly, requiring me to learn new technologies and approaches within a tight timeframe.

I stay calm under pressure and maintain focus on solutions rather than problems. During a recent system outage, I coordinated our response team, prioritized critical issues, and kept stakeholders informed throughout the incident.

I'm comfortable with ambiguity and can move projects forward even when all details aren't clear. I believe in making decisions with the information available, while being flexible enough to adjust as new information emerges.

I embrace organizational changes as opportunities for improvement. When our company reorganized last year, I helped my team navigate the transition by focusing on the potential benefits and addressing concerns openly.

I actively seek feedback during times of change and use it to refine my approach. This adaptability has allowed me to remain effective across different roles, projects, and organizational structures.`,
    // Work ethics
    `I believe in delivering high-quality work and taking ownership of outcomes. I set high standards for myself and thoroughly review my work before considering it complete.

I'm reliable and take commitments seriously. If I say I'll deliver something by a certain date, I do everything in my power to meet that deadline or communicate early if obstacles arise.

I prioritize ethical considerations in decision-making. In a previous role, I advocated for addressing a security vulnerability immediately, even though it meant delaying a major feature release.

I believe in transparency and honesty, especially when things go wrong. I take responsibility for mistakes and focus on solutions rather than blame.

I manage my time effectively and respect others' time as well. I come prepared to meetings, stay focused during work hours, and ensure I'm contributing value to the organization.`,
    // Balance and wellbeing
    `I believe maintaining work-life balance is essential for sustained performance and creativity. I'm productive and focused during work hours while also making time for personal interests and family.

I practice self-awareness about my energy levels and work habits. I schedule deep work during my most productive hours and take short breaks to maintain focus throughout the day.

I believe in the importance of team wellbeing. In my current role, I've advocated for reasonable workloads and helped establish norms around respecting non-work hours and vacation time.

I manage stress through regular exercise, mindfulness practices, and maintaining boundaries between work and personal life. These habits help me remain effective even during challenging periods.

I recognize the signs of burnout in myself and team members and take proactive steps to address it. I believe sustainable performance is more valuable than short bursts of productivity followed by exhaustion.`,
    // Communication style
    `I value clear, direct communication that respects others' time and perspectives. I tailor my communication style to my audience, providing appropriate detail for technical discussions while focusing on business impact when speaking with executives.

I'm an active listener who seeks to understand before being understood. In meetings, I ask clarifying questions and paraphrase others' points to ensure I've captured their meaning accurately.

I believe in transparent communication, especially around challenges or setbacks. I prefer addressing issues directly rather than avoiding difficult conversations.

I'm thoughtful about choosing the right communication channel for different messages. I use asynchronous communication for most updates and reserve meetings for discussions that benefit from real-time interaction.

I document important decisions and share context to ensure everyone has access to the information they need. This practice has been particularly valuable as our team has grown more distributed.`,
    // Generic
    `I believe in fostering a positive and inclusive work environment where everyone can contribute their best work. I make an effort to recognize team members' contributions and provide support when needed.

I value collaboration and knowledge sharing. In my current role, I established a mentoring program that pairs junior team members with more experienced colleagues, which has accelerated skill development across the team.

I believe in maintaining a healthy work-life balance. I'm fully dedicated during work hours while also recognizing the importance of personal time for long-term wellbeing and productivity.

I'm adaptable and remain effective in changing circumstances. When our organization shifted to remote work, I quickly adjusted my communication approaches and work habits to maintain team cohesion and productivity.

I align my daily work with organizational values and goals. I find meaning in contributing to the company's mission and take pride in upholding our cultural principles.`
];
async function main() {
    try {
        // Check if all the interview IDs exist
        for (const id of interviewIds) {
            const interviewExists = await prisma.interview.findUnique({
                where: { id }
            });
            if (!interviewExists) {
                console.error(`Interview with ID ${id} not found. Please check the interview IDs.`);
                return;
            }
        }
        console.log(`Verified ${interviewIds.length} interviews exist`);
        // Get all interviews to determine their team/role for appropriate answers
        const interviews = await prisma.interview.findMany({
            where: {
                id: {
                    in: interviewIds
                }
            }
        });
        console.log(`Retrieved ${interviews.length} interviews`);
        // Create answer data for each interview
        const answerPromises = interviews.map(async (interview) => {
            // Select appropriate technical answer based on team/role
            let technicalAnswerIndex = 9; // default/generic
            if (interview.team.includes('Engineering')) {
                technicalAnswerIndex = 0;
            }
            else if (interview.team.includes('Design')) {
                technicalAnswerIndex = 1;
            }
            else if (interview.team.includes('Product')) {
                technicalAnswerIndex = 2;
            }
            else if (interview.team.includes('Marketing')) {
                technicalAnswerIndex = 3;
            }
            else if (interview.team.includes('Sales')) {
                technicalAnswerIndex = 4;
            }
            else if (interview.team.includes('Data')) {
                technicalAnswerIndex = 5;
            }
            else if (interview.team.includes('Operations')) {
                technicalAnswerIndex = 6;
            }
            else if (interview.team.includes('Customer')) {
                technicalAnswerIndex = 7;
            }
            else if (interview.team.includes('HR')) {
                technicalAnswerIndex = 8;
            }
            // Randomly select cultural answer
            const culturalAnswerIndex = Math.floor(Math.random() * culturalAnswers.length);
            // Generate random scores
            const technicalScore = Math.floor(Math.random() * 3) + 7; // 7-9
            const cultureScore = Math.floor(Math.random() * 3) + 7; // 7-9
            const communicationScore = Math.floor(Math.random() * 3) + 7; // 7-9
            // Calculate overall rating (average of the three scores, rounded)
            const overallRating = Math.round((technicalScore + cultureScore + communicationScore) / 3);
            // Create a note based on the scores
            let notes = '';
            if (overallRating >= 9) {
                notes = `Excellent candidate with strong ${interview.team.toLowerCase()} background. Highly recommended for the next round.`;
            }
            else if (overallRating >= 8) {
                notes = `Strong candidate who demonstrated good knowledge of ${interview.team.toLowerCase()} principles and practices. Recommended.`;
            }
            else {
                notes = `Solid candidate with relevant ${interview.team.toLowerCase()} experience. Consider for further evaluation.`;
            }
            return {
                interviewId: interview.id,
                firstAnswer: technicalAnswers[technicalAnswerIndex],
                secondAnswer: culturalAnswers[culturalAnswerIndex],
                technicalScore,
                cultureScore,
                communicationScore,
                overallRating,
                notes
            };
        });
        const answerData = await Promise.all(answerPromises);
        // Create all the interview answers using transaction
        // Using raw queries to avoid Prisma client typings issues
        const createdAnswers = [];
        for (const data of answerData) {
            const answer = await prisma.$queryRaw `
        INSERT INTO "InterviewAnswer" ("interviewId", "firstAnswer", "secondAnswer", "technicalScore", "cultureScore", "communicationScore", "overallRating", "notes", "createdAt", "updatedAt")
        VALUES (${data.interviewId}, ${data.firstAnswer}, ${data.secondAnswer}, ${data.technicalScore}, ${data.cultureScore}, ${data.communicationScore}, ${data.overallRating}, ${data.notes}, NOW(), NOW())
        RETURNING *
      `;
            if (answer && answer.length > 0) {
                createdAnswers.push(answer[0]);
            }
        }
        console.log(`Created ${createdAnswers.length} interview answers`);
        // Print a summary
        createdAnswers.forEach((answer, idx) => {
            console.log(`${idx + 1}. Interview ID: ${answer.interviewId} - Overall Rating: ${answer.overallRating}/10`);
        });
    }
    catch (error) {
        console.error('Error adding answers to interviews:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
