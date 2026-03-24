import { Mic } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui-kit";

export default function FloatingMicButton() {
  const [location, setLocation] = useLocation();

  if (location.startsWith("/auth")) {
    return null;
  }

  const handleClick = () => {
    const target = "/ai?listen=1";
    if (location.startsWith("/ai")) {
      setLocation(target);
      return;
    }
    setLocation(target);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        variant="gradient"
        size="lg"
        className="rounded-full w-14 h-14 p-0 shadow-2xl"
        onClick={handleClick}
        aria-label="Open voice assistant"
      >
        <Mic size={22} />
      </Button>
    </div>
  );
}
