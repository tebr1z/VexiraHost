import type { BlogPostContent, BlogUiCopy } from "./types";

export const blogUiEn: BlogUiCopy = {
  title: "Blog",
  subtitle: "Clear guides on hosting, VPS/VDS, and WhatsApp API.",
  readingTime: "{minutes} min read",
  backToBlog: "All posts",
  allPosts: "All articles",
  readMore: "Read",
  categories: {
    hosting: "Hosting",
    vps: "VPS / VDS",
    whatsapp: "WhatsApp API",
  },
  relatedTitle: "Related posts",
  empty: "No posts in this category yet.",
};

export const blogPostsEn: Record<string, BlogPostContent> = {
  "vps-vs-vds": {
    title: "What is the difference between VPS and VDS? Which should you choose?",
    excerpt:
      "VPS and VDS are often confused. A short explanation, real differences, and what to pick on Vexira.",
    readingMinutes: 6,
    ctaLabel: "View VPS plans",
    body: [
      {
        type: "p",
        text: "Many users get stuck on “Should I get a VPS or a VDS?” In marketing, both names are sometimes used interchangeably; in practice, the right choice depends on your needs.",
      },
      { type: "h2", text: "Quick definitions" },
      {
        type: "ul",
        items: [
          "VPS (Virtual Private Server): a physical server split into virtual partitions. Your own OS, root access, and dedicated resources.",
          "VDS (Virtual Dedicated Server): usually marketed as a more powerful / more isolated virtual server; at some providers it is essentially the same product as VPS.",
        ],
      },
      {
        type: "callout",
        text: "Important: look at the actual CPU, RAM, NVMe disk, traffic, and support terms — not the label. “VDS” in the name does not automatically mean better.",
      },
      { type: "h2", text: "Practical differences" },
      {
        type: "ul",
        items: [
          "Resource guarantee: on a good VPS/VDS, CPU and RAM stay reserved for you; on weak shared hosting, neighbor sites can slow things down.",
          "Management: both typically offer root / administrator access.",
          "Price: with the same specs, the name should not change the price — compare the numbers.",
        ],
      },
      { type: "h2", text: "Who needs VPS, who needs a stronger plan?" },
      {
        type: "ol",
        items: [
          "Small site, bot, test environment, API prototype → a starter VPS is enough.",
          "E-commerce, multiple sites, high traffic, CI/CD → a plan with more RAM/CPU.",
          "If you need full control and your own stack, choose VPS — not shared hosting.",
        ],
      },
      {
        type: "p",
        text: "On Vexira, VPS plans come with NVMe and transparent resources. Whether it is called “VPS” or “VDS”, choose based on cores, memory, and disk capacity that fit your workload.",
      },
    ],
  },

  "shared-hosting-yoxsa-vps": {
    title: "Shared hosting or VPS? Which should you pick?",
    excerpt:
      "One-click panel or full root? A simple decision table by budget, traffic, and technical skill.",
    readingMinutes: 7,
    ctaLabel: "View hosting plans",
    body: [
      {
        type: "p",
        text: "Shared hosting is cheap and simple; VPS gives more power and freedom. The wrong choice means wasted money or a site that is always slow.",
      },
      { type: "h2", text: "When is shared hosting enough?" },
      {
        type: "ul",
        items: [
          "Personal blog, portfolio, small business site",
          "WordPress / ready CMS, users who want cPanel or a similar panel",
          "Moderate monthly visits, no heavy custom backend",
        ],
      },
      { type: "h2", text: "When do you need VPS?" },
      {
        type: "ul",
        items: [
          "Your own Docker, Node, Python, or DB stack",
          "High traffic or sudden load spikes",
          "Running multiple projects on one server",
          "Full control over firewall, cron, and reverse proxy",
        ],
      },
      { type: "h2", text: "Quick decision checklist" },
      {
        type: "ol",
        items: [
          "Want a panel and one-click installs? → start with hosting.",
          "Need root and custom software? → VPS.",
          "Site often returns 503 / loads slowly? → check resources; moving to VPS often fixes it.",
          "Budget is tight? Start with hosting; upgrade to VPS as you grow.",
        ],
      },
      {
        type: "callout",
        text: "On Vexira, both paths are open: simple hosting plans and right-sized VPS. Write down your needs first, then pick a plan — not the other way around.",
      },
    ],
  },

  "hosting-nedir": {
    title: "What is hosting? Who needs it?",
    excerpt:
      "The basics for getting your site online: what hosting is, what it includes, and how to get started.",
    readingMinutes: 5,
    ctaLabel: "Get started with hosting",
    body: [
      {
        type: "p",
        text: "Hosting is where your site files, database, and email live on a server that runs 24/7. Think of your domain as the address and hosting as the home.",
      },
      { type: "h2", text: "What does hosting include?" },
      {
        type: "ul",
        items: [
          "Disk space (ideally NVMe) and bandwidth",
          "SSL certificate (HTTPS)",
          "Often a panel (cPanel/Plesk), email, and backups",
          "Support and an uptime commitment",
        ],
      },
      { type: "h2", text: "Who needs it?" },
      {
        type: "p",
        text: "Everyone — from personal blogs to e-commerce. Running your own physical server makes little sense for most businesses; professional hosting is cheaper, more stable, and more secure.",
      },
      { type: "h2", text: "4 steps to get started" },
      {
        type: "ol",
        items: [
          "Choose a domain or connect an existing one.",
          "Get a hosting plan that matches your needs.",
          "Set up SSL and DNS correctly.",
          "Upload your site and enable backups.",
        ],
      },
      {
        type: "p",
        text: "At Vexira Host, the goal is simple: clear pricing, fast setup, and real support when you need it. Customer satisfaction comes first.",
      },
    ],
  },

  "whatsapp-api-nedir": {
    title: "What is WhatsApp API? What does it do for your business?",
    excerpt:
      "A short introduction to WhatsApp API for automating notifications, order status, and support messages.",
    readingMinutes: 6,
    ctaLabel: "View WhatsApp API packages",
    body: [
      {
        type: "p",
        text: "WhatsApp API lets your software send messages through WhatsApp. Instead of manual chat, you get automated, scalable sending from your systems.",
      },
      { type: "h2", text: "Where is it used?" },
      {
        type: "ul",
        items: [
          "Order confirmation and delivery status",
          "Payment and subscription reminders",
          "OTP and security codes (where policy allows)",
          "Support and CRM notifications",
        ],
      },
      { type: "h2", text: "Why a separate package?" },
      {
        type: "p",
        text: "Message volume, security, and quality control matter. On Vexira, monthly quota is tracked in the panel; after payment, a short review activates the API. Inappropriate and abusive content is blocked.",
      },
      {
        type: "callout",
        text: "Spam and prohibited content hurt both your brand and the infrastructure. Clean, consent-based messaging is the foundation of long-term success.",
      },
      {
        type: "p",
        text: "Choose a package, complete payment, and move to integration with the panel and API documentation.",
      },
    ],
  },

  "wordpress-hosting-vps": {
    title: "Which hosting or VPS fits WordPress?",
    excerpt: "From blog to store: NVMe, PHP resources, and when to move to VPS for WordPress.",
    readingMinutes: 7,
    ctaLabel: "Choose a plan for WordPress",
    body: [
      {
        type: "p",
        text: "WordPress ranges from a light blog to a heavy WooCommerce store. That is why “the cheapest hosting” is not always the right answer.",
      },
      { type: "h2", text: "Small / medium WordPress" },
      {
        type: "ul",
        items: [
          "Good NVMe hosting + SSL is enough",
          "Enable caching (plugin or server level)",
          "Heavy page builder + 40 plugins = slow site; reduce the count",
        ],
      },
      { type: "h2", text: "When to move to VPS?" },
      {
        type: "ul",
        items: [
          "High traffic or flash campaigns",
          "Your own Redis, queue, or separate DB server",
          "Multiple WordPress installs + staging environments",
        ],
      },
      { type: "h2", text: "Practical tips" },
      {
        type: "ol",
        items: [
          "Always use HTTPS (SSL).",
          "Verify automatic backups work.",
          "Keep PHP and WordPress updated; outdated plugins are a security risk.",
          "Optimize image sizes — the hosting may not be “slow”; the content might be heavy.",
        ],
      },
      {
        type: "p",
        text: "On Vexira, you can start WordPress on hosting and move to VPS as you grow. Staying in the same ecosystem makes migration easier.",
      },
    ],
  },

  "whatsapp-api-rest-limitler": {
    title: "WhatsApp API: REST sending, limits, and activation",
    excerpt:
      "Short review after payment, monthly message quota, and the REST API send flow — step by step.",
    readingMinutes: 6,
    ctaLabel: "Go to API panel",
    body: [
      {
        type: "p",
        text: "Vexira WhatsApp API packages are for sending messages via REST. The flow is simple: buy a package → pay → short review → send with your API key.",
      },
      { type: "h2", text: "How does activation work?" },
      {
        type: "ol",
        items: [
          "Choose a monthly message package from products and complete payment.",
          "Payment is accepted; the team runs a short review.",
          "After approval, the service appears in the panel and API access opens.",
          "Create an API key and send requests per the documentation.",
        ],
      },
      { type: "h2", text: "Limits" },
      {
        type: "ul",
        items: [
          "Each package has a monthly message limit; usage is tracked in the panel.",
          "When the limit is reached, sending stops — you need an add-on or upgrade.",
          "Inappropriate language and abusive content may be blocked automatically.",
        ],
      },
      {
        type: "callout",
        text: "We show the full API key only once. Store it in a secret manager; do not commit it to a public repo.",
      },
      {
        type: "p",
        text: "See the API documentation in your customer panel for detailed endpoints.",
      },
    ],
  },

  "vps-cpu-ram-nvme": {
    title: "How to read CPU, RAM, and NVMe when choosing VPS?",
    excerpt:
      "Read the numbers for your workload, not marketing: what vCPU, RAM, and NVMe actually affect.",
    readingMinutes: 7,
    ctaLabel: "View VPS configuration",
    body: [
      {
        type: "p",
        text: "Numbers on a VPS table can look intimidating. In practice, three columns matter most: CPU, RAM, and disk type (NVMe).",
      },
      { type: "h2", text: "CPU (vCPU)" },
      {
        type: "p",
        text: "Compute power. More concurrent work (builds, video, heavy queries) needs more cores. For a simple site or API, 2–4 vCPU is often enough.",
      },
      { type: "h2", text: "RAM" },
      {
        type: "p",
        text: "Processes and cache running at the same time. If database and app share one machine, RAM runs out fast. Half of “it is slow” complaints are really insufficient RAM.",
      },
      { type: "h2", text: "NVMe disk" },
      {
        type: "p",
        text: "Much faster read/write than older HDD or SATA SSD. For WordPress, databases, and logs, NVMe makes a noticeable difference.",
      },
      { type: "h2", text: "Simple sizing guide" },
      {
        type: "ul",
        items: [
          "Blog / staging: light CPU + 2–4 GB RAM + NVMe",
          "Small production API: 2–4 vCPU + 4–8 GB RAM",
          "E-commerce / multiple services: 4+ vCPU + 8+ GB RAM",
        ],
      },
      {
        type: "p",
        text: "On Vexira VPS plans, resources are shown clearly. Look at measurable configuration — not inflated “unlimited” promises.",
      },
    ],
  },

  "uptime-ssl-backup": {
    title: "Uptime, SSL, and backup: what really matters in hosting?",
    excerpt:
      "Three real criteria instead of flashy marketing: staying online, HTTPS, and restorable backups.",
    readingMinutes: 6,
    ctaLabel: "Switch to reliable hosting",
    body: [
      {
        type: "p",
        text: "Before the price table, ask three questions: does the site stay up? Is traffic encrypted? Can you recover if something goes wrong?",
      },
      { type: "h2", text: "Uptime" },
      {
        type: "p",
        text: "Uptime SLA is the commitment to keep the service available. 99.99% is a strong target; what matters equally is real monitoring and how support responds.",
      },
      { type: "h2", text: "SSL" },
      {
        type: "p",
        text: "Without SSL, browsers warn visitors, SEO suffers, and payment forms lose trust. Free or included SSL is standard today — make sure it is active.",
      },
      { type: "h2", text: "Backup" },
      {
        type: "ul",
        items: [
          "Is automatic backup included?",
          "How far back can you restore?",
          "Can you restore from the panel yourself?",
        ],
      },
      {
        type: "callout",
        text: "Without backups, “cheap hosting” can become an expensive lesson in one click. Recovery plan first, campaigns second.",
      },
      {
        type: "p",
        text: "At Vexira, infrastructure and support rest on three pillars: stability, HTTPS, and protecting customer data. Ask about these when you choose a plan.",
      },
    ],
  },
};
