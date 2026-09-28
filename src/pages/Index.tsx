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

const LOGO_IMAGE = "/logo.jpg";

const SPARKLES = [
  { top: "8%", left: "6%", size: 6, delay: 0 },
  { top: "22%", left: "46%", size: 4, delay: 1.2 },
  { top: "68%", left: "3%", size: 5, delay: 0.6 },
  { top: "82%", left: "44%", size: 7, delay: 2 },
  { top: "12%", left: "92%", size: 5, delay: 0.9 },
  { top: "60%", left: "96%", size: 4, delay: 1.6 },
];

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
      <section className="dark bg-background text-foreground bg-royal relative overflow-hidden">
        <div
          aria-hidden
          className="bg-geo absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        {SPARKLES.map((sparkle) => (
          <motion.span
            key={sparkle.top + sparkle.left}
            aria-hidden
            className="bg-gold-gradient absolute rounded-full"
            style={{
              top: sparkle.top,
              left: sparkle.left,
              width: sparkle.size,
              height: sparkle.size,
            }}
            animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.4, 0.8] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              delay: sparkle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-7"
          >
            <span className="border-primary/40 bg-primary/10 text-gold-soft inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide backdrop-blur">
              <Sparkles className="text-primary size-3.5" />
              From passport to Excel, in seconds
            </span>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Turn passports into{" "}
              <span className="text-gold-gradient animate-shimmer">
                spreadsheet rows
              </span>{" "}
              in seconds.
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-balance">
              A professional check-in desk tool for hotels, travel agencies and
              front offices. Scan a passport, verify the extracted data, and
              export straight to Excel.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Authenticated>
                <Button
                  size="lg"
                  className="bg-gold-gradient text-primary-foreground shadow-[0_10px_40px_-10px_var(--gold)] hover:brightness-110"
                  asChild
                >
                  <Link to="/scan">
                    <ScanLine className="size-4" />
                    Start scanning
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/40 hover:bg-primary/10"
                  asChild
                >
                  <Link to="/records">View records</Link>
                </Button>
              </Authenticated>
              <Unauthenticated>
                <SignInButton
                  size="lg"
                  signInText="Get started free"
                  className="bg-gold-gradient text-primary-foreground shadow-[0_10px_40px_-10px_var(--gold)] hover:brightness-110"
                />
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/40 hover:bg-primary/10"
                  asChild
                >
                  <a href="#pricing">See pricing</a>
                </Button>
              </Unauthenticated>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
              {AUDIENCES.map((audience) => (
                <span key={audience.label} className="flex items-center gap-2">
                  <audience.icon className="text-primary size-4" />
                  {audience.label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-lg"
          >
            <div
              aria-hidden
              className="bg-primary/25 absolute -inset-8 rounded-full blur-3xl"
            />
            <img
              src={LOGO_IMAGE}
              alt="Passport Desk: a passport turning into an Excel spreadsheet"
              width={1000}
              height={1000}
              className="glow-gold animate-float relative w-full rounded-[2rem] object-cover"
            />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="card-glow border-primary/25 overflow-hidden rounded-2xl border"
        >
          <img
            src="/preview.jpg"
            alt="Passport Desk product preview: drag and drop a passport to get a structured Excel export"
            width={1599}
            height={1066}
            className="w-full object-cover"
          />
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl space-y-3">
          <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">
            How it works
          </p>
          <h2 className="font-serif text-3xl tracking-tight sm:text-5xl">
            Three steps, <span className="text-gold-gradient">no typing</span>
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
              <Card className="card-glow border-primary/20 h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="bg-gold-gradient flex size-11 items-center justify-center rounded-xl text-[oklch(0.2_0.06_300)] shadow-[0_8px_24px_-8px_var(--gold)]">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-gold-gradient font-serif text-4xl">
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

      <section className="bg-card relative overflow-hidden border-y">
        <div
          aria-hidden
          className="bg-geo absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-10 max-w-2xl space-y-3">
            <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">
              Why Passport Desk
            </p>
            <h2 className="font-serif text-3xl tracking-tight sm:text-5xl">
              Built for a <span className="text-gold-gradient">real front desk</span>
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
                className="card-glow border-primary/20 bg-background/50 flex gap-4 rounded-xl border p-5 backdrop-blur"
              >
                <span className="bg-gold-gradient flex size-11 shrink-0 items-center justify-center rounded-xl text-[oklch(0.2_0.06_300)] shadow-[0_8px_24px_-8px_var(--gold)]">
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
        <h2 className="font-serif mb-8 text-3xl tracking-tight sm:text-5xl">
          Good <span className="text-gold-gradient">questions</span>
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
        <Card className="dark bg-royal bg-card text-foreground glow-gold border-primary/40 relative items-center gap-5 overflow-hidden p-10 text-center sm:p-14">
          <div
            aria-hidden
            className="bg-geo absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />
          <h2 className="relative font-serif text-3xl tracking-tight text-balance sm:text-5xl">
            Your next check-in could take{" "}
            <span className="text-gold-gradient animate-shimmer">ten seconds.</span>
          </h2>
          <p className="text-muted-foreground relative max-w-xl">
            Scan a passport, confirm the details, and let the spreadsheet build
            itself.
          </p>
          <Authenticated>
            <Button
              size="lg"
              className="bg-gold-gradient text-primary-foreground relative shadow-[0_10px_40px_-10px_var(--gold)] hover:brightness-110"
              asChild
            >
              <Link to="/scan">
                <ScanLine className="size-4" />
                Scan a passport
              </Link>
            </Button>
          </Authenticated>
          <Unauthenticated>
            <SignInButton
              size="lg"
              className="bg-gold-gradient text-primary-foreground relative shadow-[0_10px_40px_-10px_var(--gold)] hover:brightness-110"
              signInText="Get started free"
            />
          </Unauthenticated>
        </Card>
      </section>
    </div>
  );
}
