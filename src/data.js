// Single source of truth for all copy. Also imported by scripts/postbuild.mjs for per-page SEO.

export const SITE = {
  name: "Vishal Jadhav",
  role: "AI, Full Stack & Cyber Security Engineer",
  location: "Pune, Maharashtra, India",
  email: "vj042459@gmail.com",
  phone: "+91 95274 73987",
  phoneHref: "tel:+919527473987",
  company: "MotionPix Cinematix India Pvt Ltd",
  summary:
    "Full stack engineer with 10 months of production experience at MotionPix Cinematix India, delivering client websites from frontend to backend, API integration, CI/CD, deployment and SEO. I work across the MERN stack with MySQL, add AI assistants where they help, and build 3D and motion-driven interfaces with Three.js, GSAP and Framer Motion. I also work in cyber security as a red and blue team analyst: finding weaknesses the way an attacker would, then hardening and monitoring systems the way a defender does. I hold a B.Sc. in Computer Science (CGPA 8.25) and enjoy owning a feature from design to live release.",
};

export const seo = {
  "/": {
    title: "Vishal Jadhav Pune | AI, Full Stack & Cyber Security Engineer",
    description:
      "Vishal Jadhav is an AI, full stack and cyber security engineer based in Pune, India. He builds MERN stack products, integrates AI assistants, and works as a red and blue team analyst.",
  },
  "/about": {
    title: "About Vishal Jadhav | AI, Full Stack & Cyber Security Engineer",
    description:
      "10 months of production experience at MotionPix Cinematix India, a B.Sc. in Computer Science (CGPA 8.25) and a toolkit spanning React, Node.js, MySQL, AI integration and red and blue team security.",
  },
  "/projects": {
    title: "Projects | Vishal Jadhav",
    description:
      "Production websites built by Vishal Jadhav: MotionPix India, Abhiyanta India Design Lab and Mechatrix, using React, Node.js, Express, MySQL and Tailwind CSS.",
  },
  "/faq": {
    title: "FAQ | Vishal Jadhav",
    description:
      "Answers about Vishal Jadhav's experience, AI assistant integration, cyber security work, tech stack, project delivery and how to get in touch.",
  },
  "/contact": {
    title: "Contact Vishal Jadhav | Hire a Full Stack, AI & Cyber Security Engineer",
    description:
      "Send an inquiry to Vishal Jadhav for website design and development, mobile apps, AI development, full stack work, SEO, software development or cyber security.",
  },
};

/** Routes that are never indexed. */
export const privateRoutes = ["/admin"];

/** Inquiry options. The value is stored in MySQL, so keep values stable. */
export const services = [
  { value: "website", label: "Website design / development" },
  { value: "mobile-app", label: "Mobile app development" },
  { value: "ai", label: "AI development" },
  { value: "full-stack", label: "Full stack development" },
  { value: "frontend-backend", label: "Frontend / backend development" },
  { value: "seo", label: "SEO development" },
  { value: "software", label: "Software development" },
  { value: "cyber-security", label: "Cyber security (red / blue team)" },
  { value: "other", label: "Something else" },
];

export const projects = [
  {
    id: "abhiyanta",
    title: "Abhiyanta India Design Lab",
    kind: "Frontend",
    status: "Live on Netlify",
    url: "https://abhiyantaindiadesignlabpune.netlify.app",
    summary:
      "A responsive website for the Pune design lab that presents its services, work and contact details clearly.",
    points: [
      "Intuitive, polished layout built for desktop and mobile",
      "Reusable components and clean code for quick updates",
    ],
    stack: ["React.js", "Tailwind CSS", "JavaScript (ES6+)", "Netlify"],
    tone: "accent",
    layout: 1,
  },
  {
    id: "motionpix",
    title: "MotionPix India Website",
    kind: "Full Stack",
    status: "Live in production",
    url: "https://www.motionpixindia.com",
    summary:
      "The complete company website, built end to end: responsive frontend, backend services, REST API integration and an AI assistant for visitors.",
    points: [
      "CI/CD pipeline and production deployment",
      "On-page and technical SEO for search visibility",
      "MotionPix AI Assistant answers visitor questions in real time",
    ],
    stack: ["React.js", "Node.js", "Express.js", "MySQL", "REST APIs", "CI/CD", "SEO"],
    tone: "spark",
    layout: 2,
  },
  {
    id: "mechatrix",
    title: "Mechatrix Website",
    kind: "Frontend",
    status: "Preview live, production launch in progress",
    url: "https://mechatrix.netlify.app",
    summary:
      "A modern, fully responsive corporate website with a clean, professional interface.",
    points: [
      "Reusable components and structured layouts",
      "Optimised for fast load times and cross-browser support",
    ],
    stack: ["React.js", "Tailwind CSS", "JavaScript (ES6+)", "Netlify"],
    tone: "ink",
    layout: 3,
  },
];

export const security = {
  title: "Red team and blue team, in one engineer",
  text: "I build the product, then I attack it. Knowing how a breach happens makes the defence better, and knowing the defence makes the test more useful.",
  red: {
    title: "Red team",
    tagline: "Think like the attacker",
    points: [
      "Reconnaissance and OSINT",
      "Web application testing against the OWASP Top 10",
      "Vulnerability assessment within an authorised scope",
      "Clear reports with risk ratings and fixes",
    ],
    tools: ["Kali Linux", "Nmap", "Burp Suite", "Metasploit", "OWASP ZAP"],
  },
  blue: {
    title: "Blue team",
    tagline: "Think like the defender",
    points: [
      "Log analysis and threat hunting",
      "Detection and incident response",
      "Hardening servers, APIs and databases",
      "Secure deployment with CI/CD checks",
    ],
    tools: ["Wireshark", "Splunk / ELK", "Wazuh", "Suricata", "MITRE ATT&CK"],
  },
};

