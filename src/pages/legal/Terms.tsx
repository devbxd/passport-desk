import LegalPage from "./_components/legal-page.tsx";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updatedAt="September 28, 2026">
      <p>
        These Terms of Service ("Terms") govern your use of Passport Desk (the
        "Service"). By creating an account or using the Service, you agree to
        these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Passport Desk lets you photograph or upload passport images, extract
        the printed and machine-readable data using automated recognition,
        review and correct that data, store it against your account, and
        export it to a spreadsheet. Automated extraction can make mistakes.
        You are responsible for verifying every field before saving or
        exporting a record.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must sign in to scan or store records. You are responsible for
        activity on your account and for keeping your sign-in credentials
        secure.
      </p>

      <h2>3. Plans, billing, and scan limits</h2>
      <p>
        The Service is offered on a free plan with a limited number of
        monthly passport scans, and paid plans with higher monthly limits.
        Paid plans are billed monthly in advance and renew automatically
        until cancelled. Monthly scan limits reset at the start of each
        calendar month and do not roll over. You can cancel or change your
        plan at any time from the Billing page; changes take effect as
        described there. Fees are non-refundable except where required by
        law.
      </p>

      <h2>4. Passport and identity data</h2>
      <p>
        You confirm that you have the right to collect, process, and store
        the identity documents you upload, including any consents required
        from the individuals shown. You must only use the Service for
        legitimate purposes such as guest check-in, travel documentation, or
        similar front-desk workflows, and must comply with applicable law
        when handling identity data.
      </p>

      <h2>5. Data deletion</h2>
      <p>
        You may delete any record at any time, which permanently removes the
        stored data and image. Some paid plans offer an optional setting to
        automatically delete records a fixed number of days after they are
        saved. Deletion, whether manual or automatic, cannot be undone.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        You may not use the Service to process documents you are not
        authorized to handle, to build a competing product, or to attempt to
        disrupt or reverse engineer the Service.
      </p>

      <h2>7. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. To
        the maximum extent permitted by law, we are not liable for indirect,
        incidental, or consequential damages arising from your use of the
        Service, including inaccuracies in automated data extraction.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the
        Service after a change means you accept the updated Terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href="mailto:hello@passportdesk.app">hello@passportdesk.app</a>.
      </p>
    </LegalPage>
  );
}
