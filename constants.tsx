
import { Professional, Project, Review } from './types';

const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    reviewerName: 'Alice Smith',
    reviewerAvatar: 'https://picsum.photos/seed/alice/100/100',
    rating: 5,
    comment: 'Marcus was incredible. He fixed our wiring issues in half the time expected. Very professional!',
    date: '2 days ago',
    aspects: { quality: 5, communication: 5, timeliness: 5 }
  },
  {
    id: 'r2',
    reviewerName: 'Bob Johnson',
    reviewerAvatar: 'https://picsum.photos/seed/bob/100/100',
    rating: 4,
    comment: 'Great work on the panel upgrade. A bit late for the first appointment but the quality is top-notch.',
    date: '1 week ago',
    aspects: { quality: 5, communication: 4, timeliness: 3 }
  }
];

export const MOCK_PROS: Professional[] = [
  {
    id: '1',
    name: 'Marcus Thorne',
    specialty: 'Master Electrician',
    category: 'Electrical',
    rating: 4.9,
    reviewCount: 42,
    experience: '15 Years',
    location: 'Downtown, Seattle',
    avatar: 'https://picsum.photos/seed/marcus/200/200',
    bio: 'Specializing in residential rewiring, smart home integration, and emergency electrical repairs. I focus on safety and efficient modern solutions.',
    skills: ['Rewiring', 'EV Chargers', 'Smart Panels', 'Safety Inspections'],
    portfolio: [
      { id: 'p1', imageUrl: 'https://picsum.photos/seed/p1/600/400', title: 'Modern Panel Upgrade', description: 'Complete overhaul of a 1950s electrical panel.' },
      { id: 'p2', imageUrl: 'https://picsum.photos/seed/p2/600/400', title: 'Outdoor Lighting', description: 'Smart LED integration for a backyard patio.' }
    ],
    hourlyRate: '$85/hr',
    availability: 'Available Now',
    reviews: MOCK_REVIEWS
  },
  {
    id: '2',
    name: 'Sarah Chen',
    specialty: 'Landscape Architect',
    category: 'Design',
    rating: 4.8,
    reviewCount: 28,
    experience: '8 Years',
    location: 'Bellevue, WA',
    avatar: 'https://picsum.photos/seed/sarah/200/200',
    bio: 'Bringing nature back to urban spaces. I design sustainable, drought-resistant gardens that look stunning year-round.',
    skills: ['Drought-Resistant Plants', '3D Modeling', 'Permaculture', 'Hardscaping'],
    portfolio: [
      { id: 'p3', imageUrl: 'https://picsum.photos/seed/p3/600/400', title: 'Zen Garden', description: 'Minimalist stone and moss garden design.' }
    ],
    hourlyRate: '$120/hr',
    availability: 'Available Next Week',
    reviews: []
  },
  {
    id: '3',
    name: 'Julian Vane',
    specialty: 'Expert Plumber',
    category: 'Plumbing',
    rating: 4.7,
    reviewCount: 89,
    experience: '12 Years',
    location: 'Renton, WA',
    avatar: 'https://picsum.photos/seed/julian/200/200',
    bio: 'From leaky faucets to full bathroom remodels, I provide reliable plumbing services with a focus on durability.',
    skills: ['Pipe Fitting', 'Water Heaters', 'Emergency Repair', 'Remodeling'],
    portfolio: [],
    hourlyRate: '$95/hr',
    availability: 'Busy',
    reviews: []
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    title: 'Modern Patio Deck',
    status: 'completed',
    lastUpdated: 'Completed',
    summary: 'Building a 12x12 cedar deck with integrated LED lighting.',
    assignedProId: '1',
    assignedProName: 'Marcus Thorne',
    aiMessages: [],
    expertMessages: [],
    media: [],
    files: [],
    summaries: [
      { id: 's1', title: 'Final Build Report', content: 'Deck construction verified. Electrical integration for LEDs completed safely.', date: 'Oct 2023' }
    ]
  },
  {
    id: 'proj_2',
    title: 'Kitchen Backsplash',
    status: 'completed',
    lastUpdated: 'Completed',
    summary: 'Installed herringbone subway tiles with dark grout.',
    assignedProId: '2',
    assignedProName: 'Sarah Chen',
    aiMessages: [],
    expertMessages: [],
    media: [],
    files: [],
    summaries: [
      { id: 's2', title: 'Aesthetic Verification', content: 'Grout lines checked and sealed. Pattern alignment exceeds standard tolerances.', date: 'Nov 2023' }
    ]
  }
];
