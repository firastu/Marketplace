import { SITE_NAME } from '@/config/site';
import { Mail, Ref, V, type LegalWriter } from '@/components/legal/kit';

/**
 * Privacy policy, English. It describes what the application does today;
 * when the app starts collecting or sharing something else, change this
 * text (and the Arabic one) in the same commit.
 */
const privacy: LegalWriter = (c) => ({
  intro: (
    <>
      <p>
        This policy explains which personal data {SITE_NAME} processes when you use the website,
        why, for how long, and which rights you have. We collect only what the marketplace needs
        to work. We do not use analytics, advertising or tracking of any kind, and we do not sell
        your data.
      </p>
    </>
  ),
  sections: [
    {
      id: 'controller',
      title: 'Who is responsible',
      body: (
        <>
          <p>
            The controller within the meaning of the EU General Data Protection Regulation (GDPR)
            is:
          </p>
          <address>
            <V>{c.operator.name}</V>
            <br />
            <V>{c.operator.street}</V>
            <br />
            <V>{c.operator.city}</V>, <V>{c.operator.country}</V>
            <br />
            Privacy contact: <Mail>{c.privacyEmail}</Mail>
          </address>
          <p>
            Data protection officer: <V>{c.dataProtectionOfficer}</V>
          </p>
        </>
      ),
    },
    {
      id: 'data',
      title: 'What we collect',
      body: (
        <>
          <h3>Data you give us</h3>
          <ul>
            <li>
              <strong>Account:</strong> your email address, username, display name and, if you
              choose to add them, a phone number and a short bio. Your password is stored only as
              a bcrypt hash; we never store or see the password itself.
            </li>
            <li>
              <strong>Consent record:</strong> the date and the version of the Terms you accepted
              when signing up.
            </li>
            <li>
              <strong>Listings:</strong> title, description, price, condition, category, city and
              the photos you upload.
            </li>
            <li>
              <strong>Messages:</strong> the chats you have with other users about a listing.
            </li>
            <li>
              <strong>Favorites:</strong> the listings you save.
            </li>
            <li>
              <strong>Reviews:</strong> ratings and reviews you write about other users, and those
              written about you.
            </li>
            <li>
              <strong>Reports:</strong> reports you file about a listing or a user, with the
              reason and any details you add.
            </li>
          </ul>
          <h3>Data created when you use the service</h3>
          <ul>
            <li>
              Time stamps (account creation, last login, when a listing or message was created)
              and a view counter per listing.
            </li>
            <li>
              Moderation records: if a listing is held for review, removed, or an account is
              suspended, the decision and its reason are recorded.
            </li>
          </ul>
          <p>
            We do not ask for your real name, date of birth, ID documents, precise location or
            payment details. Payment and handover happen between buyer and seller, outside the
            platform.
          </p>
        </>
      ),
    },
    {
      id: 'photos',
      title: 'Photos',
      body: (
        <>
          <p>
            Phone cameras often embed hidden information in a photo, such as the GPS position
            where it was taken. Every photo shown on {SITE_NAME} is a re-encoded copy from which
            this metadata (EXIF, including GPS) has been removed.
          </p>
          <p>
            The file you originally uploaded is stored privately on our server and is never
            served to anyone. Please still make sure that nothing you do not want to share (faces,
            documents, house numbers, number plates) is visible in the picture itself.
          </p>
        </>
      ),
    },
    {
      id: 'ip',
      title: 'IP addresses',
      body: (
        <p>
          Your IP address is technically necessary to deliver the website to you. We also use it,
          in memory only and for a few minutes, to limit how many requests one address can send
          (protection against password guessing, spam and overload). IP addresses are not written
          to our database and are not linked to your account.
        </p>
      ),
    },
    {
      id: 'storage',
      title: 'Cookies and local storage',
      body: (
        <>
          <p>We store only what is strictly necessary on your device:</p>
          <dl>
            <div>
              <dt>
                Cookie <code dir="ltr">NEXT_LOCALE</code>
              </dt>
              <dd>
                Remembers the language you chose (Arabic or English). Kept for 1 year.
              </dd>
            </div>
            <div>
              <dt>
                Local storage <code dir="ltr">token</code>, <code dir="ltr">user</code>
              </dt>
              <dd>
                Keeps you logged in: a signed session token (valid for 7 days) and a copy of your
                own account details. Removed when you log out.
              </dd>
            </div>
          </dl>
          <p>
            <strong>
              There are no analytics, advertising or tracking cookies, no pixels and no
              third-party scripts.
            </strong>{' '}
            Because everything we store is strictly necessary for a service you asked for, no
            cookie consent banner is required, and none is shown.
          </p>
        </>
      ),
    },
    {
      id: 'purposes',
      title: 'Why we process your data, and the legal basis',
      body: (
        <>
          <dl>
            <div>
              <dt>Performance of a contract — Art. 6(1)(b) GDPR</dt>
              <dd>
                Creating and running your account, publishing your listings, delivering messages
                between users, favorites, reviews, and sending the password-reset email you
                request.
              </dd>
            </div>
            <div>
              <dt>Legitimate interests — Art. 6(1)(f) GDPR</dt>
              <dd>
                Keeping the service secure: rate limiting, fraud and abuse prevention, handling
                reports, moderating listings and accounts, and keeping moderation records. Our
                interest is a safe marketplace for all users; you can object at any time (see{' '}
                <a className="link" href="#rights">
                  Your rights
                </a>
                ).
              </dd>
            </div>
            <div>
              <dt>Legal obligation — Art. 6(1)(c) GDPR</dt>
              <dd>
                Where a law requires it, for example answering lawful requests from authorities,
                acting on notices about illegal content, or keeping records we are obliged to
                keep.
              </dd>
            </div>
          </dl>
          <p>
            We do not make decisions about you that are based solely on automated processing and
            have legal effect. A listing whose text matches a list of prohibited terms is held
            back automatically, but a human moderator decides whether it is published or removed.
          </p>
        </>
      ),
    },
    {
      id: 'visibility',
      title: 'Who can see your data',
      body: (
        <>
          <ul>
            <li>
              <strong>Everyone, including search engines:</strong> your active listings with
              their photos, and your public profile (username, display name, bio, member since,
              reviews and rating).
            </li>
            <li>
              <strong>The person you chat with:</strong> your messages and your public profile.
            </li>
            <li>
              <strong>Nobody else:</strong> your email address and phone number are never shown to
              other users. Share contact details in a chat only if you want to.
            </li>
            <li>
              <strong>Our moderators:</strong> reports, reported listings and profiles, and
              listings held for review.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'processors',
      title: 'Service providers',
      body: (
        <>
          <p>
            We use the following processors, bound by a data processing agreement under Art. 28
            GDPR. They act only on our instructions.
          </p>
          <dl>
            <div>
              <dt>Hosting</dt>
              <dd>
                <V>{c.processors.hosting.name}</V>, data centre in{' '}
                <V>{c.processors.hosting.location}</V>. Stores the database and the uploaded
                photos.
              </dd>
            </div>
            <div>
              <dt>Email delivery</dt>
              <dd>
                <V>{c.processors.email.name}</V> (<V>{c.processors.email.location}</V>). Receives
                your email address to deliver password-reset emails. We send no newsletters.
              </dd>
            </div>
          </dl>
          <p>
            Your data is stored in the European Union. If a provider processes data outside the
            EU/EEA, this happens only with the safeguards the GDPR requires (an adequacy decision
            or standard contractual clauses). We disclose data to authorities only when the law
            obliges us to.
          </p>
        </>
      ),
    },
    {
      id: 'retention',
      title: 'How long we keep your data',
      body: (
        <>
          <dl>
            <div>
              <dt>Account and profile</dt>
              <dd>Until you delete your account.</dd>
            </div>
            <div>
              <dt>Listings</dt>
              <dd>
                Until you delete them or your account. Photos of a deleted listing are removed
                from our storage 30 days after the deletion.
              </dd>
            </div>
            <div>
              <dt>Password-reset links</dt>
              <dd>
                Valid for 60 minutes and usable once. We store only a hash of the link's token;
                used and expired entries are purged daily.
              </dd>
            </div>
            <div>
              <dt>Session token</dt>
              <dd>Valid for 7 days, then you log in again.</dd>
            </div>
            <div>
              <dt>Messages</dt>
              <dd>
                Kept as part of the conversation. After you delete your account, your messages stay visible to the person you wrote to, but the sender is
                shown as a deleted user without your name.
              </dd>
            </div>
            <div>
              <dt>Reports and moderation records</dt>
              <dd>
                Kept as a record of how reports were handled, also after the reporting account is
                deleted.
              </dd>
            </div>
          </dl>
        </>
      ),
    },
    {
      id: 'deletion',
      title: 'What happens when you delete your account',
      body: (
        <>
          <p>
            You can delete your account at any time under Account settings. This takes effect
            immediately and cannot be undone:
          </p>
          <ul>
            <li>
              Your email address, username, display name, phone number, bio and avatar are erased
              or replaced by anonymous values, and the account can no longer log in.
            </li>
            <li>All your listings are deleted; their photos are removed from storage.</li>
            <li>Your favorites and the reviews you wrote are deleted.</li>
            <li>
              Messages you sent stay visible to the other person in the chat, shown as coming from
              a deleted user.
            </li>
            <li>Reports you filed are kept for our moderation records.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: (
        <>
          <p>Under the GDPR you have the right to:</p>
          <ul>
            <li>
              <strong>Access and portability</strong> (Art. 15 and 20): use “Download my data” in
              Account settings to get a machine-readable JSON file with your profile, listings,
              favorites, conversations, reviews and reports.
            </li>
            <li>
              <strong>Rectification</strong> (Art. 16): edit your profile and your listings
              yourself at any time.
            </li>
            <li>
              <strong>Erasure</strong> (Art. 17): delete single listings, or your whole account,
              in the app.
            </li>
            <li>
              <strong>Restriction and objection</strong> (Art. 18 and 21): write to{' '}
              <Mail>{c.privacyEmail}</Mail>. You can object to processing that is based on our
              legitimate interests for reasons arising from your particular situation.
            </li>
            <li>
              <strong>Complaint</strong> (Art. 77): you may complain to a data protection
              supervisory authority, in particular in the EU country where you live or work. The
              authority competent for us is <V>{c.supervisoryAuthority.name}</V> (
              <V>{c.supervisoryAuthority.website}</V>).
            </li>
          </ul>
          <p>
            For any privacy request, write to <Mail>{c.privacyEmail}</Mail>. We answer within one
            month. To protect your account we may ask you to confirm the request from the email
            address registered with it.
          </p>
        </>
      ),
    },
    {
      id: 'age',
      title: 'Minimum age',
      body: (
        <p>
          {SITE_NAME} is for adults. You must be at least {c.minimumAge} years old to create an
          account. We do not knowingly collect data from anyone younger; if we learn that we have,
          we delete the account.
        </p>
      ),
    },
    {
      id: 'security',
      title: 'Security',
      body: (
        <p>
          Connections to the website are encrypted (HTTPS). Passwords are stored as salted bcrypt
          hashes, reset tokens as hashes, and uploaded originals are kept out of public reach.
          Changing or resetting your password signs out all other sessions. No system is perfectly
          secure; if a breach affecting your data occurs, we will inform you and the authority as
          the law requires.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: (
        <p>
          When the service changes, we update this page and the date at the top. If a change is
          significant we tell you in the app or by email before it takes effect. See also our{' '}
          <Ref to="terms">Terms of Use</Ref> and <Ref to="rules">Community Rules</Ref>.
        </p>
      ),
    },
  ],
});

export default privacy;
