import kulkarniVillaImg from '@/src/assets/images/project_kulkarni_villa_1795609715379.jpg';
import sharmaDuplexImg from '@/src/assets/images/project_sharma_duplex_1795609715886.jpg';
import deshmukhResidenceImg from '@/src/assets/images/project_deshmukh_residence_1795609714936.jpg';
import loginStudioImg from '@/src/assets/images/login_architectural_studio_1795609720220.jpg';

export const LOGIN_STUDIO_IMAGE = {
  src: loginStudioImg,
  alt: 'Architectural drafting table with residential floorplan drawings, limestone and terracotta material samples, and brass scale ruler',
};

export interface ProjectVisualMeta {
  src: string;
  alt: string;
  caption: string;
}

export const PROJECT_COVER_IMAGES: Record<string, ProjectVisualMeta> = {
  'proj-1': {
    src: kulkarniVillaImg,
    alt: 'Kulkarni G+2 Residence under final travertine cladding and teak window finishing in Bengaluru',
    caption: 'South elevation — travertine cladding & cantilevered slab finishing',
  },
  'proj-2': {
    src: sharmaDuplexImg,
    alt: 'Deshmukh Duplex Villa structural terracotta masonry and concrete roof slab curing in Pune',
    caption: 'First floor masonry — red brick walls & RCC roof slab curing',
  },
  'proj-3': {
    src: deshmukhResidenceImg,
    alt: 'Nair Independent House architectural elevation reference with warm lime plaster and courtyard steps',
    caption: 'Approved elevation study — lime plaster facade & Kota courtyard',
  },
};

export const SITE_GALLERY_FALLBACKS: ProjectVisualMeta[] = [
  PROJECT_COVER_IMAGES['proj-1'],
  PROJECT_COVER_IMAGES['proj-2'],
  PROJECT_COVER_IMAGES['proj-3'],
];

export function getProjectCoverImage(projectId: string, indexHint = 0): ProjectVisualMeta {
  if (PROJECT_COVER_IMAGES[projectId]) {
    return PROJECT_COVER_IMAGES[projectId];
  }
  return SITE_GALLERY_FALLBACKS[Math.abs(indexHint) % SITE_GALLERY_FALLBACKS.length];
}
