export type Team = 'village' | 'werewolf' | 'neutral';

export interface RoleDefinition {
  id: string;
  name: string;
  name_id: string;
  team: Team;
  description: string;
  desc_id: string;
  nightActionPriority?: number;
  hasNightAction: boolean;
  isAlwaysAwakeWith?: string[];
  iconUrl?: string;
}

export const ROLES: Record<string, RoleDefinition> = {
  villager: {
    id: 'villager',
    name: 'Villager',
    name_id: 'Warga Desa (Villager)',
    team: 'village',
    description: 'A normal citizen with no special powers. Use your intuition to discuss and eliminate Werewolves during the day.',
    desc_id: 'Warga biasa tanpa kekuatan spesial. Gunakan instingmu untuk berdiskusi dan mengeliminasi Serigala di siang hari.',
    hasNightAction: false,
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    name_id: 'Penerawang (Seer)',
    team: 'village',
    description: 'Each night, choose 1 player to learn their true role.',
    desc_id: 'Setiap malam, pilih 1 pemain untuk mengetahui peran aslinya.',
    nightActionPriority: 20,
    hasNightAction: true,
  },
  bodyguard: {
    id: 'bodyguard',
    name: 'Bodyguard',
    name_id: 'Pengawal (Bodyguard)',
    team: 'village',
    description: 'Each night, protect 1 player from being attacked. You cannot protect the same person two nights in a row.',
    desc_id: 'Setiap malam, pilih 1 pemain untuk dilindungi dari serangan Serigala. Kamu tidak bisa melindungi orang yang sama dua malam berturut-turut.',
    nightActionPriority: 30,
    hasNightAction: true,
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    name_id: 'Pemburu (Hunter)',
    team: 'village',
    description: 'If you are eliminated, you can immediately shoot and eliminate 1 other player to die with you.',
    desc_id: 'Jika kamu tereliminasi, kamu bisa menembak mati 1 pemain lain untuk ikut gugur bersamamu.',
    hasNightAction: false,
  },
  idiot: {
    id: 'idiot',
    name: 'Village Idiot',
    name_id: 'Orang Bodoh (Village Idiot)',
    team: 'village',
    description: 'If the village votes you out, you survive! However, you lose your right to vote for the rest of the game.',
    desc_id: 'Jika kamu divoting mati oleh warga, kamu tidak akan mati! Tapi, kamu akan kehilangan hak pilihmu (vote) selamanya.',
    hasNightAction: false,
  },
  apprentice_seer: {
    id: 'apprentice_seer',
    name: 'Apprentice Seer',
    name_id: 'Murid Penerawang (Apprentice Seer)',
    team: 'village',
    description: 'You automatically become the new Seer if the original Seer is eliminated.',
    desc_id: 'Kamu akan otomatis menggantikan peran Penerawang apabila ia tereliminasi.',
    hasNightAction: false,
  },
  drunk: {
    id: 'drunk',
    name: 'Drunk',
    name_id: 'Pemabuk (Drunk)',
    team: 'village',
    description: 'You are too drunk to speak on the first day. You won\'t discover your true role until the third night.',
    desc_id: 'Kamu belum sadar sepenuhnya. Kamu tidak boleh bicara di hari pertama, dan baru mengetahui peran aslimu di malam ke-3.',
    hasNightAction: false,
  },
  mason: {
    id: 'mason',
    name: 'Mason',
    name_id: 'Mason (Mason)',
    team: 'village',
    description: 'Wake up on the first night to secretly recognize all other Masons in the game.',
    desc_id: 'Terbangun di malam pertama untuk saling mengetahui identitas dengan sesama Mason lainnya.',
    nightActionPriority: 5,
    hasNightAction: true,
  },
  pacifist: {
    id: 'pacifist',
    name: 'Pacifist',
    name_id: 'Pencinta Damai (Pacifist)',
    team: 'village',
    description: 'Acts at start of day, may skip one voting day once per game.',
    desc_id: 'Beraksi di awal hari, dapat meniadakan satu hari voting sekali per permainan.',
    hasNightAction: false,
  },
  diseased: {
    id: 'diseased',
    name: 'Diseased',
    name_id: 'Si Penyakitan (Diseased)',
    team: 'village',
    description: 'If the Werewolves eat you, they get sick and cannot attack anyone on the following night.',
    desc_id: 'Jika kamu dimakan Serigala, penyakitmu akan menular. Para Serigala tidak akan bisa memangsa siapapun di malam berikutnya.',
    hasNightAction: false,
  },
  troublemaker: {
    id: 'troublemaker',
    name: 'Troublemaker',
    name_id: 'Pembuat Onar (Troublemaker)',
    team: 'village',
    description: 'Acts at start of day, may once per game restrict voting to two players.',
    desc_id: 'Beraksi di awal hari, dapat membatasi voting hanya pada dua orang sekali per permainan.',
    hasNightAction: false,
  },
  cupid: {
    id: 'cupid',
    name: 'Cupid',
    name_id: 'Dewa Cinta (Cupid)',
    team: 'village',
    description: 'On Night 1, choose 2 players to become Lovers. If one dies, the other dies as well. If both survive together, they may win together.',
    desc_id: 'Di malam pertama, pasangkan 2 pemain sebagai Kekasih. Jika salah satu mati, pasangannya akan ikut mati. Jika kalian bertahan hidup bersama, kalian bisa menang bersama.',
    nightActionPriority: 2,
    hasNightAction: true,
  },
  
  // Evil / Werewolf
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    name_id: 'Manusia Serigala (Werewolf)',
    team: 'werewolf',
    description: 'Each night, wake up with the other Wolves to eat 1 player. Survive until Wolves outnumber the Village.',
    desc_id: 'Setiap malam, bangun bersama Serigala lain untuk memangsa 1 warga. Bertahanlah sampai jumlah warga kalah banyak dari Serigala.',
    nightActionPriority: 10,
    hasNightAction: true,
  },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Alpha Wolf',
    name_id: 'Serigala Alpha (Alpha Wolf)',
    team: 'werewolf',
    description: 'The leader of the pack. Once per game, you may bite a victim to turn them into a Werewolf instead of killing them.',
    desc_id: 'Kamu adalah pimpinan Serigala. Sekali dalam game, kamu bisa menggigit dan mengubah satu warga menjadi Serigala baru.',
    nightActionPriority: 15,
    hasNightAction: true,
    isAlwaysAwakeWith: ['werewolf'],
  },

  // Independent / Neutral
  tanner: {
    id: 'tanner',
    name: 'Tanner',
    name_id: 'Si Tukang Kulit (Tanner)',
    team: 'neutral',
    description: 'You hate your job and just want to die. You ONLY win if you successfully get the village to vote you out.',
    desc_id: 'Kamu benci pekerjaanmu dan ingin mati. Kamu HANYA bisa menang jika berhasil meyakinkan warga untuk memvotingmu keluar.',
    hasNightAction: false,
  },
  cursed: {
    id: 'cursed',
    name: 'Cursed',
    name_id: 'Dikutuk (Cursed)',
    team: 'village',
    description: 'You play for the Village, but if the Wolves attack you at night, you survive and instantly become a Werewolf!',
    desc_id: 'Kamu bermain sebagai warga biasa, tapi jika Serigala memangsamu malam hari, kamu selamat dan otomatis berubah menjadi Serigala!',
    hasNightAction: false,
  },
  doppelganger: {
    id: 'doppelganger',
    name: 'Doppelgänger',
    name_id: 'Peniru (Doppelgänger)',
    team: 'neutral',
    description: 'On the first night, choose a player. When they die, you secretly inherit their exact role and team alignment.',
    desc_id: 'Di malam pertama, pilih satu pemain. Ketika pemain itu mati, secara rahasia kamu akan mewarisi peran dan timnya.',
    nightActionPriority: 1,
    hasNightAction: true,
  }
};

export const getAllRoles = () => Object.values(ROLES);
export const getRolesByTeam = (team: Team) => getAllRoles().filter(r => r.team === team);
export const getNightActionRoles = () => getAllRoles().filter(r => r.hasNightAction).sort((a, b) => (a.nightActionPriority || 99) - (b.nightActionPriority || 99));
