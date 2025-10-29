import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, User } from "lucide-react";

interface FarmerCardProps {
  farmerId: string;
  name: string;
  phone: string;
  onSelect?: () => void;
}

export default function FarmerCard({ farmerId, name, phone, onSelect }: FarmerCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-4 hover-elevate" data-testid={`farmer-card-${farmerId}`}>
      <div className="flex items-center gap-4">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-semibold" data-testid="text-farmer-name">{name}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {farmerId}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {phone}
            </span>
          </div>
        </div>

        {onSelect && (
          <Button 
            size="sm"
            onClick={onSelect}
            data-testid="button-select-farmer"
          >
            Select
          </Button>
        )}
      </div>
    </Card>
  );
}
