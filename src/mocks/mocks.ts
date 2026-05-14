import {
  FeedItem,
  Property,
  ChatSession,
  MatchGroup,
  User as UserType,
} from "../types";

export const MOCK_USER: UserType = {
  id: "me",
  name: "Alex Johnson",
  avatar: "https://picsum.photos/100/100?random=100",
  isFollowing: false,
  role: "Agent",
  rating: 4.9,
};

export const MOCK_PROPERTIES: Property[] = [
  {
    id: "1",
    title: "Modern Downtown Loft",
    price: 450000,
    currency: "USD",
    location: {
      address: "123 Market St",
      city: "Downtown",
      country: "USA",
      state: "CA",
      colony: "Financial Dist",
    },
    images: [
      "https://picsum.photos/600/400?random=1",
      "https://picsum.photos/600/400?random=101",
    ],
    features: {
      beds: 2,
      baths: 2,
      constructionSqft: 1200,
      landSqft: 0,
      parking: 1,
    },
    amenities: ["Gym", "Pool"],
    type: "habitacional",
    subtype: "Departamento",
    operation: "Sale",
    status: "Publicada"
  },
  {
    id: "2",
    title: "Suburban Family Home",
    price: 650000,
    currency: "USD",
    location: {
      address: "45 Maple Ave",
      city: "Suburbs",
      country: "USA",
      state: "CA",
      colony: "Oak Park",
    },
    images: ["https://picsum.photos/600/400?random=2"],
    features: {
      beds: 4,
      baths: 3,
      constructionSqft: 2500,
      landSqft: 5000,
      parking: 2,
    },
    amenities: ["Garden", "Patio"],
    type: "habitacional",
    subtype: "Casa (Fracc. Abierto)",
    operation: "Sale",
    status: "Reservada"
  },
  {
    id: "3",
    title: "Luxury Villa",
    price: 1250000,
    currency: "USD",
    location: {
      address: "88 Hilltop Dr",
      city: "Beverly Hills",
      country: "USA",
      state: "CA",
      colony: "The Hills",
    },
    images: ["https://picsum.photos/600/400?random=3"],
    features: {
      beds: 5,
      baths: 5,
      constructionSqft: 4500,
      landSqft: 6000,
      parking: 3,
    },
    amenities: ["Pool", "Cinema", "Wine Cellar"],
    type: "habitacional",
    subtype: "Casa",
    operation: "Sale",
    status: "Publicada"
  },
];

export const MOCK_FEED: FeedItem[] = [
  {
    id: "f1",
    type: "reel",
    user: {
      ...MOCK_USER,
      name: "Sarah Realtor",
      id: "u2",
      isFollowing: false,
      rating: 4.8,
    },
    content: "Check out this amazing kitchen renovation!",
    images: ["https://picsum.photos/400/800?random=4"],
    likes: 243,
    comments: 2,
    timestamp: "2h ago",
    commentsList: [
      {
        id: "c1",
        user: { ...MOCK_USER, name: "John Doe", id: "u4" },
        text: "Wow, looks incredible!",
        timestamp: "1h ago",
      },
      {
        id: "c2",
        user: { ...MOCK_USER, name: "Alice Architecture", id: "u5" },
        text: "Love the backsplash!",
        timestamp: "30m ago",
      },
    ],
  },
  {
    id: "f2",
    type: "property",
    user: {
      ...MOCK_USER,
      name: "Best Homes Inc",
      id: "u3",
      isFollowing: true,
      rating: 5.0,
    },
    content: "Just listed! Open house this Sunday.",
    propertyDetails: MOCK_PROPERTIES[0],
    likes: 45,
    comments: 1,
    timestamp: "4h ago",
    commentsList: [
      {
        id: "c3",
        user: { ...MOCK_USER, name: "Mike Client", id: "u3" },
        text: "Is the price negotiable?",
        timestamp: "2h ago",
      },
    ],
  },
  {
    id: "f3",
    type: "post",
    user: {
      ...MOCK_USER,
      name: "John Doe",
      id: "u4",
      isFollowing: false,
      rating: 4.2,
    },
    content: "Does anyone know a good inspector in the North Bay area?",
    images: [],
    likes: 8,
    comments: 0,
    timestamp: "5h ago",
    commentsList: [],
  },
  {
    id: "f4",
    type: "post",
    user: {
      ...MOCK_USER,
      name: "Alice Architecture",
      id: "u5",
      isFollowing: true,
      rating: 4.9,
    },
    content: "New project sketches for the marina complex.",
    images: [
      "https://picsum.photos/600/600?random=20",
      "https://picsum.photos/600/600?random=21",
      "https://picsum.photos/600/600?random=22",
    ],
    likes: 156,
    comments: 3,
    timestamp: "6h ago",
    commentsList: [
      {
        id: "c4",
        user: { ...MOCK_USER, name: "Sarah Realtor", id: "u2" },
        text: "Stunning work Alice!",
        timestamp: "5h ago",
      },
      {
        id: "c5",
        user: { ...MOCK_USER, name: "Best Homes Inc", id: "u3" },
        text: "When can we see more?",
        timestamp: "4h ago",
      },
      {
        id: "c6",
        user: { ...MOCK_USER, name: "John Doe", id: "u4" },
        text: "Impressive details.",
        timestamp: "3h ago",
      },
    ],
  },
];

export const MOCK_MATCHES: MatchGroup[] = [
  {
    id: "g1",
    title: "John - Investment Props",
    type: "Lead",
    properties: [MOCK_PROPERTIES[0]],
  },
  {
    id: "g2",
    title: "Downtown Search",
    type: "Search",
    properties: [MOCK_PROPERTIES[0], MOCK_PROPERTIES[2]],
  },
];

export const MOCK_CHATS: ChatSession[] = [
  {
    id: "c1",
    user: {
      id: "u2",
      name: "Sarah Realtor",
      avatar: "https://picsum.photos/100/100?random=100",
      isFollowing: true,
      role: "Agent",
    },
    lastMessage: "Is the property still available?",
    unread: 2,
    tags: [{ id: "t1", name: "Buyer", color: "Blue" }],
    messages: [
      {
        id: "m1",
        senderId: "u2",
        text: "Hi! I saw your listing.",
        timestamp: "10:00 AM",
        type: "text",
      },
      {
        id: "m2",
        senderId: "u2",
        text: "Is the property still available?",
        timestamp: "10:01 AM",
        type: "text",
      },
    ],
  },
  {
    id: "c2",
    user: {
      id: "u3",
      name: "Mike Client",
      avatar: "https://picsum.photos/100/100?random=50",
      isFollowing: false,
      role: "User",
    },
    lastMessage: "📅 Appointment Scheduled",
    unread: 0,
    tags: [{ id: "t2", name: "Lead", color: "Teal" }],
    messages: [
      {
        id: "m3",
        senderId: "me",
        text: "When would you like to visit?",
        timestamp: "Yesterday",
        type: "text",
      },
      {
        id: "m4",
        senderId: "u3",
        text: "Tomorrow works for me.",
        timestamp: "Yesterday",
        type: "text",
      },
      {
        id: "m5",
        senderId: "me",
        text: "",
        timestamp: "Yesterday",
        type: "appointment",
        appointmentDate: "Tomorrow at 14:00",
        appointmentStatus: "pending",
      },
    ],
  },
];
