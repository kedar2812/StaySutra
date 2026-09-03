import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { ContactForm } from "@/components/site/ContactForm";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { ButtonLink } from "@/components/primitives/Button";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { settings, waMessage, whatsappLink } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "WhatsApp, email or phone. We reply the same day — usually within a few hours.",
  path: "/contact",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        overline="Talk to us"
        title="Contact"
        lede={settings.responseTime}
        seed="contact-hero"
        scene="city"
        mood="night"
        size="sm"
        trail={trail}
      />

      <div className="shell grid gap-14 pb-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-24 lg:pb-32">
        <aside>
          <Rule className="mb-5 max-w-24" />
          <p className="t-overline">Fastest first</p>
          <h2 className="t-display-m mt-4 max-w-[14ch] text-balance">
            WhatsApp is where this actually happens
          </h2>
          <p className="mt-6 max-w-[42ch] text-[0.9375rem] leading-relaxed text-text-mid">
            Send us the dates, the group size and roughly where you want to be. We
            come back with what is free and what the roads are doing.
          </p>

          <ButtonLink
            href={whatsappLink(waMessage.general())}
            target="_blank"
            rel="noreferrer noopener"
            size="lg"
            icon="whatsapp"
            iconAfter={false}
            className="mt-8"
          >
            Open WhatsApp
          </ButtonLink>

          <ul className="mt-12">
            {[
              {
                icon: "phone" as const,
                label: "Phone",
                value: settings.phone,
                href: `tel:${settings.phone.replace(/\s/g, "")}`,
              },
              {
                icon: "mail" as const,
                label: "Email",
                value: settings.email,
                href: `mailto:${settings.email}`,
              },
              {
                icon: "instagram" as const,
                label: "Instagram",
                value: settings.instagramHandle,
                href: settings.instagram,
              },
              {
                icon: "pin" as const,
                label: "Based in",
                value: settings.officeLocality,
              },
            ].map((row) => (
              <li
                key={row.label}
                className="border-t border-[color:var(--hairline)] py-4 last:border-b"
              >
                <div className="flex items-start gap-3.5">
                  <Icon name={row.icon} size={19} className="mt-0.5 shrink-0 text-text-low" />
                  <div className="min-w-0">
                    <p className="t-caption uppercase tracking-[0.16em]">{row.label}</p>
                    {row.href ? (
                      <a
                        href={row.href}
                        target={row.href.startsWith("http") ? "_blank" : undefined}
                        rel={row.href.startsWith("http") ? "noreferrer noopener" : undefined}
                        className="press-sm mt-1 block text-[0.9375rem] text-text-hi transition-colors hover:text-gold-400"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <p className="mt-1 text-[0.9375rem] text-text-hi">{row.value}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <Rule className="mb-5 max-w-24" />
          <p className="t-overline">Or write to us</p>
          <h2 className="t-display-m mt-4">Send a message</h2>
          <div className="mt-9 max-w-xl">
            <ContactForm />
          </div>
        </div>
      </div>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
