import hero640 from '../assets/images/hero_civic_action_1791258761832-640.jpg';
import hero960 from '../assets/images/hero_civic_action_1791258761832-960.jpg';
import heroFull from '../assets/images/hero_civic_action_1791258761832-optimized.jpg';
import family640 from '../assets/images/project_family_home_1791258824343-640.jpg';
import family960 from '../assets/images/project_family_home_1791258824343-960.jpg';
import familyFull from '../assets/images/project_family_home_1791258824343-optimized.jpg';
import road640 from '../assets/images/project_road_repair_1791258776909-640.jpg';
import road960 from '../assets/images/project_road_repair_1791258776909-960.jpg';
import roadFull from '../assets/images/project_road_repair_1791258776909-optimized.jpg';
import skills640 from '../assets/images/project_skills_centre_1791258811127-640.jpg';
import skills960 from '../assets/images/project_skills_centre_1791258811127-960.jpg';
import skillsFull from '../assets/images/project_skills_centre_1791258811127-optimized.jpg';
import water640 from '../assets/images/project_water_well_1791258793590-640.jpg';
import water960 from '../assets/images/project_water_well_1791258793590-960.jpg';
import waterFull from '../assets/images/project_water_well_1791258793590-optimized.jpg';
import team640 from '../assets/images/team_portrait-640.jpg';
import team960 from '../assets/images/team_portrait-960.jpg';
import teamFull from '../assets/images/team_portrait-optimized.jpg';

// Vite-managed imports give the files fingerprinted production URLs and let
// deployed browsers cache them for a long time.
export const ASSETS = {
  heroCivicAction: heroFull,
  projectRoadRepair: roadFull,
  projectWaterWell: waterFull,
  projectSkillsCentre: skillsFull,
  projectFamilyHome: familyFull,
  teamPortrait: teamFull,
};

const responsiveSources: Record<string, string> = {
  [heroFull]: `${hero640} 640w, ${hero960} 960w, ${heroFull} 1376w`,
  [familyFull]: `${family640} 640w, ${family960} 960w, ${familyFull} 1200w`,
  [roadFull]: `${road640} 640w, ${road960} 960w, ${roadFull} 1200w`,
  [skillsFull]: `${skills640} 640w, ${skills960} 960w, ${skillsFull} 1200w`,
  [waterFull]: `${water640} 640w, ${water960} 960w, ${waterFull} 1200w`,
  [teamFull]: `${team640} 640w, ${team960} 960w, ${teamFull} 1254w`,
};

export const responsiveImageProps = (src: string, sizes: string) => ({
  src,
  ...(responsiveSources[src] ? { srcSet: responsiveSources[src], sizes } : {}),
});
