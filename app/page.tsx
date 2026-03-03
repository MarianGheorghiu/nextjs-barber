import MainContainer from "@/components/MainContainer";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Rules from "@/components/Rules"; // <--- Importă regulile aici
import Reviews from "@/components/Reviews";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <MainContainer>
      <Navbar />
      <div className="flex flex-col w-full">
        <Hero />
        <Services />
        <Rules />
        <Reviews />
        <Contact />
      </div>
    </MainContainer>
  );
}
