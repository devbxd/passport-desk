import { Authenticated, Unauthenticated } from "convex/react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { PLANS } from "@/lib/plans.ts";

export default function PricingSection() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
      <div className="mb-10 max-w-2xl space-y-3">
        <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">
          Pricing
        </p>
        <h2 className="font-serif text-3xl tracking-tight sm:text-5xl">
          Simple pricing,{" "}
          <span className="text-gold-gradient">no surprises</span>
        </h2>
        <p className="text-muted-foreground">
          Start free. Upgrade when your front desk scans more passports than
          the free plan covers.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: index * 0.1, ease: "easeOut" }}
          >
            <Card
              className={
                plan.highlighted
                  ? "glow-gold border-primary relative h-full gap-5 p-6"
                  : "card-glow border-primary/20 relative h-full gap-5 p-6"
              }
            >
              {plan.highlighted && (
                <Badge className="bg-gold-gradient absolute -top-3 left-6 border-0 text-[oklch(0.2_0.06_300)]">
                  <Sparkles className="size-3.5" />
                  Most popular
                </Badge>
              )}
              <div className="space-y-1.5">
                <h3 className="text-lg font-medium">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.tagline}</p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-gold-gradient font-serif text-5xl tracking-tight">
                  ${plan.priceMonthly}
                </span>
                <span className="text-muted-foreground pb-1 text-sm">
                  /month
                </span>
              </div>
              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="text-excel mt-0.5 size-4 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Authenticated>
                <Button
                  className="mt-auto"
                  variant={plan.highlighted ? "default" : "secondary"}
                  asChild
                >
                  <a
                    href={
                      plan.id === "free"
                        ? "#pricing"
                        : `mailto:hello@passportdesk.app?subject=Upgrade%20to%20${plan.name}`
                    }
                  >
                    {plan.id === "free" ? "Current plan info" : `Upgrade to ${plan.name}`}
                  </a>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <SignInButton
                  className="mt-auto w-full"
                  variant={plan.highlighted ? "default" : "secondary"}
                  signInText={plan.id === "free" ? "Get started free" : `Get started with ${plan.name}`}
                />
              </Unauthenticated>
            </Card>
          </motion.div>
        ))}
      </div>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Need more than 600 scans a month?{" "}
        <a href="mailto:hello@passportdesk.app" className="text-foreground underline">
          Contact us
        </a>{" "}
        about a custom plan.
      </p>
    </section>
  );
}
