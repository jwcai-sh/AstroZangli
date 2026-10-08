
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SevenStars from "@/components/seven-stars/page";
import SevenData from "@/components/seven-data/page";
import FiveElementsSubtab from "@/components/seven-stars/FiveElementsSubtab";
import FivePlanetsSubtab from "@/components/seven-stars/FivePlanetsSubtab";
import FivePlanetsSphere from "@/components/seven-stars/FivePlanetsSphere";
import FiveElementsSphere from "@/components/seven-stars/FiveElementsSphere";
import SevenStarsSubnav from "@/components/seven-stars/SevenStarsSubnav";
import Zodiac from "@/components/zodiac/page";
import AnnualMotion from "@/components/annual-motion/page";
import TibetanCycle from "@/components/tibetan-cycle/page";
import WidgetCarousel from "@/components/widgets/WidgetCarousel";
import EarthNav from "@/components/EarthNav/EarthNav";
import BasicDataSubnav from "@/components/EarthNav/BasicDataSubnav";
import EarthStarfield from "@/components/earth/EarthStarfield";
import FooterBar from "@/components/FooterBar";
import {
  getEarthPageIndex,
  getEarthTabLabel,
  resolveBasicDataSubtab,
  resolveSevenStarsSubtab,
} from "@/features/earth/navigation";

export default function EarthPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const currentSubtab = resolveSevenStarsSubtab(searchParams.get("subtab"));
  const currentBasicDataSubtab = resolveBasicDataSubtab(
    searchParams.get("data") ?? (tabParam === "tibetan-cycle" ? "tibetan-cycle" : null)
  );

  const getInitialPage = useCallback(() => {
    return getEarthPageIndex(tabParam);
  }, [tabParam]);

  const [currentPage, setCurrentPage] = useState(getInitialPage);

  useEffect(() => {
    setCurrentPage(getInitialPage());
  }, [getInitialPage]);

  const handleChangePage = (index: number) => {
    setCurrentPage(index);
    if (index === 0) router.push("/earth?tab=zodiac");
    if (index === 1) router.push(`/earth?tab=five-elements&data=${currentBasicDataSubtab}`);
    if (index === 2) router.push(`/earth?tab=seven-stars&subtab=${currentSubtab}`);
    if (index === 3) router.push("/earth?tab=annual-motion");
  };

  const sevenStarsItem =
    currentSubtab === "seven-data"
      ? <SevenData key="seven-data" />
      : currentSubtab === "five-elements-sphere"
        ? <FiveElementsSphere key="five-elements-sphere" />
      : currentSubtab === "five-elements"
        ? <FiveElementsSubtab key="five-elements" />
        : <SevenStars key="seven-stars" />;

  const basicDataItem = currentBasicDataSubtab === "tibetan-cycle"
    ? <TibetanCycle key="tibetan-cycle" />
    : currentBasicDataSubtab === "five-planets"
      ? <FivePlanetsSubtab key="five-planets" />
      : currentBasicDataSubtab === "five-planets-sphere"
        ? <FivePlanetsSphere key="five-planets-sphere" />
      : currentBasicDataSubtab === "five-elements-sphere"
        ? <FiveElementsSphere key="basic-five-elements-sphere" />
      : <FiveElementsSubtab key="five-elements" />;

  const items = [
    <Zodiac key="zodiac" />,
    basicDataItem,
    sevenStarsItem,
    <AnnualMotion key="annual-motion" />,
  ];

  return (
    <div className="starfield-bg text-white min-h-screen flex flex-col">
      <EarthStarfield />
      <div className="relative z-10 flex flex-col h-screen">
        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4 text-sm">
            <EarthNav currentPage={getEarthTabLabel(tabParam)} />
          </div>
          {currentPage === 1 && <BasicDataSubnav currentSubtab={currentBasicDataSubtab} />}
          {currentPage === 2 && <SevenStarsSubnav currentSubtab={currentSubtab} />}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
            <WidgetCarousel
              items={items}
              currentIndex={currentPage}
              onChange={handleChangePage}
            />
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <FooterBar />
      </div>
    </div>
  );
}
