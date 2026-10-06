export type AppRole = 'citizen' | 'admin' | 'coordinator';

export interface CurrentUser {
  id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export const roleHomePath: Record<AppRole, string> = {
  citizen: '/citizen',
  admin: '/admin',
  coordinator: '/coordinator',
};
