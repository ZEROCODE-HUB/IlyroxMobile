/**
 * Auth hooks index
 */

export { useAuthForm } from "./useAuthForm";
export type { AuthFormState } from "./useAuthForm";

export { useExternalAuth } from "./useExternalAuth";
export type {
  AuthProvider,
  PendingExternalUser,
  ExternalAuthFormData,
} from "./useExternalAuth";
