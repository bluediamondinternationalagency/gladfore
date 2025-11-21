import { useState } from "react";
import { useLocation } from "wouter";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import WhyChoose from "@/components/WhyChoose";
import TrustIndicators from "@/components/TrustIndicators";
import CTAFooter from "@/components/CTAFooter";
import WaitlistModal from "@/components/waitlist/WaitlistModal";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistUserType, setWaitlistUserType] = useState<"farmer" | "agent">("farmer");

  const handleGetStarted = () => {
    console.log('Get started clicked');
    setWaitlistUserType("farmer");
    setWaitlistOpen(true);
  };

  const handleSignUpFarmer = () => {
    console.log('Sign up as farmer clicked');
    setWaitlistUserType("farmer");
    setWaitlistOpen(true);
  };

  const handleSignUpAgent = () => {
    console.log('Sign up as agent clicked');
    setWaitlistUserType("agent");
    setWaitlistOpen(true);
  };

  return (
    <div className="min-h-screen">
      <HeroSection onGetStarted={handleGetStarted} />
      <HowItWorks />
      <WhyChoose />
      <TrustIndicators />
      <CTAFooter onSignUpFarmer={handleSignUpFarmer} onSignUpAgent={handleSignUpAgent} />
      
      {/* Waitlist Modal */}
      <WaitlistModal 
        open={waitlistOpen} 
        onOpenChange={setWaitlistOpen}
        defaultUserType={waitlistUserType}
      />
    </div>
  );
}
