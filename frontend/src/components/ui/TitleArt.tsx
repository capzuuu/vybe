import type { Title } from '../../types';
import vybeLogo from '../../assets/vybe-logo.png';
import './ui.css';

interface TitleArtProps {
  title: Pick<Title, 'name' | 'font'>;
  size?: 'card' | 'preview' | 'hero' | 'modal' | 'poster';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span';
  id?: string;
}

/** Typographic "title treatment" rendered in the title's display face. */
export function TitleArt({ title, size = 'card', className = '', as: Tag = 'span', id }: TitleArtProps) {
  return (
    <Tag id={id} className={`title-art title-art--${title.font} title-art--${size} ${className}`}>
      {title.name}
    </Tag>
  );
}

/** Small brand mark (disabled by user request). */
export function BrandMark(_props?: { className?: string }) {
  return null;
}

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'responsive';
}

export function Logo({ className = '', size = 'responsive' }: LogoProps) {
  return (
    <div className={`vybe-brand-logo vybe-brand-logo--${size} ${className}`} aria-label="Vybe">
      <img
        src={vybeLogo}
        alt="Vybe"
        className="vybe-brand-logo__img"
        width={1024}
        height={341}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

