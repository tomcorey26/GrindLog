import { LandingNav } from "@/components/landing/nav";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection } from "@/components/landing/features";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { SocialProofSection } from "@/components/landing/social-proof";
import { FinalCTASection } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SocialProofSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </>
  );
}
