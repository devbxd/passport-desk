import LegalPage from "./_components/legal-page.tsx";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updatedAt="September 28, 2026">
      <p>
        This Privacy Policy explains what data Passport Desk (the "Service")
        collects and how it is used.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> your name and email address from
          sign-in.
        </li>
        <li>
          <strong>Passport images and extracted fields:</strong> the images
          you upload or capture, and the data read from them (name, document
          number, nationality, dates of birth/issue/expiry, and similar
          fields), along with any corrections you make.
        </li>
        <li>
          <strong>Billing data:</strong> if you subscribe to a paid plan,
          your subscription status and payment history, processed by our
          payment provider. We do not store your full card details ourselves.
        </li>
        <li>
          <strong>Usage data:</strong> the number of scans performed each
          month, used to enforce plan limits.
        </li>
      </ul>

      <h2>2. How we use this data</h2>
      <p>
        We use this data to operate the Service: to extract and store
        passport records for your account, enforce your plan's monthly scan
        limit, process billing, and provide support. Passport images are
        processed using an automated document recognition service solely to
        extract the fields shown to you for review.
      </p>

      <h2>3. Who can see your data</h2>
      <p>
        Passport records and images belong to your account and are private
        to it. We do not sell your data or the identity data you upload.
        Automated processing may involve trusted service providers (such as
        our recognition and payment providers) acting on our behalf, bound to
        protect the data.
      </p>

      <h2>4. Data retention and deletion</h2>
      <p>
        Records are retained until you delete them. Some paid plans offer an
        optional setting that automatically deletes records a set number of
        days after they are saved. Deleting a record permanently removes both
        the stored data and its image.
      </p>

      <h2>5. Security</h2>
      <p>
        Records and images are stored against your authenticated account and
        are only accessible to you. We use industry-standard practices to
        protect stored data, but no system is completely secure.
      </p>

      <h2>6. Your choices</h2>
      <p>
        You can review, correct, export, or delete any record at any time
        from your Records page. You can close your account by contacting us.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be reflected by an updated "Last updated" date above.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:hello@passportdesk.app">hello@passportdesk.app</a>.
      </p>
    </LegalPage>
  );
}
