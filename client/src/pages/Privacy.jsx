import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { ThemeButton } from "../components/auth/AuthLayout";
import { Logo } from "../components/brand/Logo";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getAppConfig } from "../lib/api";

const UPDATED = "November 1, 2026";

const SECTIONS = [
  {
    title: "What we collect",
    items: [
      "Your account: name, email address and, if you sign up with email, a password. Passwords are stored only as a salted hash, never in readable form.",
      "If you sign in with Google, GitHub or Microsoft: the name, email address and profile picture that provider shares with us. We ask only for basic profile access; we can't read your email, files or repositories.",
      "What you put into Twillboard: clients, projects, descriptions, deadlines and the files or photos you upload.",
      "Sign-in records: for each active session, the IP address and browser it was created from, so you can review and sign out your devices. Your IP address is also used briefly to rate-limit sign-in attempts.",
    ],
  },
  {
    title: "How we use it",
    items: [
      "To run your account and show your data back to you. Everything you create is private to your account.",
      "To send emails you need: verifying your address, resetting your password and security notices. We don't send marketing email.",
      "To protect the service against abuse, such as repeated sign-in attempts.",
      "We don't sell your data, share it with advertisers or use it for tracking. Twillboard has no ads and no analytics.",
    ],
  },
  {
    title: "Where it's stored",
    items: [
      "MongoDB Atlas (database), Cloudinary (uploaded files and photos), Vercel (hosting) and Gmail (sending email). They process data only to provide these services.",
      "Sign-in tokens from Google, GitHub and Microsoft are stored encrypted.",
    ],
  },
  {
    title: "Cookies",
    items: [
      "One cookie keeps you signed in, plus short-lived ones during sign-in. They're essential, so there's no cookie banner. Your light or dark theme choice is saved in your browser only.",
    ],
  },
  {
    title: "Your choices",
    items: [
      "You can edit your profile, sign out other devices and connect or disconnect sign-in providers under Account.",
      "Deleting your account (Account → Delete account) permanently removes your profile, clients, projects and uploaded files. This can't be undone.",
      "Sessions expire after 7 days of inactivity.",
    ],
  },
];

export default function Privacy() {
  useDocumentTitle("Privacy policy");
  const [contact, setContact] = useState(null);

  useEffect(() => {
    getAppConfig().then((config) => setContact(config.contactEmail ?? null));
  }, []);

  return (
    <div className="min-h-dvh px-5 py-6 sm:px-10">
      <header className="mx-auto flex max-w-2xl items-center justify-between">
        <Link to="/" aria-label="Twillboard">
          <Logo />
        </Link>
        <ThemeButton />
      </header>

      <main className="mx-auto max-w-2xl py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">Privacy policy</h1>
        <p className="mt-3 text-muted">
          Last updated {UPDATED}. This explains what Twillboard stores about you, why, and how to remove it.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="font-display text-xl font-bold">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-subtle">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Contact</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Questions, or want a copy of your data?{" "}
            {contact ? (
              <>
                Email{" "}
                <a href={`mailto:${contact}`} className="font-semibold text-twill-600 hover:underline dark:text-twill-300">
                  {contact}
                </a>
                .
              </>
            ) : (
              "Reply to any email Twillboard has sent you."
            )}{" "}
            If this policy changes, the date above will change too.
          </p>
        </section>

        <Link
          to="/"
          className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-twill-600 hover:underline dark:text-twill-300"
        >
          <ArrowLeft className="size-4" /> Back to Twillboard
        </Link>
      </main>
    </div>
  );
}
