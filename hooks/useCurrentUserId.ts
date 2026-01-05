import { useAuth } from "../context/AuthContext";

export const useCurrentUserId = (): string | undefined => {
  const { user } = useAuth();
  return user?.id;
};
