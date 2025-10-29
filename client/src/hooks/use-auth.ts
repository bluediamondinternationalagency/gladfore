import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, type User } from "@/lib/auth";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}
