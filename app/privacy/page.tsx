export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <article className="prose prose-invert max-w-none">
        <h1 className="text-4xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-slate-400">Last updated: March 9, 2026</p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
            <p className="mt-3 text-slate-300">
              Smart Reply Pro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
            <p className="mt-3 text-slate-300">
              We may collect information about you in a variety of ways. The information we may collect on the Site includes:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">
                <strong>Personal Data:</strong> Email address, username, password, and profile information you provide during registration
              </li>
              <li className="ml-4 list-disc">
                <strong>Usage Data:</strong> Information about how you interact with our services, including features used and replies generated
              </li>
              <li className="ml-4 list-disc">
                <strong>Device Data:</strong> IP address, browser type, operating system, and device identifiers
              </li>
              <li className="ml-4 list-disc">
                <strong>Communication Content:</strong> Messages and replies you create within our platform (used only to provide services)
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">3. How We Use Your Information</h2>
            <p className="mt-3 text-slate-300">
              We use the information we collect to:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Provide, maintain, and improve our services</li>
              <li className="ml-4 list-disc">Process your account registration and transactions</li>
              <li className="ml-4 list-disc">Send transactional and promotional communications</li>
              <li className="ml-4 list-disc">Analyze usage patterns to enhance user experience</li>
              <li className="ml-4 list-disc">Comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">4. Data Security</h2>
            <p className="mt-3 text-slate-300">
              We implement appropriate technical and organizational measures designed to secure your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">5. Third-Party Services</h2>
            <p className="mt-3 text-slate-300">
              We may use third-party services (such as Supabase for authentication and database services, OpenAI for content generation, and Stripe for payment processing) that collect information used to provide our services. We encourage you to review their privacy policies.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">6. Your Rights</h2>
            <p className="mt-3 text-slate-300">
              Depending on your location, you may have rights including:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Right to access your personal data</li>
              <li className="ml-4 list-disc">Right to correct inaccurate data</li>
              <li className="ml-4 list-disc">Right to request deletion of your data</li>
              <li className="ml-4 list-disc">Right to data portability</li>
              <li className="ml-4 list-disc">Right to withdraw consent</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">7. Contact Us</h2>
            <p className="mt-3 text-slate-300">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-3 text-slate-300">
              Email: <a href="mailto:owner@smartreplypro.com" className="text-sky-400 hover:text-sky-300">owner@smartreplypro.com</a>
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