export const skills = [
  { icon: "code", title: "Languages", tags: ["JavaScript (ES6+)", "Java", "C", "C++", "SQL", "Objective-C"] },
  { icon: "layout", title: "Frontend", tags: ["React.js", "HTML5", "CSS3", "Bootstrap", "Tailwind CSS"] },
  { icon: "server", title: "Backend & APIs", tags: ["Node.js", "Express.js", "RESTful APIs"] },
  { icon: "database", title: "Databases", tags: ["MySQL", "PostgreSQL", "MongoDB"] },
  { icon: "cube", title: "Animation & 3D", tags: ["Three.js", "GSAP", "Framer Motion", "Matter.js"] },
  { icon: "cycle", title: "Tools & DevOps", tags: ["Git", "GitHub", "VS Code", "Postman", "CI/CD", "Netlify"] },
  { icon: "shield", title: "Cyber security: red team", tags: security.red.tools },
  { icon: "lock", title: "Cyber security: blue team", tags: security.blue.tools },
  { icon: "chip", title: "AI integration", tags: ["AI assistant integration", "REST API integration"] },
  { icon: "search", title: "Core strengths", tags: ["Full stack development", "Problem solving", "Database management", "SEO"] },
];

export const experience = {
  company: "MotionPix Cinematix India Pvt Ltd",
  place: "Lokmanya Nagar, Pune",
  role: "Software / Web Developer (Frontend & Full Stack)",
  period: "Jan 2026 to present (10 months)",
  points: [
    "Built and maintained production web applications for MotionPix, Abhiyanta, Mechatrix and the Catalogue Booklet Software.",
    "Designed responsive, user-friendly interfaces using React.js, HTML5, CSS3, Bootstrap, Tailwind CSS and JavaScript (ES6+).",
    "Developed full-stack features on the MERN architecture, using MySQL as the primary relational database.",
    "Created RESTful APIs and backend services with Node.js and Express.js.",
    "Delivered immersive 3D and interactive experiences with Three.js, GSAP, Framer Motion and Matter.js.",
    "Integrated frontend and backend modules for smooth data flow, performance and scalability.",
    "Collaborated on new features, performance optimisation, debugging and testing, with cross-browser compatibility.",
  ],
};

export const education = [
  { title: "Bachelor of Computer Science", place: "P.V.G. College of Science, Pune", period: "Jun 2021 to Jun 2024", score: "CGPA 8.25" },
  { title: "Higher Secondary Education", place: "MIT Junior College, Pune", period: "Jun 2019 to Jun 2021", score: "72.80%" },
  { title: "Secondary Education", place: "New English School, Tilak Road, Pune", period: "Jun 2013 to Mar 2019", score: "73.40%" },
];

export const approach = [
  {
    icon: "chip",
    title: "AI that answers real questions",
    text: "I integrate assistants that help visitors, like the MotionPix AI Assistant that responds about the company's services in real time.",
  },
  {
    icon: "server",
    title: "Full stack foundations",
    text: "React interfaces on Node.js and Express APIs, backed by MySQL and shipped with CI/CD and technical SEO.",
  },
  {
    icon: "cube",
    title: "Motion with a purpose",
    text: "Three.js, GSAP and Framer Motion add depth and feedback to an interface without slowing the page down.",
  },
  {
    icon: "shield",
    title: "Secure by default",
    text: "Input validation, rate limiting, hashed credentials and secure headers go in from the first commit, then get tested like an attacker would.",
  },
];

export const techWords = [
  "React.js", "Node.js", "Express.js", "MySQL", "MongoDB", "Three.js",
  "GSAP", "Framer Motion", "Matter.js", "Tailwind CSS", "CI/CD", "SEO",
  "Red Team", "Blue Team", "OWASP", "Pentesting",
];

export const faq = [
  {
    q: "What kind of work do you do?",
    a: "I build full stack web products: responsive React interfaces, Node.js and Express APIs, MySQL databases, and the deployment, CI/CD and SEO work that gets them live.",
  },
  {
    q: "Have you built AI features?",
    a: "Yes. On motionpixindia.com I integrated the MotionPix AI Assistant, a chatbot that answers visitor questions about the company's services in real time.",
  },
  {
    q: "Which technologies do you use most?",
    a: "React.js, Node.js, Express.js and MySQL for the core stack, Tailwind CSS for styling, and Three.js, GSAP, Framer Motion and Matter.js for 3D and motion.",
  },
  {
    q: "Can you take a project from idea to launch?",
    a: "Yes. I built the MotionPix India website end to end, from the frontend and backend services to REST API integration, CI/CD, production deployment and SEO.",
  },
  {
    q: "How much experience do you have?",
    a: "I have 10 months of production experience as a Software and Web Developer at MotionPix Cinematix India Pvt Ltd in Pune, since January 2026. I also hold a B.Sc. in Computer Science with a CGPA of 8.25.",
  },
  {
    q: "Do you work in cyber security?",
    a: "Yes. I work as a red and blue team analyst: testing applications the way an attacker would, then hardening, monitoring and responding the way a defender does. I apply the same mindset to the products I build.",
  },
  {
    q: "What services can I hire you for?",
    a: "Website design and development, mobile apps, AI development, full stack development, frontend and backend work, SEO, software development and cyber security assessments. Use the contact form and pick the one that fits.",
  },
  {
    q: "Which languages do you speak?",
    a: "English, Hindi and Marathi.",
  },
  {
    q: "How can I contact you?",
    a: "Use the contact form on this site, email vj042459@gmail.com or call +91 95274 73987. I am based in Pune, Maharashtra.",
  },
];
