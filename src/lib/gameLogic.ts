import { ROLES } from './roles';

export type GameMode = 'casual' | 'chaos' | 'competitive' | 'custom';

/**
 * Returns an array of role IDs balanced for the number of players and mode.
 */
export function getAutoBalancedRoles(playerCount: number, mode: GameMode = 'casual', customRoles: string[] = []): string[] {
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

  const wolfCount = Math.max(1, Math.floor(playerCount / 4));

  if (mode === 'custom' && customRoles.length > 0) {
     // Separate chosen roles into wolves and others
     const chosenWolves = customRoles.filter(r => ROLES[r]?.team === 'werewolf');
     const chosenOthers = customRoles.filter(r => ROLES[r]?.team !== 'werewolf' && r !== 'villager');
     
     // If they selected alpha_wolf, ensure normal werewolf is ALSO added so alpha wolf doesn't replace it
     if (chosenWolves.includes('alpha_wolf') && !chosenWolves.includes('werewolf')) {
        chosenWolves.push('werewolf');
     }

     // Add Wolves from the custom pool
     for (let i = 0; i < wolfCount; i++) {
        if (chosenWolves.length > 0) {
           roles.push(chosenWolves[i % chosenWolves.length]);
        } else {
           roles.push('werewolf'); // Fallback if no wolves selected
        }
     }
     
     // Failsafe: if we specifically chose alpha_wolf and it got pushed out by loop length/wolfCount
     // Or if they wanted both but wolfCount was only 1.
     if (customRoles.includes('alpha_wolf') && !roles.includes('alpha_wolf')) {
        roles.push('alpha_wolf');
     }

     // Add non-wolf custom roles
     let addedMasons = 0;
     for (const r of chosenOthers) {
        if (roles.length < playerCount) {
           roles.push(r);
           if (r === 'mason') addedMasons++;
        }
     }
     
     // Masons should ideally be at least 2
     if (addedMasons === 1 && roles.length < playerCount) {
        roles.push('mason');
     }

     // Fill remainder with Villagers
     while (roles.length < playerCount) {
        roles.push('villager');
     }

     return roles.sort(() => 0.5 - Math.random());
  }
  
  // Base logic for Werewolf counts (rough standard: 1 wolf per 4 players)
  
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
