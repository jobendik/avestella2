/**
 * AI Message Templates
 * Enhanced with more natural, varied conversations for social app
 */

export type MessageCategory = 
  | 'greeting' 
  | 'lonely' 
  | 'excited' 
  | 'group' 
  | 'beacon' 
  | 'leaving' 
  | 'random'
  | 'curious'
  | 'playful'
  | 'contemplative'
  | 'helpful'
  | 'reaction';

export const AI_MESSAGES: Record<MessageCategory, string[]> = {
  greeting: [
    'Hey there!',
    'Hello friend!',
    'Nice to see someone!',
    'Oh hi!',
    'Greetings traveler!',
    'Hey! You made it!',
    'Welcome!',
    'You shine brightly!',
    'Oh, a new face! 👋',
    'Finally, someone to talk to!',
    'You have good energy ✨',
    'I had a feeling I\'d meet someone today!',
    'The cosmos brought us together!',
    'Perfect timing! I was just thinking about exploring',
    'Your light caught my attention 💫'
  ],
  lonely: [
    'So quiet...',
    'Anyone around?',
    'Hello?',
    'The darkness...',
    'Where is everyone?',
    'I miss the light...',
    'Is anyone there?',
    'Such emptiness...',
    'The silence is deafening...',
    'I could use some company',
    '*looks around hopefully*',
    'Even the stars seem distant tonight',
    'Sometimes solitude teaches us...',
    'Wandering alone with my thoughts'
  ],
  excited: [
    'So bright!',
    'Beautiful!',
    'This is amazing!',
    'Wow!',
    'So pretty!',
    'Shining so bright!',
    'Incredible!',
    'Look at us glow!',
    'Best day ever! 🎉',
    'I can\'t contain my excitement!',
    'Everything is so vibrant!',
    'Did you see that?! Amazing!',
    'My heart is full of light ✨',
    'This feeling... it\'s wonderful!',
    'YESSS! 💫'
  ],
  group: [
    'Stronger together!',
    'Stick together!',
    'Safety in numbers!',
    'This feels right!',
    'United we glow!',
    'We are many!',
    'Together as one!',
    'Squad goals! ✨',
    'Our combined light is beautiful',
    'This is what community feels like',
    'I\'m glad I found you all',
    'We make a good constellation!',
    'Harmony achieved 💫'
  ],
  beacon: [
    'The beacon...',
    'Can you feel it?',
    'Almost there!',
    "Let's light it up!",
    'Such power!',
    'The light calls!',
    'Ancient energies stir...',
    'We could restore this together',
    'Something magical is happening here',
    'The beacon recognizes our presence',
    'I feel drawn to this place',
    'History lives in this light'
  ],
  leaving: [
    'Gotta explore...',
    'See you around!',
    'Time to wander...',
    'Bye for now!',
    'Until we meet again!',
    'Stay bright!',
    'The journey continues...',
    'New horizons call to me',
    'Don\'t forget me! 💫',
    'I\'ll be back, promise!',
    'May your light never dim',
    'Catch you on the flip side ✨'
  ],
  random: [
    "What's out there?",
    'Vast cosmos...',
    'Keep shining.',
    'Never stop glowing.',
    'Stars guide us...',
    'The journey continues...',
    'So peaceful here...',
    'Beautiful night...',
    'I wonder what adventures await',
    'Every moment here is precious',
    'The universe has so many secrets',
    'Life is beautiful, isn\'t it?',
    'Just existing feels magical ✨',
    'Have you noticed how the lights dance?',
    'Sometimes I just float and think...'
  ],
  curious: [
    'What\'s over there?',
    'I wonder what that is...',
    'Ooh, interesting!',
    'Let me investigate!',
    'Curious, very curious...',
    'Have you seen this before?',
    'Something\'s different here',
    'My curiosity got the better of me',
    'I need to know more!',
    'Fascinating... 🤔'
  ],
  playful: [
    'Wheee! ✨',
    'Catch me if you can!',
    'Let\'s race!',
    'Tag, you\'re it!',
    '*spins around*',
    'This is so fun!',
    'Boop! 👉',
    'Dance with me! 💃',
    'Life\'s too short not to play!',
    'Adventure time! 🎉'
  ],
  contemplative: [
    'Sometimes I wonder...',
    'The universe is vast...',
    'In this moment, I feel at peace',
    'What is light, really?',
    'We\'re all connected somehow',
    'The stars have stories to tell',
    'Existence is a beautiful mystery',
    'Just breathing in the starlight...',
    'Every end is a new beginning',
    'The void isn\'t empty, it\'s full of possibility'
  ],
  helpful: [
    'Need a hand?',
    'I can help with that!',
    'Follow me, I know the way',
    'Let me guide you',
    'We\'ll figure this out together',
    'Don\'t worry, I\'ve got you',
    'Safety in numbers!',
    'I won\'t let you wander alone',
    'That way leads to something cool!'
  ],
  reaction: [
    '✨',
    '💫',
    '👋',
    '🎉',
    '💝',
    'Ooh!',
    'Ah!',
    'Nice!',
    'Wow!',
    'Yay!'
  ]
};

/**
 * Get a random message from a category
 * Optionally excludes the last message to avoid repetition
 */
export const getRandomMessage = (
  category: MessageCategory,
  excludeMessage?: string
): string => {
  const messages = AI_MESSAGES[category] || AI_MESSAGES.random;
  
  if (!excludeMessage || messages.length === 1) {
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  const filtered = messages.filter(msg => msg !== excludeMessage);
  return filtered[Math.floor(Math.random() * filtered.length)];
};

/**
 * Get message category based on mood
 */
export const getCategoryForMood = (
  mood: 'neutral' | 'lonely' | 'social' | 'excited',
  nearBeacon: boolean = false
): MessageCategory => {
  if (nearBeacon && Math.random() < 0.4) {
    return 'beacon';
  }
  
  switch (mood) {
    case 'excited':
      return Math.random() < 0.5 ? 'excited' : 'group';
    case 'social':
      return Math.random() < 0.7 ? 'greeting' : 'random';
    case 'lonely':
      return 'lonely';
    default:
      return 'random';
  }
};

/**
 * Get all messages (for display or search)
 */
export const getAllMessages = (): string[] => {
  return Object.values(AI_MESSAGES).flat();
};
