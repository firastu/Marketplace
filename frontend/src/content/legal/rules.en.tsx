import { SITE_NAME } from '@/config/site';
import { Mail, Ref, type LegalWriter } from '@/components/legal/kit';

/** Community rules and prohibited items, English. Keep in step with rules.ar.tsx. */
const rules: LegalWriter = (c) => ({
  intro: (
    <p>
      {SITE_NAME} works when people can trust what they see. These rules say what may be offered,
      how we expect users to treat each other, how to meet safely, and what happens when
      something is reported. They are part of the <Ref to="terms">Terms of Use</Ref>.
    </p>
  ),
  sections: [
    {
      id: 'prohibited',
      title: 'What may not be offered',
      body: (
        <>
          <p>
            The following may not be listed, requested or traded through {SITE_NAME}, whether for
            money, in exchange or for free:
          </p>
          <ul>
            <li>
              <strong>Weapons and ammunition:</strong> firearms and their parts, ammunition,
              explosives, fireworks, military equipment, silencers, and blades or batons designed
              as weapons.
            </li>
            <li>
              <strong>Drugs:</strong> narcotics and psychoactive substances of any kind, including
              captagon, hashish and pills sold without a prescription, as well as equipment for
              producing them.
            </li>
            <li>
              <strong>Medicines and medical products:</strong> prescription medicines, and medical
              devices that require a licence to sell.
            </li>
            <li>
              <strong>Counterfeit goods:</strong> fakes and replicas of branded products, pirated
              software, films, music and books, and unlocked or tampered devices sold as original.
            </li>
            <li>
              <strong>Documents and money:</strong> passports, ID cards, visas, driving licences,
              diplomas and other official documents (genuine or forged), counterfeit money, bank
              cards, and accounts or SIM cards registered in someone else's name.
            </li>
            <li>
              <strong>Stolen goods</strong> and anything whose origin you cannot account for,
              including looted antiquities and cultural property.
            </li>
            <li>
              <strong>Wild and protected animals</strong> (live or as parts or products), and any
              animal offered in conditions that are cruel to it.
            </li>
            <li>
              <strong>Adult content:</strong> pornography, sexual services and escort offers.
            </li>
            <li>
              <strong>People and bodies:</strong> human organs, blood, smuggling or “travel”
              services that bypass borders, and any offer that exploits a person.
            </li>
            <li>
              <strong>Dangerous goods:</strong> poisons, hazardous chemicals, recalled products,
              and fuel sold in unsafe containers.
            </li>
            <li>
              <strong>Financial schemes:</strong> pyramid and “get rich quick” schemes, and
              gambling.
            </li>
            <li>
              <strong>Hate and violence:</strong> items or texts that glorify violence, or attack
              people for their religion, sect, ethnicity, origin, gender or disability.
            </li>
            <li>
              <strong>Personal data:</strong> phone-number lists, databases, or hacked accounts.
            </li>
          </ul>
          <p>
            This list is not exhaustive: anything illegal where the seller or the buyer is located
            is prohibited as well. Listings whose text matches our list of prohibited terms are held
            back automatically and checked by a moderator before they can appear. If you are unsure whether something is
            allowed, ask us first at <Mail>{c.operator.email}</Mail>.
          </p>
        </>
      ),
    },
    {
      id: 'listings',
      title: 'Good listings',
      body: (
        <ul>
          <li>Describe the item honestly, including defects. Use your own photos of the actual item.</li>
          <li>One listing per item, in the category that fits. Do not repost to jump the queue.</li>
          <li>State a real price. “1” or “call me” is not a price; use “negotiable” instead.</li>
          <li>No advertising for other websites, channels or shops instead of a concrete item.</li>
          <li>Update or delete the listing once the item is reserved or sold.</li>
        </ul>
      ),
    },
    {
      id: 'behaviour',
      title: 'How we treat each other',
      body: (
        <ul>
          <li>Be polite, also when you decline an offer. No insults, threats or harassment.</li>
          <li>No discrimination: do not refuse or abuse people for who they are.</li>
          <li>Keep your word: come to the meeting you agreed, or cancel in good time.</li>
          <li>Do not pressure anyone to pay in advance or to continue the conversation elsewhere.</li>
          <li>Do not share other people's private information or photos of them.</li>
          <li>Write honest reviews, and only about people you actually dealt with.</li>
        </ul>
      ),
    },
    {
      id: 'safety',
      title: 'Meet safely',
      body: (
        <>
          <ul>
            <li>
              <strong>Meet in a public, busy place</strong> in daylight, such as a main street, a
              shopping area or a café. Tell someone where you are going, or bring a friend.
            </li>
            <li>
              <strong>Check the item before you pay.</strong> Switch devices on, test them, and
              compare them with the photos. For phones, check that they are not locked to an
              account.
            </li>
            <li>
              <strong>Never pay in advance</strong> to someone you have not met: no deposits, no
              transfers “to reserve it”, no shipping fees. Pay when you hold the item.
            </li>
            <li>
              <strong>Count the money on the spot</strong> and check banknotes. Carry only the
              amount you need.
            </li>
            <li>
              <strong>Keep the conversation in the chat.</strong> Be careful when someone
              immediately asks to move to another app, sends links, or asks for codes you received
              by SMS. We never ask for your password or a code.
            </li>
            <li>
              <strong>Trust your instinct.</strong> If a price is too good to be true, or you are
              being rushed, walk away and report the listing.
            </li>
          </ul>
          <p>
            In an emergency, or if you were the victim of a crime, contact the local authorities
            first.
          </p>
        </>
      ),
    },
    {
      id: 'reports',
      title: 'Reporting, and what happens next',
      body: (
        <>
          <p>
            Use the <strong>Report</strong> button on a listing or a seller's profile, choose a
            reason and, if you can, add a sentence explaining it. You need to be logged in; if you
            have no account, write to <Mail>{c.dsaContactEmail}</Mail> with the link.
          </p>
          <ol>
            <li>
              <strong>We receive it.</strong> Your report goes to our moderators. The person you
              reported is not told who reported them.
            </li>
            <li>
              <strong>A moderator reviews it,</strong> looking at the listing or profile and at
              earlier reports about it.
            </li>
            <li>
              <strong>We decide.</strong> If the rules were broken we remove the listing, and for
              serious or repeated cases we suspend the account, which also hides all its listings.
              If we find no violation, we close the report.
            </li>
            <li>
              <strong>We keep a record</strong> of the report and the decision, with the reason, so
              that decisions stay consistent and can be reviewed.
            </li>
          </ol>
          <p>
            Please report in good faith. Repeatedly filing reports that are obviously unfounded is
            itself a breach of these rules.
          </p>
        </>
      ),
    },
    {
      id: 'consequences',
      title: 'If your listing or account is affected',
      body: (
        <>
          <ul>
            <li>
              <strong>Held for review:</strong> your listing shows “Under review” and is not
              public yet. You can edit it; a moderator approves or removes it.
            </li>
            <li>
              <strong>Removed:</strong> the listing is no longer visible to others and cannot be
              changed.
            </li>
            <li>
              <strong>Suspended:</strong> you can no longer log in and your listings are hidden.
            </li>
          </ul>
          <p>
            If you believe we got it wrong, write to <Mail>{c.operator.email}</Mail> from the email
            address of your account, name the listing, and tell us why. A person will look at the
            decision again and answer you. Your rights under the{' '}
            <Ref to="terms#moderation">Terms of Use</Ref> and the law are not affected.
          </p>
        </>
      ),
    },
  ],
});

export default rules;
