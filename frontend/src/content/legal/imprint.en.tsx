import { SITE_NAME } from '@/config/site';
import { Mail, Ref, V, type LegalWriter } from '@/components/legal/kit';

/**
 * Imprint (Impressum / provider identification), English. Which details
 * are mandatory depends on the EU country the operator is established in
 * (in Germany: § 5 DDG and § 18 MStV); have it checked for that country.
 */
const imprint: LegalWriter = (c) => ({
  intro: (
    <p>
      Legal notice identifying the provider of {SITE_NAME}, as required for online services in
      the European Union.
    </p>
  ),
  sections: [
    {
      id: 'provider',
      title: 'Provider',
      body: (
        <>
          <address>
            <V>{c.operator.name}</V>
            <br />
            <V>{c.operator.legalForm}</V>
            <br />
            <V>{c.operator.street}</V>
            <br />
            <V>{c.operator.city}</V>
            <br />
            <V>{c.operator.country}</V>
          </address>
          <dl>
            <div>
              <dt>Represented by</dt>
              <dd>
                <V>{c.operator.representative}</V>
              </dd>
            </div>
            <div>
              <dt>Commercial register</dt>
              <dd>
                <V>{c.operator.register}</V>
              </dd>
            </div>
            <div>
              <dt>VAT identification number</dt>
              <dd>
                <V>{c.operator.vatId}</V>
              </dd>
            </div>
          </dl>
        </>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      body: (
        <dl>
          <div>
            <dt>Email</dt>
            <dd>
              <Mail>{c.operator.email}</Mail>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <V>{c.operator.phone}</V>
            </dd>
          </div>
          <div>
            <dt>Privacy requests</dt>
            <dd>
              <Mail>{c.privacyEmail}</Mail>
            </dd>
          </div>
        </dl>
      ),
    },
    {
      id: 'responsible',
      title: 'Responsible for content',
      body: (
        <>
          <p>
            Responsible for the editorial content of this website (not for listings, messages and
            reviews written by users):
          </p>
          <address>
            <V>{c.operator.contentResponsible}</V>
          </address>
        </>
      ),
    },
    {
      id: 'dsa',
      title: 'Digital Services Act contact points',
      body: (
        <>
          <p>
            Single point of contact for authorities of the EU Member States, the European
            Commission and the European Board for Digital Services (Art. 11 of Regulation (EU)
            2022/2065), and for users of the service (Art. 12):
          </p>
          <address>
            <Mail>{c.dsaContactEmail}</Mail>
          </address>
          <p>
            You can write to us in Arabic or English. Illegal content can be reported with the
            “Report” button on every listing and seller profile, or by email to the address
            above; how we handle reports is described in the{' '}
            <Ref to="rules#reports">Community Rules</Ref>.
          </p>
        </>
      ),
    },
    {
      id: 'disputes',
      title: 'Consumer dispute resolution',
      body: (
        <p>
          We are neither obliged nor willing to take part in dispute resolution proceedings before
          a consumer arbitration board. If you have a complaint, please write to us first; we will
          try to find a solution with you.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'User content and links',
      body: (
        <>
          <p>
            Listings, photos, messages and reviews are written by users, who are responsible for
            them. As a hosting provider we are not obliged to monitor this content in general; we
            remove unlawful content promptly once we become aware of it.
          </p>
          <p>
            Where this website links to external sites, their operators alone are responsible for
            their content.
          </p>
        </>
      ),
    },
  ],
});

export default imprint;
