import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Smart Reply Pro",
  description: "Terms of Use for Smart Reply Pro. Review our terms before using the service.",
  metadataBase: new URL("https://www.smartreplypro.ai"),
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    url: "https://www.smartreplypro.ai/terms",
    type: "website",
    title: "Terms of Use | Smart Reply Pro",
    description: "Review the terms and conditions for using Smart Reply Pro.",
    siteName: "Smart Reply Pro",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfUse() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <article className="prose prose-invert max-w-none">
        <h1 className="text-4xl font-bold tracking-tight text-white">Terms of Use</h1>
        <p className="mt-2 text-slate-400">Last updated: April 5, 2026</p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">What This Service Does</h2>
            <p className="mt-3 text-slate-300">
              Smart Reply Pro is a strategic AI communication workspace. Here's how it works:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc"><strong>You input:</strong> An incoming message and your reply context</li>
              <li className="ml-4 list-disc"><strong>We generate:</strong> AI-suggested replies based on tone, context, and strategy</li>
              <li className="ml-4 list-disc"><strong>You review:</strong> All suggestions and decide what to send</li>
              <li className="ml-4 list-disc"><strong>We never:</strong> Send, post, or share any message on your behalf</li>
            </ul>
            <p className="mt-4 text-slate-300">
              <strong>Clear responsibility:</strong> You are responsible for all messages you send. Smart Reply Pro is a tool, not a decision-maker.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Using This Service</h2>
            <p className="mt-3 text-slate-300">
              By creating an account and using Smart Reply Pro, you agree to these terms. If you disagree with anything here, do not use the service.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>You must:</strong>
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Be at least 13 years old</li>
              <li className="ml-4 list-disc">Provide accurate account information</li>
              <li className="ml-4 list-disc">Keep your password private</li>
              <li className="ml-4 list-disc">Review all AI suggestions before sending them anywhere</li>
              <li className="ml-4 list-disc">Use the service legally and respectfully</li>
            </ul>
            <p className="mt-3 text-slate-300">
              <strong>You cannot:</strong>
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Use Smart Reply Pro to harass, threaten, or defame anyone</li>
              <li className="ml-4 list-disc">Attempt to reverse-engineer, hack, or abuse the service</li>
              <li className="ml-4 list-disc">Bypass security measures or access unauthorized systems</li>
              <li className="ml-4 list-disc">Resell or claim ownership of the service</li>
              <li className="ml-4 list-disc">Violate anyone's rights or applicable laws</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">AI-Generated Content is Not Guaranteed</h2>
            <p className="mt-3 text-slate-300">
              Smart Reply Pro uses artificial intelligence to generate suggestions. Understand what this means:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc"><strong>AI is not infallible:</strong> Suggestions may be inaccurate, inappropriate, or unsuitable for your situation</li>
              <li className="ml-4 list-disc"><strong>No fact-checking:</strong> We do not verify that suggestions are factually correct</li>
              <li className="ml-4 list-disc"><strong>No legal review:</strong> Suggestions are not reviewed by lawyers and may not comply with laws</li>
              <li className="ml-4 list-disc"><strong>No guarantees:</strong> We do not guarantee that suggestions will achieve your intended outcome</li>
            </ul>
            <p className="mt-4 text-slate-300">
              <strong>You are responsible for:</strong>
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Reviewing all suggestions carefully before using them</li>
              <li className="ml-4 list-disc">Editing or discarding suggestions that do not match your intent</li>
              <li className="ml-4 list-disc">Ensuring any message you send complies with laws and respects others</li>
              <li className="ml-4 list-disc">Understanding that you, not Smart Reply Pro, are the author and sender</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Limitations and Disclaimers</h2>
            <p className="mt-3 text-slate-300">
              Smart Reply Pro is provided as-is. We do not warrant that:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">The service will be uninterrupted or error-free</li>
              <li className="ml-4 list-disc">AI suggestions will be appropriate or suitable for any purpose</li>
              <li className="ml-4 list-disc">Suggestions will be legally compliant or factually accurate</li>
              <li className="ml-4 list-disc">The service will remain available or unchanged</li>
            </ul>
            <p className="mt-4 text-slate-300">
              <strong>We are not responsible for:</strong> Relationship damage, professional consequences, legal issues, or any other harm resulting from your use of AI-generated suggestions, even if we were notified that such harm was possible.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Intellectual Property</h2>
            <p className="mt-3 text-slate-300">
              Smart Reply Pro and its content are protected by intellectual property laws. You may use the service for personal, non-commercial purposes only. You may not copy, modify, distribute, or resell the service or its underlying technology.
            </p>
            <p className="mt-3 text-slate-300">
              <strong>Your content:</strong> You own the messages you send to Smart Reply Pro. AI-generated suggestions are provided for your use; you decide what to send and how to use them.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Account Termination</h2>
            <p className="mt-3 text-slate-300">
              We may suspend or terminate your account if you:
            </p>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li className="ml-4 list-disc">Violate these Terms of Use</li>
              <li className="ml-4 list-disc">Misuse the service to harm others</li>
              <li className="ml-4 list-disc">Attempt to bypass security or access unauthorized systems</li>
              <li className="ml-4 list-disc">Engage in illegal activity</li>
            </ul>
            <p className="mt-3 text-slate-300">
              Termination is immediate and without liability. You may delete your account anytime.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Changes to These Terms</h2>
            <p className="mt-3 text-slate-300">
              We may update these terms from time to time. We will notify you of material changes via email or by posting an update here. Continued use of Smart Reply Pro after changes means you accept the new terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Jurisdiction</h2>
            <p className="mt-3 text-slate-300">
              {/* LEGAL REVIEW NEEDED: Confirm the jurisdiction in which Smart Reply Pro is incorporated and has primary operations. Update this to reflect your actual legal jurisdiction. */}
              These terms are governed by the laws of the jurisdiction in which Smart Reply Pro is registered. <strong>Founder note: This requires legal review—please specify the correct jurisdiction (e.g., Ireland for GDPR compliance, or your home jurisdiction).</strong>
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Contact</h2>
            <p className="mt-3 text-slate-300">
              Questions about these terms? Email us at <a href="mailto:support@smartreplypro.ai" className="text-sky-400 hover:text-sky-300">support@smartreplypro.ai</a> and we will get back to you promptly.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
