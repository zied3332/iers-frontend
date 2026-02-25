// Utilitaire pour la carte utilisateur dans la sidebar (photo + nom).
// Utilise les mêmes clés que le profil pour l'avatar (localStorage).

const AVATAR_KEY = "intellihr_avatar";
const USER_KEY = "user";

export type SidebarUserCard = {
  name: string;
  sub?: string;
  avatarUrl?: string;
};

function getStoredAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(`${AVATAR_KEY}_${userId}`);
  } catch {
    return null;
  }
}

function getSubByRole(role: string): string {
  const r = (role || "").toUpperCase();
  if (r === "HR") return "Admin & HR tools";
  if (r === "MANAGER") return "Team overview";
  return "My learning space";
}

/**
 * Lit le user depuis localStorage (stocké au login) et l'avatar (stocké par la page Profil).
 * Utilisé par les layouts pour afficher la carte "Signed in as" en bas à gauche.
 */
export function getSidebarUserCard(defaultName: string, defaultSub: string): SidebarUserCard {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return { name: defaultName, sub: defaultSub };

    const user = JSON.parse(raw) as { name?: string; role?: string; _id?: string; id?: string };
    const userId = user?._id ?? user?.id;
    const avatarUrl = userId ? getStoredAvatar(userId) : null;

    return {
      name: (user?.name as string) || defaultName,
      sub: defaultSub || getSubByRole(user?.role),
      avatarUrl: avatarUrl || undefined,
    };
  } catch {
    return { name: defaultName, sub: defaultSub };
  }
}
