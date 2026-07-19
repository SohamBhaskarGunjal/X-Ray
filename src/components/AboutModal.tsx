import { X, Linkedin, Github, Instagram, Globe, Briefcase, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import SohamAvatar from './SohamAvatar';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Soham Bhaskar Gunjal",
  role: "Creative Developer & Interaction Designer",
  bio: "Passionate about pushing the boundaries of real-time web graphics, AI-assisted computer vision, and interactive spatial interfaces.",
  linkedin: "https://www.linkedin.com/in/soham-gunjal-a49b75324/",
  github: "https://github.com/SohamBhaskarGunjal",
  instagram: "https://www.instagram.com/_soham_0008_?igsh=MW94cGg0ZHFrb2cxbQ==",
  twitter: "",
  portfolio: "https://sohamgunjal.dev"
};

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  const profile = DEFAULT_PROFILE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity">
      <div 
        className="relative w-full max-w-lg bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xl p-6 md:p-8 animate-cyber-pulse"
        id="about-modal-card"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-xl uppercase tracking-wider">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Developer Profile</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-muted text-foreground/80 hover:text-primary hover:bg-muted/80 transition-all cursor-pointer"
            id="close-about-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-border/50">
            <SohamAvatar className="w-20 h-20" />
            <div>
              <h3 className="font-display font-bold text-2xl text-foreground tracking-tight">{profile.name}</h3>
              <p className="text-primary font-mono text-xs uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {profile.role}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-widest">Biography</h4>
              <p className="text-foreground/95 text-sm leading-relaxed font-sans">{profile.bio}</p>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-widest">Connect & Links</h4>
              <div className="grid grid-cols-2 gap-3">
                {profile.linkedin && (
                  <a 
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/55 hover:bg-primary/10 hover:text-primary text-sm text-foreground/90 font-mono transition-colors border border-border/30"
                  >
                    <Linkedin className="w-4 h-4 text-[#0077B5]" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile.github && (
                  <a 
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/55 hover:bg-primary/10 hover:text-primary text-sm text-foreground/90 font-mono transition-colors border border-border/30"
                  >
                    <Github className="w-4 h-4 text-white" />
                    <span>GitHub</span>
                  </a>
                )}
                {profile.instagram && (
                  <a 
                    href={profile.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/55 hover:bg-primary/10 hover:text-primary text-sm text-foreground/90 font-mono transition-colors border border-border/30"
                  >
                    <Instagram className="w-4 h-4 text-[#E1306C]" />
                    <span>Instagram</span>
                  </a>
                )}
                {profile.portfolio && (
                  <a 
                    href={profile.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/55 hover:bg-primary/10 hover:text-primary text-sm text-foreground/90 col-span-2 font-mono transition-colors border border-border/30 justify-center"
                  >
                    <Globe className="w-4 h-4 text-primary" />
                    <span>Portfolio Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
