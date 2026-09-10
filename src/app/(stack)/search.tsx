import { useRouter } from "expo-router";
import SearchOverlay from "@/components/search/SearchOverlay";

export default function SearchScreen() {
  const router = useRouter();

  return (
    <SearchOverlay
      onClose={() => router.back()}
    />
  );
}
