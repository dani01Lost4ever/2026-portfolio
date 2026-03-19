export interface Project {
  id: string
  slug: string
  year: string
  title: string
  subtitle: string
  description: string
  overview: string
  challenge: string
  solution: string
  tags: string[]
  gradient: string
  results: { value: string; label: string }[]
  role: string
  timeline: string
  link?: string
}

export const projects: Project[] = [
  {
    id: '01',
    slug: 'project-alpha',
    year: '2025',
    title: 'Project Alpha',
    subtitle: 'SaaS collaboration platform',
    description:
      'A SaaS platform for team collaboration with real-time features and a clean, accessible interface.',
    overview:
      'Project Alpha is a real-time collaboration platform designed to help distributed teams work together more effectively. The product brings together task management, live document editing, and async video messaging under a unified, minimal interface.',
    challenge:
      'The existing tools teams used were fragmented — they relied on 4–5 separate apps for tasks, docs, chat, and meetings. Context switching was killing productivity. The challenge was to unify these workflows without overwhelming users with a bloated feature set.',
    solution:
      'We designed around a single core concept: the "Room" — a shared space for everything related to a project. Rooms contain tasks, docs, and a thread. The UI was kept intentionally minimal with progressive disclosure so power features never got in the way of basic use.',
    tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'WebSockets', 'Figma'],
    gradient: 'linear-gradient(135deg, #5465ff 0%, #9b59b6 100%)',
    results: [
      { value: '3×', label: 'Faster onboarding' },
      { value: '98%', label: 'User satisfaction' },
      { value: '40%', label: 'Reduced churn' },
    ],
    role: 'Design & Development',
    timeline: '6 months',
    link: '#',
  },
  {
    id: '02',
    slug: 'ecommerce-redesign',
    year: '2025',
    title: 'E-Commerce Redesign',
    subtitle: 'Full redesign & rebuild of a retail platform',
    description:
      'Full redesign and rebuild of an e-commerce platform, improving conversion rates and performance.',
    overview:
      'A mid-size fashion retailer needed a complete overhaul of their online store. The old site was slow, visually dated, and had a checkout flow that leaked customers at every step. We rebuilt it from the ground up with performance and conversion as core design constraints.',
    challenge:
      'The original platform was a heavily customized Magento install with years of technical debt. Page load times averaged 7 seconds on mobile, and the checkout funnel had a 78% drop-off rate. We needed to move fast without losing the existing catalog of 8,000+ SKUs.',
    solution:
      'We migrated to a headless architecture with Next.js on the frontend and a new composable commerce backend. We redesigned the entire purchase funnel, reducing checkout to 3 steps. Image optimization and a CDN strategy brought mobile load times down under 1.5 seconds.',
    tags: ['Next.js', 'TypeScript', 'Tailwind', 'Stripe', 'Sanity', 'Vercel'],
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    results: [
      { value: '+62%', label: 'Conversion rate' },
      { value: '1.4s', label: 'Mobile load time' },
      { value: '+180%', label: 'Mobile revenue' },
    ],
    role: 'Lead Developer',
    timeline: '4 months',
    link: '#',
  },
  {
    id: '03',
    slug: 'mobile-banking',
    year: '2024',
    title: 'Mobile Banking App',
    subtitle: 'Consumer banking redesign for iOS & Android',
    description:
      'A modern mobile banking experience with an emphasis on clarity, speed, and security.',
    overview:
      'A regional bank needed to compete with neobanks that were pulling away their younger customers. We redesigned their mobile app from the ground up — building a consumer banking experience that felt modern, fast, and trustworthy.',
    challenge:
      'Traditional banking apps are notoriously complex and fear-inducing. Users avoid checking their balance because the experience is so unpleasant. Meanwhile, regulatory requirements and legacy backend systems added hard constraints to what was technically possible.',
    solution:
      'We prioritised a "clarity-first" design language — every screen shows exactly one piece of information with clear actions. We introduced a spending insights view that proactively surfaces relevant data without the user needing to dig for it. The entire app was rebuilt in React Native with biometric auth and end-to-end encryption.',
    tags: ['React Native', 'TypeScript', 'REST API', 'Figma', 'Biometrics'],
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    results: [
      { value: '4.8★', label: 'App store rating' },
      { value: '+210%', label: 'Daily active users' },
      { value: '55%', label: 'Support tickets down' },
    ],
    role: 'Design & Development',
    timeline: '8 months',
  },
  {
    id: '04',
    slug: 'design-system',
    year: '2024',
    title: 'Design System',
    subtitle: 'Multi-brand component library & token system',
    description:
      'A comprehensive design system and component library used across multiple products.',
    overview:
      'Five products, three teams, zero consistency. After a merger, our design and engineering org was fragmented across separate codebases and Figma libraries. We built a unified design system — from design tokens and Figma components to a fully documented React library deployed to npm.',
    challenge:
      'Aligning five product teams on a shared system without grinding their delivery to a halt. Each team had different design sensibilities, different tech stacks, and different timelines. Getting buy-in was as hard as the technical work itself.',
    solution:
      'We started with the token layer — colours, spacing, typography — which gave us quick wins visible in every product. We then built a component library in Storybook with full accessibility coverage, and ran adoption workshops with each team. The system is now the foundation for all new feature development across the org.',
    tags: ['Figma', 'React', 'TypeScript', 'Storybook', 'CSS-in-JS', 'npm'],
    gradient: 'linear-gradient(135deg, #a8ff40 0%, #38f9d7 100%)',
    results: [
      { value: '5×', label: 'Products using system' },
      { value: '60%', label: 'Faster feature delivery' },
      { value: '100%', label: 'WCAG AA compliant' },
    ],
    role: 'Design Systems Lead',
    timeline: '12 months',
  },
]
