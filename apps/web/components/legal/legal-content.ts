// Draft written from how the app works. A lawyer should review before public launch.

export type LegalKind = 'terms' | 'privacy';
export interface LegalSection { heading: string; paragraphs: string[] }
export interface LegalDoc { title: string; updated: string; sections: LegalSection[] }

const UPDATED = '17 November 2026';
const CONTACT = 'You can reach OBN NATION on +234 707 276 7227.';

export const LEGAL: Record<LegalKind, LegalDoc> = {
  terms: {
    title: 'Terms & Conditions',
    updated: UPDATED,
    sections: [
      {
        heading: 'What OBN NATION is',
        paragraphs: [
          'OBN NATION helps people in Nigeria sell second-hand goods such as phones, TVs, computers, fridges, kitchen items and furniture.',
          'You add your item. An admin in your region checks it. If it passes, it goes into our regional pool so we can help you find a buyer.',
        ],
      },
      {
        heading: 'Who can use it',
        paragraphs: [
          'You need a Nigerian phone number. You must be old enough to make your own agreements under Nigerian law.',
          'One person, one phone number. Do not use another person’s number.',
        ],
      },
      {
        heading: 'Signing in',
        paragraphs: [
          'We send a one-time code to your Telegram. The first time, you link your phone number to our Telegram bot. After that, codes arrive in the same chat.',
          'Keep your code to yourself. Anyone with your code can use your account.',
        ],
      },
      {
        heading: 'What you may list',
        paragraphs: [
          'List only items you own or have the right to sell. Photos and the video must show the real item.',
          'Do not list stolen, fake, illegal or dangerous goods. Do not post false details or a false price.',
        ],
      },
      {
        heading: 'Review and removal',
        paragraphs: [
          'An admin reviews every listing. We may reject a listing and tell you why, so you can fix it and send it again.',
          'We may remove a listing, or block a phone number, if these terms are broken or if we think a listing is not safe for buyers.',
        ],
      },
      {
        heading: 'Sales',
        paragraphs: [
          'In this first version OBN NATION does not take payments and does not deliver goods. A sale is between you and the buyer.',
          'OBN NATION is not a party to the sale and does not promise that an item will sell or at what price.',
        ],
      },
      {
        heading: 'Your photos and videos',
        paragraphs: [
          'You keep ownership of your photos and videos. By uploading them you let OBN NATION store and show them so we can review and promote your listing.',
          'We shrink your files in your browser before they upload, to save data.',
        ],
      },
      {
        heading: 'Changes and contact',
        paragraphs: [
          'We may update these terms. The date at the top shows the latest version. If you keep using OBN NATION after a change, you accept it.',
          CONTACT,
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: UPDATED,
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'Your phone number and your name.',
          'The details, photos and video of your listings.',
          'Your Telegram chat link, so we can send your sign-in code.',
          'Review decisions and a log of admin actions, so we can keep the service safe.',
          'If you join our newsletter: the email or phone number you enter.',
        ],
      },
      {
        heading: 'Why we collect it',
        paragraphs: [
          'To sign you in, review your listings, help you find buyers and keep the service safe.',
          'We use newsletter details only to send updates you asked for.',
        ],
      },
      {
        heading: 'Who can see it',
        paragraphs: [
          'The admin in charge of your listing can see your name and phone number so they can reach you.',
          'Other admins in your region see your listing with your name and phone number hidden. The Global Admin can see everything.',
          'We do not sell your details.',
        ],
      },
      {
        heading: 'Where it is kept',
        paragraphs: [
          'Your data is stored with our database and file storage provider, Supabase. The website runs on Vercel. Telegram carries your sign-in code.',
          'These providers may keep data on servers outside Nigeria. We choose providers that protect data with access controls and encryption in transit.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'We keep your account and listings while you use OBN NATION. Unfinished drafts are deleted automatically after a short time.',
          'Ask us and we will delete your account, your listings and your newsletter details, unless the law says we must keep something.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'We follow the Nigeria Data Protection Act 2023.',
          'You can ask to see your data, correct it, or delete it. You can stop the newsletter at any time.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [CONTACT],
      },
    ],
  },
};
