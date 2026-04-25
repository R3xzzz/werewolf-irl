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
    name_id: 'Warga Desa',
    team: 'village',
    description: 'Find the werewolves and vote them out during the day.',
    desc_id: 'Temukan para werewolf dan keluarkan mereka saat siang hari.',
    hasNightAction: false,
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    name_id: 'Penerawang',
    team: 'village',
    description: 'Each night, wake up and discover the true team of one player.',
    desc_id: 'Setiap malam, bangun dan cari tahu tim asli dari satu pemain.',
    nightActionPriority: 20,
    hasNightAction: true,
  },
  bodyguard: {
    id: 'bodyguard',
    name: 'Bodyguard',
    name_id: 'Pengawal',
    team: 'village',
    description: 'Each night, protect one player from elimination. You cannot pick the same person twice.',
    desc_id: 'Setiap malam, lindungi satu pemain dari eliminasi. Tidak boleh asuh orang yang sama dua malam berturut-turut.',
    nightActionPriority: 30,
    hasNightAction: true,
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    name_id: 'Pemburu',
    team: 'village',
    description: 'If you are eliminated, you may instantly eliminate another player of your choice.',
    desc_id: 'Jika kamu tereliminasi, kamu bisa langsung membawa satu pemain lain untuk mati bersamamu.',
    hasNightAction: false,
  },
  idiot: {
    id: 'idiot',
    name: 'Village Idiot',
    name_id: 'Orang Bodoh',
    team: 'village',
    description: 'If you are voted out, you reveal your role and cannot be eliminated, but you lose your vote.',
    desc_id: 'Jika kamu divote keluar, buka kartumu untuk selamat dari kematian, tapi kamu kehilangan hak vote selamanya.',
    hasNightAction: false,
  },
  apprentice_seer: {
    id: 'apprentice_seer',
    name: 'Apprentice Seer',
    name_id: 'Murid Penerawang',
    team: 'village',
    description: 'You become the Seer if the Seer is eliminated.',
    desc_id: 'Kamu akan menjadi Penerawang jika Penerawang tereliminasi.',
    hasNightAction: false,
  },
  drunk: {
    id: 'drunk',
    name: 'Drunk',
    name_id: 'Pemabuk',
    team: 'village',
    description: 'You cannot communicate during the first day. You do not know your real role until night 3!',
    desc_id: 'Kamu tidak boleh bicara di hari pertama. Kamu baru mengetahui peran aslimu di malam ke-3!',
    hasNightAction: false,
  },
  mason: {
    id: 'mason',
    name: 'Mason',
    name_id: 'Mason',
    team: 'village',
    description: 'You wake up on the first night to see all other Masons.',
    desc_id: 'Kamu terbangun pada malam pertama untuk saling melihat dengan Mason lainnya.',
    nightActionPriority: 5,
    hasNightAction: true,
  },
  pacifist: {
    id: 'pacifist',
    name: 'Pacifist',
    name_id: 'Pencinta Damai',
    team: 'village',
    description: 'You must always vote for peace (no elimination) if possible.',
    desc_id: 'Kamu harus selalu memilih damai (tidak ada eliminasi) jika memungkinkan.',
    hasNightAction: false,
  },
  diseased: {
    id: 'diseased',
    name: 'Diseased',
    name_id: 'Si Penyakitan',
    team: 'village',
    description: 'If the werewolves eliminate you, they cannot eliminate anyone the following night.',
    desc_id: 'Jika werewolf memangsamu, mereka menjadi sakit dan tidak bisa memangsa siapa pun malam berikutnya.',
    hasNightAction: false,
  },
  troublemaker: {
    id: 'troublemaker',
    name: 'Troublemaker',
    name_id: 'Pembuat Onar',
    team: 'village',
    description: 'Once per game, during the day, you can choose two players to immediately trigger a deathmatch vote between them only.',
    desc_id: 'Sekali dalam game, kamu bisa memaksa dua pemain untuk saling bertarung dimana warga hanya boleh memvote salah satu dari mereka.',
    hasNightAction: false,
  },
  cupid: {
    id: 'cupid',
    name: 'Cupid',
    name_id: 'Dewa Cinta',
    team: 'village',
    description: 'On the first night, choose two players to be Lovers. If one dies, the other dies of a broken heart.',
    desc_id: 'Di malam pertama, pilih dua orang menjadi Kekasih. Jika salah satu mati, pasangannya akan ikut mati karena patah hati.',
    nightActionPriority: 2,
    hasNightAction: true,
  },
  
  // Evil / Werewolf
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    name_id: 'Manusia Serigala',
    team: 'werewolf',
    description: 'Wake up with the other werewolves each night and eliminate a player. Try to survive and outnumber the village.',
    desc_id: 'Bangun tiap malam bersama werewolf lain dan eliminasi satu pemain. Bertahan hidup sampai jumlah kalian melebihi warga.',
    nightActionPriority: 10,
    hasNightAction: true,
  },
  alpha_wolf: {
    id: 'alpha_wolf',
    name: 'Alpha Wolf',
    name_id: 'Serigala Alpha',
    team: 'werewolf',
    description: 'A werewolf, but once per game you can turn a victim into a werewolf instead of eliminating them.',
    desc_id: 'Manusia Serigala biasa, tapi sekali dalam game kamu berhak mengubah korban menjadi manusia serigala daripada membunuhnya.',
    nightActionPriority: 10,
    hasNightAction: true,
    isAlwaysAwakeWith: ['werewolf'],
  },

  // Independent / Neutral
  tanner: {
    id: 'tanner',
    name: 'Tanner',
    name_id: 'Si Tukang Kulit',
    team: 'neutral',
    description: 'You hate your job and want to die. You only win if you are voted out during the day.',
    desc_id: 'Kamu benci hidupmu dan ingin mati. Kamu HANYA menang jika kamu divote keluar oleh warga saat siang hari.',
    hasNightAction: false,
  },
  cursed: {
    id: 'cursed',
    name: 'Cursed',
    name_id: 'Dikutuk',
    team: 'village',
    description: 'You play for the village, but if the werewolves target you, you DO NOT die. Instead, you instantly become a werewolf.',
    desc_id: 'Awalnya kamu membela warga. Tapi jika Werewolf memakanmu malam hari, kamu TIDAK MATI. Malah, kamu langsung berubah menjadi Werewolf.',
    hasNightAction: false,
  },
  doppelganger: {
    id: 'doppelganger',
    name: 'Doppelgänger',
    name_id: 'Peniru',
    team: 'neutral',
    description: 'On the first night, you choose a player. When that player dies, you secretly take on their role and team.',
    desc_id: 'Pada malam pertama, pilih satu pemain. Ketika pemain itu mati, diam-diam kamu mewarisi peran dan tim mereka.',
    nightActionPriority: 1,
    hasNightAction: true,
  }
};

export const getAllRoles = () => Object.values(ROLES);
export const getRolesByTeam = (team: Team) => getAllRoles().filter(r => r.team === team);
export const getNightActionRoles = () => getAllRoles().filter(r => r.hasNightAction).sort((a, b) => (a.nightActionPriority || 99) - (b.nightActionPriority || 99));
