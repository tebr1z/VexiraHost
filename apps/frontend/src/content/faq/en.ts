import type { FaqPageContent } from "./types";

export const faqEn: FaqPageContent = {
  title: "Frequently Asked Questions",
  subtitle: "Detailed answers about Vexira Host services",
  intro:
    "Find answers to the most common questions about our web hosting, VPS/VDS, domains, licenses, VPN, n8n server, and file deploy services below. If you cannot find what you are looking for, contact our 24/7 support team.",
  contactCta: "Create a support ticket",
  contactLink: "/dashboard/tickets/new",
  categories: [
    {
      id: "general",
      title: "About Vexira Host",
      items: [
        {
          id: "general-1",
          question: "What is Vexira Host and who is it for?",
          answer:
            "Vexira Host is a cloud infrastructure platform offering web hosting, VPS/VDS, domains, software licenses (Windows, Office, antivirus), VPN, n8n automation servers, and file deploy solutions.\nIt is designed for users of every scale, from personal blogs and e-commerce sites to agency projects and enterprise applications.",
        },
        {
          id: "general-2",
          question: "Which services can I manage from a single panel?",
          answer:
            "From your customer panel, you can manage hosting accounts, servers, domains, orders, invoices, and support tickets in one place.\nTo purchase new services, add items from the catalog to your cart and complete the order through a secure checkout process.",
        },
        {
          id: "general-3",
          question: "Do you offer an uptime guarantee?",
          answer:
            "Our infrastructure is managed with a 99.9% uptime target, using redundant power, network connectivity, and proactive monitoring systems.\nPlanned maintenance is scheduled during low-traffic hours whenever possible and announced in advance.",
        },
        {
          id: "general-4",
          question: "Where is my data stored?",
          answer:
            "Depending on the service type, your data is stored in secure data center infrastructure through isolated accounts and encrypted connections.\nBackup, access logs, and firewall layers are enabled according to your service package.",
        },
        {
          id: "general-5",
          question: "Do you provide setup support for beginners?",
          answer:
            "Yes. On hosting plans we offer one-click WordPress/CMS installation, free site migration, and step-by-step panel guides.\nFor servers and custom solutions, technical consulting and setup support are provided based on your needs.",
        },
      ],
    },
    {
      id: "hosting",
      title: "Web Hosting",
      items: [
        {
          id: "hosting-1",
          question: "What is included in your web hosting plans?",
          answer:
            "Our plans include NVMe storage, free SSL, email accounts, cPanel or Plesk control panel, weekly automatic backups, and 24/7 support.\nDisk space, bandwidth, domain, and mailbox limits increase with plan level.",
        },
        {
          id: "hosting-2",
          question: "Should I use cPanel or Plesk?",
          answer:
            "cPanel offers a fast and familiar interface for common PHP/WordPress projects.\nPlesk provides strong options for Windows/.NET and multi-site management; the appropriate panel is assigned to your plan at checkout.",
        },
        {
          id: "hosting-3",
          question: "Do you offer free site migration?",
          answer:
            "Yes, we offer free site migration on eligible hosting plans.\nFiles, databases, and email accounts from your previous hosting provider are securely transferred by our expert team.",
        },
        {
          id: "hosting-4",
          question: "Can I install WordPress and other CMS platforms?",
          answer:
            "You can install WordPress, Joomla, Drupal, and other popular CMS platforms with one click from the control panel.\nYour site stays securely online with automatic updates, SSL, and backups.",
        },
        {
          id: "hosting-5",
          question: "How long does it take for my hosting account to become active?",
          answer:
            "After payment confirmation, your hosting account is usually created automatically within a few minutes.\nYou can track setup status live from your customer panel and access your panel credentials once completed.",
        },
        {
          id: "hosting-6",
          question: "Is email hosting included?",
          answer:
            "Yes, depending on your plan you can create professional email accounts, access them via webmail, and manage your DNS records.\nSPF, DKIM, and basic spam filtering settings can be configured from the panel.",
        },
      ],
    },
    {
      id: "servers",
      title: "VPS, VDS and Server Services",
      items: [
        {
          id: "servers-1",
          question: "What is the difference between VPS and VDS?",
          answer:
            "VPS (Virtual Private Server) is a virtualized, scalable, and cost-effective solution on shared resources.\nVDS (Virtual Dedicated Server) offers more isolated resources and consistent performance, making it ideal for high-traffic applications.",
        },
        {
          id: "servers-2",
          question: "Do I get root access to my server?",
          answer:
            "VPS and VDS plans provide full root (administrator) access.\nYou can install your preferred operating system, deploy custom software stacks, and manage your own security configuration.",
        },
        {
          id: "servers-3",
          question: "Can I upgrade server resources later?",
          answer:
            "Yes, you can upgrade CPU, RAM, and disk resources as your needs grow.\nThe upgrade process is completed quickly depending on your plan and infrastructure availability, with a goal of transitioning without data loss.",
        },
        {
          id: "servers-4",
          question: "Which operating systems are supported?",
          answer:
            "Linux distributions (Ubuntu, Debian, AlmaLinux, etc.) and Windows Server editions are available.\nYou can select your preferred OS image during setup or upload your own custom image.",
        },
        {
          id: "servers-5",
          question: "How does server backup work?",
          answer:
            "Automatic snapshot and backup options are offered according to your plan.\nYou can define additional backup policies for critical data and initiate restore operations from the panel.",
        },
      ],
    },
    {
      id: "domains",
      title: "Domains and DNS",
      items: [
        {
          id: "domains-1",
          question: "Can I register and transfer domains?",
          answer:
            "Yes, we offer domain search, registration, and transfer services for .com, .net, .org, and hundreds of TLDs.\nFor transfers, you can start the process from the panel using the EPP/auth code from your current registrar.",
        },
        {
          id: "domains-2",
          question: "Where do I manage DNS records?",
          answer:
            "Domain DNS management is done from your customer panel; you can edit A, AAAA, CNAME, MX, TXT, and NS records.\nChanges typically propagate globally within a few minutes to a few hours, depending on TTL.",
        },
        {
          id: "domains-3",
          question: "Is WHOIS privacy available?",
          answer:
            "WHOIS privacy protection is offered for supported TLDs.\nYour personal contact information is hidden from public WHOIS lookups.",
        },
        {
          id: "domains-4",
          question: "Will I receive reminders before my domain expires?",
          answer:
            "Yes, email notifications are sent as your domain renewal date approaches.\nYou can enable auto-renewal to reduce the risk of losing your domain.",
        },
      ],
    },
    {
      id: "licenses",
      title: "Software Licenses",
      items: [
        {
          id: "licenses-1",
          question: "Which licenses do you sell?",
          answer:
            "We offer Windows Server, Microsoft Office, antivirus (Kaspersky, ESET, etc.), and other enterprise software licenses.\nThe current product list and prices are categorized on the pricing page.",
        },
        {
          id: "licenses-2",
          question: "How long does license delivery take?",
          answer:
            "Digital licenses are usually delivered via email or the panel within minutes after payment confirmation.\nFor enterprise and bulk license orders, delivery time may vary depending on the product type.",
        },
        {
          id: "licenses-3",
          question: "Are my licenses legal and genuine?",
          answer:
            "All licenses are sourced through authorized distributor channels and original activation keys are provided.\nYour invoices and license documents are stored in your customer panel.",
        },
        {
          id: "licenses-4",
          question: "Can I renew or upgrade my license?",
          answer:
            "You can request renewal or upgrade to a higher edition before your current license expires.\nOur support team will guide you step by step through the transition process.",
        },
      ],
    },
    {
      id: "special",
      title: "VPN, n8n and File Deploy",
      items: [
        {
          id: "special-1",
          question: "What is your VPN server service for?",
          answer:
            "With your dedicated VPN server, you gain secure remote access, encrypted connections, and the ability to bypass geographic restrictions.\nSetup, protocol selection (WireGuard, OpenVPN, etc.), and user management are configured according to your needs.",
        },
        {
          id: "special-2",
          question: "What is an n8n server?",
          answer:
            "n8n is an open-source platform that lets you build workflow automation without writing code.\nYour Vexira Host n8n server is delivered pre-configured; you can set up API integrations, webhooks, and scheduled tasks.",
        },
        {
          id: "special-3",
          question: "How does the file deploy service work?",
          answer:
            "You can upload your application files directly to the server and go live quickly.\nDeploy options via Git, FTP/SFTP, or the panel are offered based on your project structure.",
        },
        {
          id: "special-4",
          question: "Is technical support available for these special services?",
          answer:
            "Yes, post-setup configuration and troubleshooting support is provided for VPN, n8n, and deploy services.\nYou can open a 24/7 support ticket to get help from our expert team.",
        },
      ],
    },
    {
      id: "billing",
      title: "Payment, Billing and Refunds",
      items: [
        {
          id: "billing-1",
          question: "Which payment methods do you accept?",
          answer:
            "Credit cards, debit cards, and other supported online payment methods are accepted.\nInvoice-based payment options may be available for corporate customers.",
        },
        {
          id: "billing-2",
          question: "How does the 30-day money-back guarantee work?",
          answer:
            "On eligible hosting plans, you can request a refund within the first 30 days if you are not satisfied, subject to terms and conditions.\nUsed domain registrations and third-party license costs may be excluded from the refund scope.",
        },
        {
          id: "billing-3",
          question: "Where can I view my invoices?",
          answer:
            "All your invoices are listed in your customer panel; you can download them as PDF and track your payment history.\nPayment reminders are sent by email.",
        },
        {
          id: "billing-4",
          question: "Is auto-renewal available?",
          answer:
            "Auto-renewal can be enabled to keep your services running without interruption.\nYou can disable auto-renewal or update your payment method at any time from the panel.",
        },
        {
          id: "billing-5",
          question: "I want to cancel my plan, what should I do?",
          answer:
            "You can submit a service cancellation request from your customer panel.\nYour service remains active until the end of the billing period, and sufficient time is provided for you to back up your data.",
        },
      ],
    },
    {
      id: "account",
      title: "Account and Security",
      items: [
        {
          id: "account-1",
          question: "How do I create an account?",
          answer:
            "Click the Sign Up button on the homepage to create an account with your email and password.\nAfter email verification is complete, you gain access to all services.",
        },
        {
          id: "account-2",
          question: "I forgot my password, what should I do?",
          answer:
            "Use the Forgot Password link on the login page to send a reset link to your email address.\nThe link is valid for a limited time; submit a new request if it has expired.",
        },
        {
          id: "account-3",
          question: "How do I keep my account secure?",
          answer:
            "Use a strong and unique password, complete your email verification, and report suspicious activity to the support team immediately.\nWe recommend using two-factor authentication (2FA) whenever possible.",
        },
        {
          id: "account-4",
          question: "Why does my session expire?",
          answer:
            "For security reasons, your session is terminated after a period of inactivity.\nYou can log in again and continue where you left off.",
        },
      ],
    },
    {
      id: "support",
      title: "Support and Technical Help",
      items: [
        {
          id: "support-1",
          question: "How do I reach the support team?",
          answer:
            "You can open a 24/7 support ticket from your customer panel.\nPriority support plans are available for urgent situations.",
        },
        {
          id: "support-2",
          question: "How quickly are support tickets answered?",
          answer:
            "Standard tickets are usually answered within a few hours; critical infrastructure issues are prioritized.\nResolution time may vary depending on workload and request complexity.",
        },
        {
          id: "support-3",
          question: "Is site migration support free?",
          answer:
            "Site migration is free on eligible hosting plans.\nCustom quotes may be offered for dedicated servers or large-scale migration projects.",
        },
        {
          id: "support-4",
          question: "Is there protection against DDoS and security attacks?",
          answer:
            "Basic DDoS filtering and firewall layers are active in our infrastructure.\nAdditional protection packages may be available for high-risk projects.",
        },
        {
          id: "support-5",
          question: "How is an SSL certificate installed?",
          answer:
            "Let's Encrypt SSL is free and installed automatically on hosting plans.\nContact our support team for enterprise EV/OV certificates.",
        },
      ],
    },
  ],
};
