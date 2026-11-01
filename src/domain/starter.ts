import type { AIAdvice, EventBrief } from './types';

type Template = Omit<AIAdvice, 'summary' | 'cautions'> & { focus: string; caution: string };

const templates: Record<EventBrief['type'], Template> = {
  wedding: {
    focus: 'Keep the ceremony, guest experience and family responsibilities in one shared plan.',
    budget: [
      {
        category: 'Food & drinks',
        weight: 38,
        rationale: 'Set a per-guest menu allowance and check service, water and dietary needs.',
      },
      {
        category: 'Venue & rentals',
        weight: 24,
        rationale: 'Allow for the space, furniture, power and accessible facilities.',
      },
      {
        category: 'Decor & flowers',
        weight: 12,
        rationale: 'Prioritise the ceremony and shared gathering areas.',
      },
      {
        category: 'Photography',
        weight: 12,
        rationale: 'Define coverage hours and deliverables before comparing packages.',
      },
      {
        category: 'Ceremony & entertainment',
        weight: 8,
        rationale: 'Account for ceremony supplies, sound and the chosen programme.',
      },
      {
        category: 'Guest logistics',
        weight: 6,
        rationale: 'Keep room for invitations, signs and local guest transport.',
      },
    ],
    tasks: [
      {
        title: 'Agree the ceremony format and family decision makers',
        daysBefore: 120,
        owner: 'Couple & families',
      },
      {
        title: 'Visit venues and check access, capacity and weather backup',
        daysBefore: 90,
        owner: 'Couple',
      },
      {
        title: 'Compare written catering and photography quotes',
        daysBefore: 75,
        owner: 'Planning lead',
      },
      { title: 'Build the guest list and send invitations', daysBefore: 60, owner: 'Families' },
      {
        title: 'Confirm ceremony needs and supplier cancellation terms',
        daysBefore: 45,
        owner: 'Planning lead',
      },
      {
        title: 'Collect RSVPs, meal preferences and access requirements',
        daysBefore: 21,
        owner: 'Guest coordinator',
      },
      {
        title: 'Share the event schedule and supplier contact sheet',
        daysBefore: 7,
        owner: 'Planning lead',
      },
      {
        title: 'Confirm final meal count and outstanding payments',
        daysBefore: 3,
        owner: 'Couple',
      },
      {
        title: 'Check seating, ceremony items and the emergency kit',
        daysBefore: 1,
        owner: 'Family helpers',
      },
      {
        title: 'Brief suppliers and confirm guest arrival support',
        daysBefore: 0,
        owner: 'Day coordinator',
      },
    ],
    vendors: [
      {
        category: 'Venue',
        questions: [
          'Is the space available on our date, and what is the safe seated capacity?',
          'Are step-free access, toilets, power and a weather backup included?',
          'What are the deposit, cancellation, overtime and cleanup terms?',
        ],
      },
      {
        category: 'Catering',
        questions: [
          'What is included per guest, including staff, water and taxes?',
          'How do you handle allergies, vegetarian meals and final guest-count changes?',
          'Can we approve a tasting and receive a written service schedule?',
        ],
      },
      {
        category: 'Photography',
        questions: [
          'Who will cover the event and for how many hours?',
          'What are the delivery date, image rights, backup and cancellation terms?',
        ],
      },
      {
        category: 'Decor & sound',
        questions: [
          'Does the quote include setup, removal, transport and power?',
          'What venue restrictions and sound limits must we follow?',
        ],
      },
    ],
    ideas: [
      {
        title: 'A welcome table with a purpose',
        description:
          'Put the schedule, water and a clear contact person near the entrance so guests can settle in easily.',
      },
      {
        title: 'A shared family memory corner',
        description: 'Invite both families to contribute a few photographs and short captions.',
      },
      {
        title: 'One calm moment',
        description:
          'Protect a short break for the couple between the ceremony and the next activity.',
      },
    ],
    caution:
      'Confirm ceremony requirements with the people conducting it, and record who can approve supplier changes.',
  },
  birthday: {
    focus: 'Build a warm gathering around good food, a simple activity and time together.',
    budget: [
      {
        category: 'Food & drinks',
        weight: 38,
        rationale: 'Allow for meals or snacks, drinking water and dietary alternatives.',
      },
      {
        category: 'Venue & rentals',
        weight: 22,
        rationale: 'Set a practical allowance for space, seating and basic facilities.',
      },
      {
        category: 'Cake & treats',
        weight: 12,
        rationale: 'Match portions to the guest count and check ingredient allergies.',
      },
      {
        category: 'Activities & music',
        weight: 14,
        rationale: 'Choose a small number of activities suited to the guests.',
      },
      {
        category: 'Decor & invitations',
        weight: 9,
        rationale: 'Use a focused theme and reusable details where possible.',
      },
      {
        category: 'Photos & keepsakes',
        weight: 5,
        rationale:
          'Plan a simple way to record the celebration without assuming professional coverage.',
      },
    ],
    tasks: [
      {
        title: 'Choose the celebration style and confirm the guest list',
        daysBefore: 30,
        owner: 'Host',
      },
      { title: 'Confirm the venue and suitable activities', daysBefore: 21, owner: 'Host' },
      { title: 'Send invitations with RSVP and access details', daysBefore: 14, owner: 'Host' },
      {
        title: 'Order the cake and compare food options',
        daysBefore: 10,
        owner: 'Food coordinator',
      },
      { title: 'Confirm RSVPs, allergies and dietary preferences', daysBefore: 7, owner: 'Host' },
      {
        title: 'Share setup roles and a simple running order',
        daysBefore: 3,
        owner: 'Host & helpers',
      },
      {
        title: 'Check food collection, decorations and the music playlist',
        daysBefore: 1,
        owner: 'Helpers',
      },
      {
        title: 'Set up the welcome area and check the space is safe',
        daysBefore: 0,
        owner: 'Host & helpers',
      },
    ],
    vendors: [
      {
        category: 'Venue',
        questions: [
          'What is included, and is the space suitable for our guest ages and access needs?',
          'Are food, music, decorations and cleanup allowed within our booking time?',
        ],
      },
      {
        category: 'Food & cake',
        questions: [
          'Can you confirm portions, ingredients, allergens and vegetarian options?',
          'What are the collection or delivery time, final price and cancellation terms?',
        ],
      },
      {
        category: 'Activities or entertainment',
        questions: [
          'Is the activity appropriate for the guests, and what supervision is needed?',
          'Does the price include equipment, setup and any travel charges?',
        ],
      },
    ],
    ideas: [
      {
        title: 'A playlist from everyone',
        description:
          'Ask each guest for one favourite song with their RSVP and build a shared playlist.',
      },
      {
        title: 'A memory jar',
        description:
          'Leave cards for guests to write a favourite memory or a wish for the year ahead.',
      },
      {
        title: 'One easy shared activity',
        description:
          'Choose a photo prompt, short quiz or craft table that guests can join at their own pace.',
      },
    ],
    caution:
      'If children attend, agree supervision and collection arrangements with their guardians; check cake and snack allergens.',
  },
  community: {
    focus:
      'Make participation easy with clear volunteer roles, inclusive access and a practical public programme.',
    budget: [
      {
        category: 'Space & permissions',
        weight: 24,
        rationale: 'Check booking costs, local permissions and the conditions for public use.',
      },
      {
        category: 'Food & drinking water',
        weight: 24,
        rationale: 'Allow for safe refreshments and accessible drinking-water points.',
      },
      {
        category: 'Equipment & programme',
        weight: 22,
        rationale: 'Cover seating, sound, power and the planned activities.',
      },
      {
        category: 'Access & safety',
        weight: 16,
        rationale: 'Consider accessible facilities, first-aid arrangements and clear signage.',
      },
      {
        category: 'Outreach & signage',
        weight: 8,
        rationale: 'Use clear invitations and directions in languages relevant to the community.',
      },
      {
        category: 'Waste & cleanup',
        weight: 6,
        rationale: 'Plan collection points, reusable supplies and the final site handover.',
      },
    ],
    tasks: [
      {
        title: 'Agree the event purpose and name the organising leads',
        daysBefore: 60,
        owner: 'Organising team',
      },
      {
        title: 'Confirm site permission, capacity and any local requirements',
        daysBefore: 45,
        owner: 'Site coordinator',
      },
      {
        title: 'Review access, toilets, weather backup and safety needs',
        daysBefore: 30,
        owner: 'Access & safety lead',
      },
      {
        title: 'Recruit volunteers and assign clear shift responsibilities',
        daysBefore: 21,
        owner: 'Volunteer coordinator',
      },
      {
        title: 'Publish the programme, directions and participation details',
        daysBefore: 14,
        owner: 'Communications lead',
      },
      {
        title: 'Confirm suppliers, drinking water and waste collection',
        daysBefore: 7,
        owner: 'Logistics lead',
      },
      {
        title: 'Share emergency contacts, site map and volunteer briefing',
        daysBefore: 3,
        owner: 'Safety lead',
      },
      {
        title: 'Check the weather and communicate any programme changes',
        daysBefore: 1,
        owner: 'Event coordinator',
      },
      {
        title: 'Walk the site, brief volunteers and test equipment',
        daysBefore: 0,
        owner: 'All team leads',
      },
      {
        title: 'Assign cleanup and confirm the site handover checklist',
        daysBefore: 0,
        owner: 'Logistics lead',
      },
    ],
    vendors: [
      {
        category: 'Site or venue',
        questions: [
          'What permission, capacity, opening hours and public-event conditions apply?',
          'Are accessible toilets, drinking water and a sheltered backup available?',
          'Who handles first aid, public liability requirements and site handover?',
        ],
      },
      {
        category: 'Equipment & programme',
        questions: [
          'Does the quote include delivery, setup, testing and collection?',
          'What power, weather protection and operator support are needed?',
        ],
      },
      {
        category: 'Food & refreshments',
        questions: [
          'How will food safety, ingredient information and dietary options be handled?',
          'What are the final headcount, serving and waste arrangements?',
        ],
      },
      {
        category: 'Waste & facilities',
        questions: [
          'Where can bins and accessible facilities be placed?',
          'Who is responsible for collections, supplies and final cleanup?',
        ],
      },
    ],
    ideas: [
      {
        title: 'A clear welcome point',
        description:
          'Give newcomers one visible place to find the programme, access information and a helpful volunteer.',
      },
      {
        title: 'Community contribution board',
        description:
          'Invite local groups to share an idea, a skill or a small activity linked to the event purpose.',
      },
      {
        title: 'A quieter place to pause',
        description:
          'Offer a clearly signed area away from the busiest activity for guests who need a break.',
      },
    ],
    caution:
      'Check permissions and safety requirements with the venue or relevant local authority; a template cannot confirm compliance.',
  },
};

/** Authored local templates: this function makes no AI or vendor-service request. */
export function starterAdvice(brief: EventBrief): AIAdvice {
  const template = templates[brief.type];
  const priorities = brief.priorities.length
    ? ` Your priorities: ${brief.priorities.join(', ')}.`
    : '';
  const notes = brief.notes.trim()
    ? ' Review your event notes with the people responsible for each booking.'
    : '';
  return {
    summary: `A ${brief.type} for ${brief.guests.toLocaleString('en-IN')} guests in ${brief.location}. ${template.focus}${priorities}`,
    budget: template.budget.map((item) => ({ ...item })),
    tasks: template.tasks.map((task) => ({ ...task })),
    vendors: template.vendors.map((vendor) => ({ ...vendor, questions: [...vendor.questions] })),
    ideas: template.ideas.map((idea) => ({ ...idea })),
    cautions: [
      'This is an authored starter template, not an AI-generated plan. Adapt it to your event and confirm every booking.',
      'Budget amounts are planning allowances, not vendor quotes. A separate 10% reserve is included; edits do not rebalance the plan.',
      'Tasks whose suggested lead time has already passed are moved to today and marked urgent.',
      template.caution + notes,
    ],
  };
}
