
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SevenStars from "@/components/seven-stars/page";
import SevenData from "@/components/seven-data/page";
import Zodiac from "@/components/zodiac/page";
import TibetanCycle from "@/components/tibetan-cycle/page";
import WidgetCarousel from "@/components/widgets/WidgetCarousel";
import EarthNav from "@/components/EarthNav/EarthNav";
import FooterBar from "@/components/FooterBar";

export default function EarthPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const getInitialPage = useCallback(() => {
    if (tabParam === "seven-stars") return 1;
    if (tabParam === "tibetan-cycle") return 2;
    return 0;
  }, [tabParam]);

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [showSevenData, setShowSevenData] = useState(false);

  useEffect(() => {
    setCurrentPage(getInitialPage());
  }, [getInitialPage]);

  const handleToggleSeven = () => {
    setShowSevenData((prev) => !prev);
  };

  const handleChangePage = (index: number) => {
    setCurrentPage(index);
    if (index === 0) router.push("/earth?tab=zodiac");
    if (index === 1) router.push("/earth?tab=seven-stars");
    if (index === 2) router.push("/earth?tab=tibetan-cycle");
  };

  const items = [
    <Zodiac key="zodiac" />,
    showSevenData ? <SevenData key="seven-data" /> : <SevenStars key="seven-stars" />,
    <TibetanCycle key="tibetan-cycle" />,
  ];

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <div className="fixed inset-0 bg-black"></div>
      <div className="relative z-10 flex flex-col h-screen">
        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4 text-sm">
            <EarthNav
              currentPage={
                tabParam === "seven-stars"
                  ? "七星轨迹"
                  : tabParam === "tibetan-cycle"
                    ? "藏历绕迥纪年"
                    : "十二宫图"
              }
            />
          </div>
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
            <WidgetCarousel
              items={items}
              currentIndex={currentPage}
              onChange={handleChangePage}
            />
          </div>
          {currentPage === 1 && (
            <button
              onClick={handleToggleSeven}
              className="fixed bottom-24 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-full shadow-lg transition duration-300 hover:scale-105"
            >
              {showSevenData ? "*v*" : "*_*"}
            </button>
          )}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <FooterBar />
      </div>
    </div>
  );
}
