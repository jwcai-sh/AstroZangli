
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AnnualMotionSpherePage from "@/components/sky-view/AnnualMotionSpherePage";
import SevenData from "@/components/seven-data/page";
import FiveElementsSubtab from "@/components/seven-stars/FiveElementsSubtab";
import FivePlanetsSubtab from "@/components/seven-stars/FivePlanetsSubtab";
import FivePlanetsSphere from "@/components/seven-stars/FivePlanetsSphere";
import FiveElementsSphere from "@/components/seven-stars/FiveElementsSphere";
import SevenStarsSubnav from "@/components/seven-stars/SevenStarsSubnav";
import SunEarthMoonSpherePage from "@/components/seven-stars/SunEarthMoonSpherePage";
import SevenStarsSpherePage from "@/components/seven-stars/SevenStarsSpherePage";
import GeocentricMotionPage from "@/components/seven-stars/GeocentricMotionPage";
import Zodiac from "@/components/zodiac/ZodiacSpherePage";
import EclipsePage from "@/components/eclipses/EclipsePage";
import MoonPhasesPage from "@/components/moon-phases/MoonPhasesPage";
import TibetanCycle from "@/components/tibetan-cycle/page";
import WidgetCarousel from "@/components/widgets/WidgetCarousel";
import EarthNav from "@/components/EarthNav/EarthNav";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizePath } from "@/i18n/locale";
import BasicDataSubnav from "@/components/EarthNav/BasicDataSubnav";
import EarthViewSubnav from "@/components/EarthNav/EarthViewSubnav";
import EarthStarfield from "@/components/earth/EarthStarfield";
import FooterBar from "@/components/FooterBar";
import {
  getEarthPageIndex,
  getEarthTabLabel,
  resolveCelestialMotionView,
  resolveLunarPhenomenaView,
  resolveBasicDataSubtab,
  resolveSevenStarsSubtab,
} from "@/features/earth/navigation";

export default function EarthPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const tabParam = searchParams.get("tab");
  const legacySubtab = searchParams.get("subtab");
  const currentSubtab = resolveSevenStarsSubtab(legacySubtab);
  const currentPhenomenaView = resolveLunarPhenomenaView(tabParam, searchParams.get("phenomena"), legacySubtab);
  const currentMotionView = resolveCelestialMotionView(tabParam, searchParams.get("motion"), legacySubtab);
  const currentBasicDataSubtab = resolveBasicDataSubtab(
    searchParams.get("data") ?? (tabParam === "tibetan-cycle" ? "tibetan-cycle" : null)
  );

  const getInitialPage = useCallback(() => {
    return getEarthPageIndex(tabParam, legacySubtab);
  }, [tabParam, legacySubtab]);

  const [currentPage, setCurrentPage] = useState(getInitialPage);

  useEffect(() => {
    setCurrentPage(getInitialPage());
  }, [getInitialPage]);

  const handleChangePage = (index: number) => {
    setCurrentPage(index);
    if (index === 0) router.push(localizePath(locale, "/earth?tab=zodiac"));
    if (index === 1) router.push(localizePath(locale, `/earth?tab=five-elements&data=${currentBasicDataSubtab}`));
    if (index === 2) router.push(localizePath(locale, `/earth?tab=seven-stars&subtab=${currentSubtab}`));
    if (index === 3) router.push(localizePath(locale, `/earth?tab=celestial-motion&motion=${currentMotionView}`));
    if (index === 4) router.push(localizePath(locale, `/earth?tab=lunar-phenomena&phenomena=${currentPhenomenaView}`));
  };

  const sevenStarsItem =
    currentSubtab === "seven-data"
      ? <SevenData key="seven-data" />
      : currentSubtab === "sun-earth-moon"
        ? <SunEarthMoonSpherePage key="sun-earth-moon" />
      : currentSubtab === "geocentric-motion"
        ? <GeocentricMotionPage key="geocentric-motion" />
      : currentSubtab === "five-elements-sphere"
        ? <FiveElementsSphere key="five-elements-sphere" />
      : currentSubtab === "five-elements"
        ? <FiveElementsSubtab key="five-elements" />
        : <SevenStarsSpherePage key="seven-stars" />;

  const basicDataItem = currentBasicDataSubtab === "tibetan-cycle"
    ? <TibetanCycle key="tibetan-cycle" />
    : currentBasicDataSubtab === "five-planets"
      ? <FivePlanetsSubtab key="five-planets" />
      : currentBasicDataSubtab === "five-planets-sphere"
        ? <FivePlanetsSphere key="five-planets-sphere" />
      : currentBasicDataSubtab === "five-elements-sphere"
        ? <FiveElementsSphere key="basic-five-elements-sphere" />
      : <FiveElementsSubtab key="five-elements" />;

  const celestialMotionItem = currentMotionView === "annual-motion"
    ? <AnnualMotionSpherePage key="annual-motion" />
    : <GeocentricMotionPage key="geocentric-motion" />;

  const lunarPhenomenaItem = currentPhenomenaView === "eclipses"
    ? <EclipsePage key="eclipses" />
    : currentPhenomenaView === "sun-earth-moon"
      ? <SunEarthMoonSpherePage key="sun-earth-moon" />
      : <MoonPhasesPage key="moon-phases" />;

  const items = [
    <Zodiac key="zodiac" />,
    basicDataItem,
    sevenStarsItem,
    celestialMotionItem,
    lunarPhenomenaItem,
  ];

  const isSkyView = currentPage === 3 || (currentPage === 2 && currentSubtab === "seven-stars") || (currentPage === 1 && currentBasicDataSubtab === "five-elements-sphere");

  return (
    <div className="starfield-bg text-white min-h-screen flex flex-col">
      <EarthStarfield />
      <div className={`relative z-10 flex flex-col ${isSkyView ? "min-h-screen" : "h-screen"}`}>
        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4 text-sm">
            <EarthNav currentPage={getEarthTabLabel(tabParam, legacySubtab)} />
          </div>
          {currentPage === 1 && <BasicDataSubnav currentSubtab={currentBasicDataSubtab} />}
          {currentPage === 2 && <SevenStarsSubnav currentSubtab={currentSubtab} />}
          {currentPage === 3 && <EarthViewSubnav currentView={currentMotionView} views={[
            { id: "geocentric-motion", label: "七曜每日运动（地心视角）", href: "/earth?tab=celestial-motion&motion=geocentric-motion" },
            { id: "annual-motion", label: "周年视运动（地心坐标）", href: "/earth?tab=celestial-motion&motion=annual-motion" },
          ]} />}
          {currentPage === 4 && <EarthViewSubnav currentView={currentPhenomenaView} views={[
            { id: "moon-phases", label: "月相", href: "/earth?tab=lunar-phenomena&phenomena=moon-phases" },
            { id: "sun-earth-moon", label: "日地月运动与月相（日心视角）", href: "/earth?tab=lunar-phenomena&phenomena=sun-earth-moon" },
            { id: "eclipses", label: "日月食查询", href: "/earth?tab=lunar-phenomena&phenomena=eclipses" },
          ]} />}
          <div className={`flex-1 flex items-center justify-center py-2 pr-2 sm:p-4 ${currentPage === 1 && currentBasicDataSubtab !== "tibetan-cycle" ? "pl-8" : "pl-2"}`}>
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
