export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <article className="prose prose-invert max-w-none">
        <h1 className="text-4xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-slate-400">Last updated: April 5, 2026</p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
            <p className="mt-3 text-slate-300">
              Smart Reply Pro (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>What We Do:</strong> Smart Reply Pro is a strategic AI communication workspace. We process incoming messages you paste into our service to generate AI-suggested replies. You review those suggestions before sending them anywhere—we never post, send, or share messages on your behalf.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
            <p className="mt-3 text-slate-300">
              We may collect information about you in a variety of ways. The information we may collect on the Site includes:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">
                <strong>Account Data:</strong> Email address, username, password, profile settings, and any username customizations you choose
              </li>
              <li className="ml-4 list-disc">
                <strong>Message Input Data:</strong> Messages and context you paste into the platform for reply generation (processed temporarily to generate suggestions; not used for training or shared with third parties beyond our AI provider as described below)
              </li>
              <li className="ml-4 list-disc">
                <strong>Device Data:</strong> IP address, browser type, operating system, and device identifiers
              </li>
              <li className="ml-4 list-disc">
                <strong>Generated Replies:</strong> AI-suggested replies are generated from your input but not stored long-term; we may keep minimal logs for service improvement and debugging
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
            <p className="mt-4 text-slate-300">
              <strong>AI Processing:</strong> To generate reply suggestions, we send your input message to third-party AI services (currently OpenAI). These providers process your message according to their terms; please review their privacy policies at <a href="https://openai.com/privacy" className="text-sky-400 hover:text-sky-300">openai.com/privacy</a>. We do not retain copies of your messages longer than necessary to provide the service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">4. Data Security</h2>
            <p className="mt-3 text-slate-300">
              We implement appropriate technical and organizational measures designed to secure your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
            <p className="mt-3 text-slate-300">
              Your account credentials are encrypted. Message inputs are transmitted over HTTPS. Database access is restricted to authenticated service connections. We regularly review our security practices to stay current with industry standards.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">5. Third-Party Services</h2>
            <p className="mt-3 text-slate-300">
              We may use third-party services (such as Supabase for authentication and database services, OpenAI for content generation, and Stripe for payment processing) that collect information used to provide our services. We encourage you to review their privacy policies.
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc"><a href="https://supabase.com/privacy" className="text-sky-400 hover:text-sky-300">Supabase Privacy Policy</a> – Account and database hosting</li>
              <li className="ml-4 list-disc"><a href="https://openai.com/privacy" className="text-sky-400 hover:text-sky-300">OpenAI Privacy Policy</a> – AI reply generation</li>
              <li className="ml-4 list-disc"><a href="https://stripe.com/privacy" className="text-sky-400 hover:text-sky-300">Stripe Privacy Policy</a> – Payment processing (when Pro launches)</li>
            </ul>
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
            <p className="mt-4 text-slate-300">
              To exercise any of these rights, contact us at <a href="mailto:owner@smartreplypro.com" className="text-sky-400 hover:text-sky-300">owner@smartreplypro.com</a>.
            </p>
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
