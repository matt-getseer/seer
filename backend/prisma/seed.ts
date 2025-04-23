/* eslint-env node */
/* global console, process */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, let's make sure we have at least one user
  // Check if a test user exists
  let user = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  })

  // Create test user if it doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // password is "password"
      },
    })
    console.log(`Created test user with id: ${user.id}`)
  } else {
    console.log(`Using existing user with id: ${user.id}`)
  }

  // Delete existing interviews to avoid duplicates
  await prisma.interview.deleteMany({})
  console.log('Deleted existing interviews')

  // Create 10 dummy interviews
  const dummyInterviews = [
    {
      name: 'John Smith',
      team: 'Engineering',
      interviewName: 'Technical Assessment',
      dateTaken: new Date('2023-05-15'),
      userId: user.id
    },
    {
      name: 'Sarah Johnson',
      team: 'Product',
      interviewName: 'Product Strategy Discussion',
      dateTaken: new Date('2023-06-22'),
      userId: user.id
    },
    {
      name: 'Michael Chen',
      team: 'UX Design',
      interviewName: 'Design Portfolio Review',
      dateTaken: new Date('2023-07-10'),
      userId: user.id
    },
    {
      name: 'Emily Davis',
      team: 'Marketing',
      interviewName: 'Marketing Strategy Interview',
      dateTaken: new Date('2023-08-05'),
      userId: user.id
    },
    {
      name: 'Carlos Rodriguez',
      team: 'Sales',
      interviewName: 'Sales Performance Review',
      dateTaken: new Date('2023-09-18'),
      userId: user.id
    },
    {
      name: 'Lisa Wong',
      team: 'Customer Success',
      interviewName: 'Customer Journey Mapping',
      dateTaken: new Date('2023-10-25'),
      userId: user.id
    },
    {
      name: 'David Kim',
      team: 'Engineering',
      interviewName: 'System Architecture Discussion',
      dateTaken: new Date('2023-11-12'),
      userId: user.id
    },
    {
      name: 'Priya Patel',
      team: 'Data Science',
      interviewName: 'Analytics Framework Planning',
      dateTaken: new Date('2023-12-07'),
      userId: user.id
    },
    {
      name: 'James Wilson',
      team: 'Operations',
      interviewName: 'Process Improvement Interview',
      dateTaken: new Date('2024-01-15'),
      userId: user.id
    },
    {
      name: 'Olivia Martinez',
      team: 'HR',
      interviewName: 'Employee Experience Discussion',
      dateTaken: new Date('2024-02-28'),
      userId: user.id
    }
  ]

  // Insert interviews
  const interviews = await prisma.$transaction(
    dummyInterviews.map(interview => 
      prisma.interview.create({ data: interview })
    )
  )

  console.log(`Created ${interviews.length} interviews`)

  // Create dummy interview answers
  const dummyAnswers = [
    {
      interviewId: interviews[0].id,
      firstAnswer: `I've been working with Java for over 7 years, and I consider it my primary language. I'm very comfortable with Spring Boot for building microservices and RESTful APIs. I've also spent considerable time optimizing database queries and improving application performance.

For algorithm problems, I typically start by understanding the requirements, identifying edge cases, and then working through a solution step by step. I prefer to write clean, maintainable code over clever solutions that might be harder to understand.

In my last role, I led the migration of a monolithic application to a microservices architecture. This involved breaking down a complex system into smaller, manageable services while ensuring they could communicate effectively. We used Kafka for messaging between services and implemented circuit breakers with Hystrix to handle failures gracefully.

I'm also familiar with Docker and Kubernetes for containerization and orchestration. I've set up CI/CD pipelines using Jenkins and GitLab CI, which has significantly improved our deployment process and reduced downtime.`,
      secondAnswer: `I believe in fostering an environment of open communication and continuous learning. In my previous team, I organized weekly knowledge-sharing sessions where team members could present on topics they were passionate about. This not only helped spread knowledge but also built stronger relationships within the team.

I value diversity of thought and believe that different perspectives lead to better solutions. I make a conscious effort to ensure everyone's voice is heard in meetings and discussions.

When facing conflicts, I prefer to address them directly but respectfully. I focus on understanding the underlying issues rather than jumping to conclusions. I've found that most conflicts arise from misunderstandings or different priorities, and clear communication can usually resolve them.

I'm excited about joining a team that values innovation and collaboration. I'm particularly impressed by your company's commitment to work-life balance and professional development. I believe these values align well with my own, and I'm looking forward to contributing to your team's success.`,
      technicalScore: 8,
      cultureScore: 7,
      communicationScore: 8,
      overallRating: 8,
      notes: "Strong technical background with good communication skills. Would be a good fit for our engineering team."
    },
    {
      interviewId: interviews[1].id,
      firstAnswer: `As a product manager, I follow a user-centric approach to product development. I start by understanding the user's needs and pain points through user research, surveys, and feedback analysis. This helps me identify the core problems we need to solve.

I then work with stakeholders to define the product vision and strategy. This involves prioritizing features based on user value, business impact, and feasibility. I use frameworks like RICE (Reach, Impact, Confidence, Effort) to make data-informed decisions.

For product roadmaps, I prefer to organize them by outcome rather than output. This means focusing on the problems we're solving rather than specific features. This approach gives teams more flexibility in how they solve problems and encourages innovation.

I've led the development of three major products in my career, from concept to launch. The most recent was a B2B SaaS platform that achieved 40% year-over-year growth in its first two years. I worked closely with engineering, design, and marketing teams to ensure a successful launch and continuous improvement post-launch.`,
      secondAnswer: `Collaboration is at the heart of successful product development. As a PM, I see myself as the bridge between different teams and stakeholders. I make it a priority to establish good relationships with team members across functions and ensure everyone is aligned on our goals and priorities.

I believe in transparent communication, especially when it comes to explaining the 'why' behind decisions. This helps build trust and buy-in from the team. I hold regular product demos and feedback sessions to keep everyone engaged and informed.

In terms of leadership style, I prefer to empower teams rather than micromanage. I set clear expectations and outcomes, then trust my team to find the best solutions. I'm always available for guidance and support, but I believe giving people autonomy leads to better results and higher job satisfaction.

I'm particularly drawn to your company's mission and how your products are making a meaningful impact in the industry. I'm excited about the possibility of contributing to that mission and working with a talented team to create products users love.`,
      technicalScore: 9,
      cultureScore: 9,
      communicationScore: 8,
      overallRating: 9,
      notes: "Excellent product strategist with strong leadership qualities. Would be a great addition to our product team."
    },
    {
      interviewId: interviews[2].id,
      firstAnswer: `My design process typically begins with research to understand the problem space, user needs, and business objectives. I conduct user interviews, analyze competitor products, and collaborate with stakeholders to define the design requirements.

For UX design, I start with low-fidelity wireframes to explore different solutions quickly. I then create interactive prototypes for user testing, which helps validate assumptions and identify usability issues early. Based on feedback, I refine the designs and move to high-fidelity mockups.

My portfolio includes a range of projects from e-commerce websites to mobile applications. One project I'm particularly proud of is redesigning a healthcare app that increased user engagement by 35%. The key to that success was simplifying the appointment booking process and improving the information architecture.

I'm proficient in design tools like Figma, Sketch, and Adobe XD. I also have experience with design systems and component libraries, which ensure consistency across products and streamline the design-to-development handoff.

For visual design, I focus on creating clean, accessible interfaces that align with brand guidelines while prioritizing usability. I believe good design should be invisible – it should feel natural and intuitive to users.`,
      secondAnswer: `Design is inherently collaborative, and I thrive in environments where I can work closely with product managers, engineers, and other stakeholders. I believe the best products come from cross-functional collaboration and diverse perspectives.

I approach feedback with an open mind and see it as an opportunity to improve. I encourage honest feedback from team members and users alike, as it helps me grow as a designer and leads to better outcomes for our products.

When it comes to design decisions, I base them on research and data rather than personal preferences. I can clearly articulate the reasoning behind my design choices and how they address user needs and business goals.

I'm drawn to your company because of your user-centered approach to design and the impact your products have on people's lives. I'm excited about the opportunity to contribute to your design team and help create meaningful experiences for your users.`,
      technicalScore: 8,
      cultureScore: 8,
      communicationScore: 7,
      overallRating: 8,
      notes: "Strong design skills with good understanding of user experience principles. Portfolio shows versatility and attention to detail."
    },
    {
      interviewId: interviews[3].id,
      firstAnswer: `My approach to marketing strategy begins with a thorough analysis of the market, audience, and competitive landscape. I use tools like SWOT analysis, customer journey mapping, and market segmentation to identify opportunities and develop targeted strategies.

I have extensive experience with digital marketing channels, including SEO, SEM, social media, email marketing, and content marketing. In my previous role, I led a campaign that increased organic traffic by 45% and conversion rates by 20% within six months.

For campaign measurement, I focus on meaningful metrics that align with business objectives rather than vanity metrics. I set up tracking and analytics to monitor performance in real-time and make data-driven adjustments as needed.

I also believe in the power of brand storytelling. I've helped companies develop compelling brand narratives that resonate with their target audience and differentiate them from competitors. This has led to increased brand awareness and customer loyalty.

For marketing planning, I use an agile approach that allows for quick pivots based on market feedback and performance data. This flexibility has been particularly valuable in rapidly changing market conditions.`,
      secondAnswer: `I believe marketing is most effective when it's integrated across the organization. I work closely with product, sales, and customer success teams to ensure our marketing efforts are aligned with the overall business strategy and customer needs.

I value creativity and innovation in marketing, but I also believe in the importance of data and measurable results. I encourage my team to experiment with new ideas while maintaining a focus on ROI and business impact.

In terms of team collaboration, I foster an environment where everyone feels comfortable sharing ideas and taking calculated risks. I believe the best marketing comes from diverse perspectives and collaborative problem-solving.

I'm particularly interested in your company because of your innovative approach to the market and your commitment to authentic marketing. I believe my skills and experience would complement your team's strengths and help drive continued growth and success.`,
      technicalScore: 7,
      cultureScore: 9,
      communicationScore: 8,
      overallRating: 8,
      notes: "Creative marketer with strong analytical skills. Good understanding of digital marketing channels and brand development."
    },
    {
      interviewId: interviews[4].id,
      firstAnswer: `My sales approach is consultative and relationship-focused. I believe in understanding the client's business challenges first and then positioning our solutions as a way to address those specific needs.

I have a proven track record of exceeding sales targets. In my current role, I've consistently achieved 120-130% of quota for the past three years. Last year, I closed the largest deal in the company's history, worth $1.2 million.

My prospecting strategy combines outbound outreach through LinkedIn and email with inbound lead qualification. I use a personalized approach for each prospect, researching their company thoroughly before reaching out.

For sales presentations, I focus on demonstrating value rather than just listing features. I use case studies and ROI calculations to show prospects how our solution has helped similar companies achieve their goals.

In terms of pipeline management, I maintain a disciplined approach to tracking opportunities and progressing deals through the sales cycle. I use our CRM system effectively to document all client interactions and next steps.`,
      secondAnswer: `I believe the best salespeople are those who genuinely care about helping their clients succeed. I'm motivated by seeing my clients achieve their goals with our solutions, not just by hitting my numbers.

Collaboration is important to me, both within the sales team and across departments. I regularly work with product and customer success teams to ensure we're delivering on our promises and continuously improving our offering.

When faced with challenges or rejection, I maintain a positive attitude and look for learning opportunities. I believe persistence and resilience are key traits for success in sales.

I'm particularly interested in joining your company because of your innovative products and customer-centric approach. I'm excited about the opportunity to represent your solutions and contribute to your continued growth in the market.`,
      technicalScore: 6,
      cultureScore: 8,
      communicationScore: 9,
      overallRating: 8,
      notes: "Excellent communicator with strong sales record. Customer-focused approach aligns well with our values."
    },
    {
      interviewId: interviews[5].id,
      firstAnswer: `In customer success, my primary focus is ensuring our clients achieve their desired outcomes with our product. I start by developing a deep understanding of each client's business objectives and success metrics.

I've implemented customer onboarding programs that reduced time-to-value by 30% and increased product adoption rates. The key was creating personalized onboarding plans based on each client's specific use case and goals.

For customer health monitoring, I use a combination of product usage data, support ticket analysis, and regular check-ins to identify at-risk accounts early. This proactive approach has helped reduce churn by 15% in my previous role.

I've also led customer advocacy initiatives, including case study development, reference programs, and customer advisory boards. These efforts have strengthened client relationships and generated valuable product feedback.

For metrics, I focus on customer satisfaction, net promoter score, product adoption, and retention rates. I believe these indicators provide a comprehensive view of customer success performance.`,
      secondAnswer: `I believe empathy is the most important quality in customer success. Understanding our clients' challenges and perspectives allows us to provide better support and build stronger relationships.

I'm a strong advocate for the customer within the organization. I regularly share customer feedback with product and engineering teams to ensure our roadmap aligns with client needs.

Collaboration across teams is essential for delivering a seamless customer experience. I work closely with sales, support, and product teams to ensure we're all aligned in our approach to customer success.

I'm drawn to your company because of your reputation for exceptional customer service and innovative products. I'm excited about the opportunity to help your clients achieve success and contribute to your company's growth through increased retention and expansion.`,
      technicalScore: 7,
      cultureScore: 9,
      communicationScore: 8,
      overallRating: 8,
      notes: "Customer-focused with strong relationship building skills. Good understanding of customer success metrics and strategies."
    },
    {
      interviewId: interviews[6].id,
      firstAnswer: `As a systems architect, I focus on designing scalable, resilient, and maintainable systems that meet both current requirements and future needs. My approach includes thorough requirement analysis, evaluation of architectural patterns, and consideration of trade-offs between different solutions.

I have extensive experience with distributed systems and microservices architecture. In my current role, I led the design of a high-throughput payment processing system that handles over 10,000 transactions per second with 99.99% uptime.

For cloud architecture, I've worked extensively with AWS services, including EC2, S3, Lambda, DynamoDB, and EKS. I've designed and implemented cloud-native applications that leverage auto-scaling, serverless computing, and containerization.

I'm also experienced in data architecture, including designing data warehouses, data lakes, and real-time processing pipelines. I've worked with technologies like Kafka, Spark, and Snowflake to build scalable data solutions.

In terms of security, I follow the principle of defense in depth, incorporating security at every layer of the architecture. This includes network security, identity and access management, encryption, and secure coding practices.`,
      secondAnswer: `I believe successful architecture requires collaboration and buy-in from all stakeholders. I work closely with product managers to understand business requirements, with developers to ensure the architecture is implementable, and with operations teams to address deployment and monitoring needs.

I'm a strong advocate for documentation and knowledge sharing. I create comprehensive architecture documentation, conduct technical reviews, and mentor junior team members to build a shared understanding of our systems.

I value pragmatism in architecture decisions. While I stay current with industry trends and best practices, I focus on choosing the right solution for our specific context rather than following hype cycles.

I'm excited about your company because of your technical challenges and innovative approach to solving complex problems. I believe my experience in designing scalable systems would be valuable in helping your team build robust, future-proof solutions.`,
      technicalScore: 9,
      cultureScore: 8,
      communicationScore: 7,
      overallRating: 8,
      notes: "Exceptional technical knowledge with strong systems thinking. Would be valuable for our architecture team."
    },
    {
      interviewId: interviews[7].id,
      firstAnswer: `As a data scientist, my approach combines statistical rigor with practical business application. I start each project by clearly defining the problem statement and success metrics in collaboration with stakeholders.

My technical skills include proficiency in Python, R, SQL, and various machine learning frameworks like scikit-learn, TensorFlow, and PyTorch. I'm experienced in supervised and unsupervised learning techniques, as well as deep learning for specific use cases.

In my current role, I developed a customer churn prediction model with 85% accuracy that has helped the company retain high-value customers by identifying at-risk accounts. This has resulted in approximately $2M in saved revenue annually.

I'm also experienced in data visualization and communication, using tools like Tableau and PowerBI to create interactive dashboards that make insights accessible to non-technical stakeholders.

For data preparation and engineering, I've worked with various data processing frameworks, including Pandas, Spark, and Dask for handling large-scale datasets. I'm familiar with data pipeline tools like Airflow for orchestrating workflows.`,
      secondAnswer: `I believe effective data science requires strong collaboration between data scientists, engineers, product managers, and business stakeholders. I make it a priority to build relationships across teams and ensure my work is aligned with business objectives.

I value transparency in my approach and communicate clearly about both the capabilities and limitations of my models. I believe it's important for organizations to understand what data science can and cannot do to set realistic expectations.

I'm passionate about ethical data science and consider the potential impacts of my work, particularly regarding bias, privacy, and fair use. I advocate for responsible AI practices within my organization.

I'm excited about your company because of your data-driven culture and the interesting problems you're solving in your industry. I believe my skills in turning data into actionable insights would be valuable in helping your team make more informed decisions.`,
      technicalScore: 9,
      cultureScore: 8,
      communicationScore: 7,
      overallRating: 8,
      notes: "Strong technical skills in data science and machine learning. Good understanding of how to apply these techniques to business problems."
    },
    {
      interviewId: interviews[8].id,
      firstAnswer: `My approach to operations is centered on creating efficient, scalable processes that support business growth while maintaining quality and compliance. I focus on identifying bottlenecks and implementing continuous improvement initiatives.

I have extensive experience with process optimization methodologies, including Lean, Six Sigma, and Agile. In my current role, I led a process improvement project that reduced order fulfillment time by 40% while improving accuracy rates.

For operations management, I use data-driven decision making to identify opportunities and measure the impact of changes. I've implemented KPI dashboards and reporting systems that provide real-time visibility into operational performance.

I'm also experienced in supply chain management, including vendor selection, contract negotiation, and relationship management. I've worked with global suppliers and implemented just-in-time inventory systems that reduced carrying costs by 25%.

In terms of technology, I've led the implementation of ERP systems, workflow automation tools, and custom operational applications. I believe in leveraging technology to streamline processes and improve efficiency.`,
      secondAnswer: `I believe effective operations requires strong cross-functional collaboration. I work closely with sales, finance, product, and customer service teams to ensure our operational processes support their needs and the overall business strategy.

I value transparency and open communication, particularly when addressing operational challenges. I believe in creating an environment where team members feel comfortable raising issues and suggesting improvements.

My leadership style focuses on setting clear expectations, providing the necessary resources and support, and empowering team members to take ownership of their areas of responsibility. I believe this approach leads to higher engagement and better results.

I'm particularly interested in your company because of your innovative approach to operations and your growth trajectory. I'm excited about the opportunity to help scale your operations efficiently while maintaining the quality that has made your company successful.`,
      technicalScore: 8,
      cultureScore: 8,
      communicationScore: 8,
      overallRating: 8,
      notes: "Strong operations background with experience in process improvement and system implementation. Good leadership qualities."
    },
    {
      interviewId: interviews[9].id,
      firstAnswer: `My approach to HR is strategic and focused on aligning people practices with business objectives. I believe HR should be a true business partner that helps drive organizational performance through effective talent management.

I have experience across the HR spectrum, including recruitment, onboarding, performance management, compensation and benefits, employee relations, and organizational development. In my current role, I redesigned our performance management system to focus on ongoing feedback and development, which increased employee satisfaction with the process by 35%.

For talent acquisition, I've implemented structured interview processes and assessment methods that have improved the quality of hires and reduced time-to-fill by 20%. I focus on both skills and cultural fit to ensure we bring in the right people.

I've also led diversity and inclusion initiatives, including implementing unbiased hiring practices, creating employee resource groups, and developing diversity-focused leadership development programs. These efforts increased diversity in leadership positions by 25% over two years.

In terms of HR analytics, I use data to inform decisions and demonstrate the impact of HR initiatives on business outcomes. I've built dashboards that track key metrics like turnover, engagement, and cost-per-hire.`,
      secondAnswer: `I believe HR plays a critical role in shaping organizational culture. I work closely with leadership to define and reinforce the company's values, mission, and expected behaviors. I also ensure our HR practices and policies reflect and support the desired culture.

I value employee voice and create channels for feedback, including pulse surveys, town halls, and focus groups. I believe understanding employee perspectives is essential for creating a positive work environment.

My approach to difficult situations, like performance issues or conflicts, is direct but compassionate. I focus on finding solutions that are fair to individuals while protecting the organization's interests and culture.

I'm particularly drawn to your company because of your reputation as an employer of choice and your commitment to employee development. I'm excited about the opportunity to help build and sustain a workplace where people can thrive and contribute to your company's success.`,
      technicalScore: 7,
      cultureScore: 9,
      communicationScore: 8,
      overallRating: 8,
      notes: "Strong HR generalist with strategic mindset. Particularly good experience with talent management and organizational culture."
    }
  ]

  // Insert interview answers
  const answers = await prisma.$transaction(
    dummyAnswers.map(answer => 
      prisma.interviewAnswer.create({ data: answer })
    )
  )

  console.log(`Created ${answers.length} interview answers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 