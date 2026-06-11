"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi, type LoginRequest } from "@/lib/api/auth";
import { useAuthStore, type AuthUser } from "@/stores/auth-store";

export function useNewCaptcha() {
  return useQuery({
    queryKey: ["captcha"],
    queryFn: () => authApi.newCaptcha(),
    staleTime: 4 * 60 * 1000, // 4 min (captcha expires in 5)
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();
  return useMutation({
    mutationFn: (input: LoginRequest) => authApi.login(input),
    onSuccess: (data) => {
      const user: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.roleName,
        name: `${data.user.firstName} ${data.user.lastName}`.trim() || data.user.username,
        isSystemRole: data.user.isSystemRole,
        permissions: data.user.permissions,
      };
      setAuth(user, data.accessToken, data.refreshToken);
      toast.success(data.user.username + " เข้าสู่ระบบสำเร็จ");
      router.push("/dashboard");
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(refreshToken ?? undefined),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push("/login");
    },
  });
}
