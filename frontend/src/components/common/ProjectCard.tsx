import React from 'react';
import { ArrowUpRight, LucideIcon } from 'lucide-react';
import { responsiveImageProps } from '../../constants/assets';

export interface ProjectData {
  id: string;
  title: string;
  category: 'Civic Action' | 'Children & Education' | 'Food & Livelihood' | 'Water & Health' | 'Relief';
  tagline: string;
  description: string;
  keyPillars: string[];
  imageUrl?: string;
  featured?: boolean;
}

interface ProjectCardProps {
  project: ProjectData;
  onSelect?: (project: ProjectData) => void;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  className = '',
}) => {
  return (
    <article
      className={`civic-card group rounded-lg border border-stone-200 bg-white hover:border-orange-400 transition-all duration-200 flex flex-col overflow-hidden ${className}`}
    >
      {/* Image container with fallback */}
      <div className="image-frame project-image-motion relative aspect-16/10 bg-stone-100 overflow-hidden">
        {project.imageUrl ? (
          <img
            {...responsiveImageProps(project.imageUrl, '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw')}
            alt={project.title}
            className="project-image-motion__media w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="project-image-placeholder" aria-label={`${project.title} — project photo not published`}>
            <span>FIXIT INITIATIVE</span>
            <strong>{project.title}</strong>
            <small>Project photo not published</small>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-stone-900/90 text-white text-xs font-medium px-2.5 py-1 rounded border border-stone-800">
          {project.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
            <span>FixIt Initiative</span>
            <span aria-hidden="true">·</span>
            <span>Community Program</span>
          </div>

          <h3 className="text-xl font-bold text-stone-900 group-hover:text-orange-600 transition-colors leading-snug">
            {project.title}
          </h3>

          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            {project.description}
          </p>

          {/* Key pillars */}
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400 mb-2">
              Focus Areas
            </div>
            <ul className="space-y-1.5 text-xs text-stone-700">
              {project.keyPillars.map((pillar, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <span>{pillar}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {onSelect && (
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
            <button
              onClick={() => onSelect(project)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors group/btn"
            >
              <span>Explore Initiative Details</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
