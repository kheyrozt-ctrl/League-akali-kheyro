/**
 * Queue names returned by the League Client are localized by the client itself.
 * Use stable queue IDs for the application UI so the selected application
 * language is respected instead of displaying the client's raw localized name.
 */
export const QUEUE_TYPE_BY_ID: Record<number, string> = {
  0: 'CUSTOM',
  420: 'RANKED_SOLO_5x5',
  430: 'NORMAL',
  440: 'RANKED_FLEX_SR',
  450: 'ARAM_UNRANKED_5x5',
  480: 'SWIFTPLAY',
  490: 'QUICKPLAY',
  830: 'BOT_INTRO',
  840: 'BOT_INTERMEDIATE',
  850: 'BOT_BEGINNER',
  900: 'URF',
  1700: 'CHERRY',
  1900: 'URF',
  2300: 'BRAWL'
}
