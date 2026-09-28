import { Link } from "react-router-dom";
import { Authenticated, Unauthenticated } from "convex/react";
import { motion } from "motion/react";
import {
  Camera,
  FileSpreadsheet,
  Hotel,
  Pencil,
  Plane,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Building2,
  CalendarClock,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import PricingSection from "./_components/pricing-section.tsx";

const HERO_IMAGE = "/hero.png";

const STEPS = [
  {
    icon: Camera,
    step: "01",
    title: "Capture or import",
    body: "Photograph the passport with your device camera, or drop in a picture you already have on file.",
  },
  {
    icon: Sparkles,
    step: "02",
    title: "Read automatically",
    body: "Names, document number, nationality and dates are read from the page and the machine readable zone.",
  },
  {
    icon: FileSpreadsheet,
    step: "03",
    title: "Export to Excel",
    body: "Review the fields, save the record, then download a clean spreadsheet whenever you need it.",
  },
];

const FEATURES = [
  {
    icon: Pencil,
    title: "Always verifiable",
    body: "Every extracted field lands in an editable review form with a confidence score, so nothing is saved blind.",
  },
  {
    icon: Search,
    title: "Searchable register",
    body: "Find any guest by name, passport number or nationality across your whole history in one keystroke.",
  },
  {
    icon: CalendarClock,
    title: "Expiry warnings",
    body: "Documents that have expired or lapse within six months are flagged automatically in your records.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Records and scans belong to your signed-in account only. Delete a record and its image goes with it.",
  },
];

const AUDIENCES = [
  { icon: Hotel, label: "Hotels & guest houses" },
  { icon: Plane, label: "Travel & visa agencies" },
  { icon: Building2, label: "Corporate front offices" },
];

const FAQS = [
  {
    question: "Which fields are captured?",
    answer:
      "Surname, given names, passport number, nationality, date of birth, sex, place of birth, issuing country, issue and expiry dates, document type, personal number and the full machine readable zone.",
  },
  {
    question: "How accurate is the reading?",
    answer:
      "Accuracy is high on clear, well-lit photographs, and each scan carries a confidence score. Because documents vary, every field stays editable before you save, so you always have the final word.",
  },
  {
    question: "Can I export only some records?",
    answer:
      "Yes. Tick the rows you want in your records table and export just those, or export everything at once. The file is a standard .xlsx spreadsheet that opens in Excel, Numbers and Google Sheets.",
  },
  {
    question: "Where are the passport images stored?",
    answer:
      "Scans are stored securely against your account and are only visible to you. Deleting a record permanently removes both the data and the image.",
  },
  {
    question: "What happens if I go over my monthly scan limit?",
    answer:
      "Scanning pauses once you reach your plan's monthly limit, and you'll see an upgrade option. Your existing records stay fully accessible and exportable either way. Limits reset at the start of each calendar month.",
  },
];

export default function Index() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="from-accent/50 via-background to-background absolute inset-0 bg-gradient-to-b"
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >
            <span className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <ShieldCheck className="size-3.5" />
              Private to your account
            </span>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
              Turn passports into spreadsheet rows in seconds.
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-balance">
              A professional check-in desk tool for hotels, travel agencies and
              front offices. Scan a passport, verify the extracted data, and
              export straight to Excel.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Authenticated>
                <Button size="lg" asChild>
                  <Link to="/scan">
                    <ScanLine className="size-4" />
                    Start scanning
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/records">View records</Link>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <SignInButton size="lg" signInText="Get started free" />
                <Button size="lg" variant="secondary" asChild>
                  <a href="#pricing">See pricing</a>
                </Button>
              </Unauthenticated>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
              {AUDIENCES.map((audience) => (
                <span key={audience.label} className="flex items-center gap-2">
                  <audience.icon className="size-4" />
                  {audience.label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <img
              src={HERO_IMAGE}
              alt="A passport and a laptop showing a spreadsheet on a reception desk"
              className="border-border w-full rounded-xl border object-cover shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl space-y-3">
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
            Three steps, no typing
          </h2>
          <p className="text-muted-foreground">
            What used to be five minutes of manual data entry per guest becomes
            a photograph and a glance.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: 0.45,
                delay: index * 0.1,
                ease: "easeOut",
              }}
            >
              <Card className="h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="bg-secondary text-secondary-foreground flex size-10 items-center justify-center rounded-md">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-muted-foreground/50 font-serif text-2xl">
                    {step.step}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.body}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
              Built for a real front desk
            </h2>
            <p className="text-muted-foreground">
              Accuracy, auditability and speed, without the clutter of a full
              property management system.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: "easeOut",
                }}
                className="flex gap-4"
              >
                <span className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                  <feature.icon className="size-5" />
                </span>
                <div className="space-y-1.5">
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="font-serif mb-8 text-3xl tracking-tight sm:text-4xl">
          Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-left text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
        <Card className="bg-primary text-primary-foreground items-center gap-5 p-10 text-center sm:p-14">
          <h2 className="font-serif text-3xl tracking-tight text-balance sm:text-4xl">
            Your next check-in could take ten seconds.
          </h2>
          <p className="max-w-xl opacity-80">
            Scan a passport, confirm the details, and let the spreadsheet build
            itself.
          </p>
          <Authenticated>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/scan">
                <ScanLine className="size-4" />
                Scan a passport
              </Link>
            </Button>
          </Authenticated>
          <Unauthenticated>
            <SignInButton
              size="lg"
              variant="secondary"
              signInText="Get started free"
            />
          </Unauthenticated>
        </Card>
      </section>
    </div>
  );
}
