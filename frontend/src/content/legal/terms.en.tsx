import { SITE_NAME } from '@/config/site';
import { Mail, Ref, V, type LegalWriter } from '@/components/legal/kit';

/** Terms of Use, English. Keep in step with terms.ar.tsx. */
const terms: LegalWriter = (c) => ({
  intro: (
    <>
      <p>
        {SITE_NAME} is a classifieds marketplace where people in Syria offer things for sale and
        find things to buy. These terms are the agreement between you and us about using it.
        Please read them together with our <Ref to="privacy">Privacy Policy</Ref> and the{' '}
        <Ref to="rules">Community Rules</Ref>, which are part of these terms.
      </p>
      <p>
        <strong>The short version:</strong> we provide the place to meet; the sale itself is
        between buyer and seller. Be honest, sell only what is allowed, treat people decently, and
        meet safely.
      </p>
    </>
  ),
  sections: [
    {
      id: 'operator',
      title: 'Who we are',
      body: (
        <p>
          {SITE_NAME} is operated by <V>{c.operator.name}</V>, <V>{c.operator.street}</V>,{' '}
          <V>{c.operator.city}</V>, <V>{c.operator.country}</V> (“we”, “us”). Full provider
          details are in the <Ref to="imprint">Imprint</Ref>. You can reach us at{' '}
          <Mail>{c.operator.email}</Mail>.
        </p>
      ),
    },
    {
      id: 'role',
      title: 'What the service is, and what it is not',
      body: (
        <>
          <p>
            We host listings and let users message each other. We are not a seller, buyer, agent,
            auctioneer or payment provider, and we are not a party to any agreement between
            users.
          </p>
          <ul>
            <li>We do not hold, inspect, ship or guarantee any item.</li>
            <li>We do not process payments and never ask you to pay through a link.</li>
            <li>
              We do not verify the identity of users or the truth of listings, although we may
              remove content that breaks the rules.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'eligibility',
      title: 'Who may use it',
      body: (
        <ul>
          <li>You must be at least {c.minimumAge} years old and able to enter into contracts.</li>
          <li>One person, one account. Do not create an account for someone else.</li>
          <li>
            You may not use the service if we have suspended your account, or if the law that
            applies to you forbids it.
          </li>
        </ul>
      ),
    },
    {
      id: 'account',
      title: 'Your account',
      body: (
        <>
          <p>
            Browsing is free and needs no account. To post a listing, message a seller, save
            favorites or report something, you register with an email address, a username and a
            password, and accept these terms. We record the date and version you accepted.
          </p>
          <ul>
            <li>Give a working email address; it is how you recover your password.</li>
            <li>
              Keep your password to yourself. You are responsible for what happens through your
              account; tell us if you think someone else has used it.
            </li>
            <li>
              Your username and display name must not impersonate another person or a brand and
              must not be offensive.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'listings',
      title: 'Listings',
      body: (
        <>
          <p>You are solely responsible for what you list. By posting a listing you confirm that:</p>
          <ul>
            <li>the item exists, is yours to sell (or you are authorised to sell it), and is in your possession or available to you;</li>
            <li>title, description, price, condition and photos are accurate and not misleading;</li>
            <li>the photos show the actual item and you have the right to use them;</li>
            <li>
              the item and the listing are lawful and allowed by the{' '}
              <Ref to="rules#prohibited">list of prohibited items</Ref>;
            </li>
            <li>it is in the right category, and you post it once, not repeatedly.</li>
          </ul>
          <p>
            Mark a listing as reserved or sold, or delete it, once the item is no longer
            available. Listings whose text matches our list of prohibited terms are held back
            automatically and published only after a moderator has checked them.
          </p>
        </>
      ),
    },
    {
      id: 'deals',
      title: 'Deals between users',
      body: (
        <>
          <p>
            Any sale is a contract between the buyer and the seller only. They agree on price,
            payment and handover themselves, and each is responsible for meeting the laws that
            apply to them (including any tax, customs or licensing rules).
          </p>
          <p>
            Please follow the <Ref to="rules#safety">safety advice</Ref>: meet in a public place,
            check the item before you pay, and never send money in advance to someone you have not
            met. We cannot recover money or goods for you.
          </p>
        </>
      ),
    },
    {
      id: 'content',
      title: 'Your content',
      body: (
        <>
          <p>
            Listings, photos, profile texts, messages and reviews remain yours. You give us a
            non-exclusive, free, worldwide permission to store, reproduce, resize and display
            that content as far as needed to run and show the service (for example, creating smaller copies of photos, or showing your listing
            in search results and link previews).
          </p>
          <p>
            This permission ends when you delete the content or your account, subject to the
            retention periods described in the <Ref to="privacy#retention">Privacy Policy</Ref>.
            You must not upload content that infringes someone else's rights.
          </p>
        </>
      ),
    },
    {
      id: 'conduct',
      title: 'Acceptable use',
      body: (
        <>
          <p>When using {SITE_NAME} you must not:</p>
          <ul>
            <li>break the law or the <Ref to="rules">Community Rules</Ref>;</li>
            <li>deceive, threaten, harass or discriminate against other users;</li>
            <li>send spam, advertising for other services, or mass messages;</li>
            <li>collect other users' data, or copy listings in bulk (scraping), without our written permission;</li>
            <li>try to get around rate limits, a suspension or other security measures;</li>
            <li>interfere with the service, or upload malware.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'reviews',
      title: 'Reviews',
      body: (
        <p>
          Reviews must be based on a real contact about a listing and reflect your honest
          experience. No reviews of yourself, no paid or traded reviews, no insults and no private
          data about others.
        </p>
      ),
    },
    {
      id: 'moderation',
      title: 'Reports and moderation',
      body: (
        <>
          <p>
            Anyone with an account can report a listing or a user with the “Report” button;
            anyone else can write to <Mail>{c.dsaContactEmail}</Mail>. We review reports in good
            time and decide diligently and without arbitrariness.
          </p>
          <p>If content or behaviour breaks the law or these terms, we may, depending on how serious it is:</p>
          <ul>
            <li>hold a listing back for review, or remove it;</li>
            <li>warn the user;</li>
            <li>suspend the account, which also hides its listings.</li>
          </ul>
          <p>
            Where we restrict your content or account we tell you why, unless the law forbids it
            or the content is deceptive high-volume commercial content. If you think a decision
            is wrong, write to <Mail>{c.operator.email}</Mail> and a person will look at it
            again. Details are in the <Ref to="rules#reports">Community Rules</Ref>.
          </p>
        </>
      ),
    },
    {
      id: 'fees',
      title: 'Price',
      body: (
        <p>
          Using {SITE_NAME} is currently free of charge for buyers and sellers. If we introduce
          paid features in the future, they will be optional, clearly priced, and announced before
          they start.
        </p>
      ),
    },
    {
      id: 'availability',
      title: 'Availability and changes to the service',
      body: (
        <p>
          We work to keep the service running but do not promise that it is available without
          interruption or free of errors. We may change, add or remove features, and we may carry
          out maintenance. We will give reasonable notice before removing a feature you rely on.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Our liability',
      body: (
        <>
          <p>
            We are liable without limit for damage caused intentionally or by gross negligence,
            for injury to life, body or health, and wherever liability cannot be excluded by law.
          </p>
          <p>
            In cases of slight negligence we are liable only for breach of an essential
            contractual duty (a duty whose fulfilment makes the proper performance of this
            agreement possible and on which you may regularly rely), and then limited to the
            foreseeable damage typical for this kind of agreement.
          </p>
          <p>
            Beyond that we are not liable, in particular not for the content, legality or accuracy
            of listings and messages written by users, for the quality, safety or legality of the
            items offered, or for whether users complete a deal. Your statutory rights as a
            consumer remain unaffected.
          </p>
        </>
      ),
    },
    {
      id: 'ending',
      title: 'Ending the agreement',
      body: (
        <ul>
          <li>
            You can delete your account at any time in Account settings, without giving a reason.
            What is deleted and what stays is explained in the{' '}
            <Ref to="privacy#deletion">Privacy Policy</Ref>.
          </li>
          <li>We may end the agreement with 30 days' notice by email.</li>
          <li>
            We may suspend or close an account without notice for a serious or repeated breach of
            these terms, in particular for fraud, prohibited items, or threats to other users.
          </li>
        </ul>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      body: (
        <p>
          We may change these terms for a valid reason, for example a new feature, a change in the
          law, or a security need. We will tell you by email or in the app at least 30 days before
          a change takes effect and show you what changed. If you do not agree, you can delete
          your account before that date; continuing to use the service afterwards means you accept
          the new terms. The version you accepted is stored with your account.
        </p>
      ),
    },
    {
      id: 'law',
      title: 'Applicable law and disputes',
      body: (
        <>
          <p>
            These terms are governed by the law of <V>{c.governingLaw}</V>. If you are a consumer,
            you also keep the protection of the mandatory rules of the country where you live.
          </p>
          <p>
            If you are a business, the courts of <V>{c.jurisdiction}</V> have jurisdiction.
            Consumers may bring a claim where the law allows them to.
          </p>
          <p>
            If a provision of these terms is invalid, the remaining provisions stay in force.
            These terms are provided in Arabic and English; if the two versions differ, the Arabic
            version prevails.
          </p>
        </>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <p>
          Questions about these terms: <Mail>{c.operator.email}</Mail>. Privacy requests:{' '}
          <Mail>{c.privacyEmail}</Mail>.
        </p>
      ),
    },
  ],
});

export default terms;
