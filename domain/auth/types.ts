export interface AuthState {
  logged: boolean;
  user: { id: string; email: string; name: string } | null;
}
