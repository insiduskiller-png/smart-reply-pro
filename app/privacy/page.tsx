import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Smart Reply Pro",
  description: "Privacy policy for Smart Reply Pro. Learn how we collect, use, and protect your data.",
  metadataBase: new URL("https://www.smartreplypro.ai"),
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    url: "https://www.smartreplypro.ai/privacy",
    type: "website",
    title: "Privacy Policy | Smart Reply Pro",
    description: "Learn how Smart Reply Pro protects your privacy and data.",
    siteName: "Smart Reply Pro",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <article className="prose prose-invert max-w-none">
        <h1 className="text-4xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-slate-400">Last updated: April 5, 2026</p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Overview</h2>
            <p className="mt-3 text-slate-300">
              This Privacy Policy explains how Smart Reply Pro collects, uses, and protects your information.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>What Smart Reply Pro is:</strong> We are a strategic AI communication workspace. You paste incoming messages into our platform, we generate reply suggestions, and you decide whether to use them. We never send, post, or share messages on your behalf.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>What we collect:</strong> Your email, account settings, and the messages you input for reply generation.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>What we do with it:</strong> We use your data to run the service, improve our AI, and keep your account secure. Messages are processed for reply generation and not stored long-term. We do not sell your data.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Information We Collect</h2>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">
                <strong>Account Information:</strong> Email address, username, password, and profile settings
              </li>
              <li className="ml-4 list-disc">
                <strong>Messages:</strong> Messages and context you input for reply generation. These are processed in real-time to generate suggestions and are not stored long-term.
              </li>
              <li className="ml-4 list-disc">
                <strong>Device and Usage Data:</strong> IP address, browser type, operating system, and general usage patterns to help us improve the service
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">How We Use Your Information</h2>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Operate and improve the Smart Reply Pro service</li>
              <li className="ml-4 list-disc">Generate reply suggestions based on your input</li>
              <li className="ml-4 list-disc">Manage your account and process authentication</li>
              <li className="ml-4 list-disc">Send you essential service updates and security alerts</li>
              <li className="ml-4 list-disc">Analyze usage to identify bugs and improve performance</li>
            </ul>
            <p className="mt-4 text-slate-300">
              <strong>AI Processing:</strong> To generate reply suggestions, we send your message to OpenAI's API. OpenAI processes your message according to their privacy policy (<a href="https://openai.com/privacy" className="text-sky-400 hover:text-sky-300">openai.com/privacy</a>). We retain message logs only for debugging and service improvement; messages are not used to train our models.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>We do not:</strong> Sell your data, use your messages for marketing, or share your information with third parties except as described above.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Security</h2>
            <p className="mt-3 text-slate-300">
              We use industry-standard practices to protect your data:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Passwords are encrypted and never stored in plain text</li>
              <li className="ml-4 list-disc">All data in transit is encrypted with HTTPS/TLS</li>
              <li className="ml-4 list-disc">Database access is restricted to authenticated service connections only</li>
              <li className="ml-4 list-disc">We review our security practices regularly</li>
            </ul>
            <p className="mt-4 text-slate-300">
              No security system is perfect. If you believe your account has been compromised, contact us immediately at <a href="mailto:support@smartreplypro.ai" className="text-sky-400 hover:text-sky-300">support@smartreplypro.ai</a>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Third-Party Services</h2>
            <p className="mt-3 text-slate-300">
              We use trusted partners to operate Smart Reply Pro. Each has access only to the data they need:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc"><strong><a href="https://supabase.com/privacy" className="text-sky-400 hover:text-sky-300">Supabase</a></strong> – Authentication and database hosting</li>
              <li className="ml-4 list-disc"><strong><a href="https://openai.com/privacy" className="text-sky-400 hover:text-sky-300">OpenAI</a></strong> – AI reply generation</li>
              <li className="ml-4 list-disc"><strong><a href="https://stripe.com/privacy" className="text-sky-400 hover:text-sky-300">Stripe</a></strong> – Payment processing (when Pro launches)</li>
            </ul>
            <p className="mt-4 text-slate-300">
              We recommend reviewing these services' privacy policies to understand how they handle your data.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Your Rights</h2>
            <p className="mt-3 text-slate-300">
              You have the right to control your data. You can:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Access the personal data we hold about you</li>
              <li className="ml-4 list-disc">Correct inaccurate information</li>
              <li className="ml-4 list-disc">Request deletion of your account and associated data</li>
              <li className="ml-4 list-disc">Export your data in a standard format</li>
              <li className="ml-4 list-disc">Withdraw consent for specific uses</li>
            </ul>
            <p className="mt-4 text-slate-300">
              To request any of these, email <a href="mailto:support@smartreplypro.ai" className="text-sky-400 hover:text-sky-300">support@smartreplypro.ai</a> and we will respond within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Questions?</h2>
            <p className="mt-3 text-slate-300">
              Email us at <a href="mailto:support@smartreplypro.ai" className="text-sky-400 hover:text-sky-300">support@smartreplypro.ai</a> with any privacy concerns. We will respond promptly.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
