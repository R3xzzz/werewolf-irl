import { ROLES } from './roles';

export type GameMode = 'casual' | 'chaos' | 'competitive';

/**
 * Returns an array of role IDs balanced for the number of players and mode.
 */
export function getAutoBalancedRoles(playerCount: number, mode: GameMode = 'casual'): string[] {
  let roles: string[] = [];

  // Minimum players supported for a somewhat decent game is 4
  if (playerCount < 4) {
    // Just default to basics if they force it
    roles.push('werewolf');
    while (roles.length < Math.max(playerCount, 1)) {
       roles.push('villager');
    }
    return roles.slice(0, playerCount);
  }

  // Base logic for Werewolf counts (rough standard: 1 wolf per 4 players)
  const wolfCount = Math.max(1, Math.floor(playerCount / 4));
  
  // Add Wolves
  if (mode === 'chaos' && playerCount >= 8) {
     roles.push('alpha_wolf');
     for(let i = 1; i < wolfCount; i++) roles.push('werewolf');
  } else {
     for(let i = 0; i < wolfCount; i++) roles.push('werewolf');
  }

  // Add Seer (almost always essential)
  roles.push('seer');

  // Add Bodyguard (good for 5+ players)
  if (playerCount >= 5) {
    roles.push('bodyguard');
  }

  // Add other roles based on mode and player count
  const remainingSlots = playerCount - roles.length;
  let specialVillageCount = 0;
  let neutralCount = 0;

  if (remainingSlots > 0) {
    if (mode === 'casual') {
       // Keep it simple: rest are villagers, maybe a hunter
       if (remainingSlots >= 2) roles.push('hunter');
    } 
    else if (mode === 'competitive') {
       // Balanced: Masons, Pacifist
       if (remainingSlots >= 3) {
          roles.push('hunter');
          roles.push('mason');
          roles.push('mason');
       } else if (remainingSlots >= 1) {
          roles.push('hunter');
       }
    }
    else if (mode === 'chaos') {
       // Random craziness
       const funRoles = ['tanner', 'drunk', 'cupid', 'doppelganger', 'cursed', 'troublemaker', 'idiot'];
       // Shuffle
       funRoles.sort(() => 0.5 - Math.random());
       
       for (let role of funRoles) {
          if (roles.length < playerCount) {
             roles.push(role);
          }
       }
    }
  }

  // Fill remainder with Villagers
  while (roles.length < playerCount) {
     roles.push('villager');
  }

  // Shuffle the final deck
  return roles.sort(() => 0.5 - Math.random());
}
